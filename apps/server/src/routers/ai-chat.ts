import { TRPCError } from '@trpc/server';
import * as z from 'zod';
import { chatFormResponseSchema, type ChatActionResult } from '@repo/schemas/chatWidget';
import { logActivity } from '../lib/activity-log.js';
import { applyRowCap, capRowsByBytes } from '../lib/ai-db-tools.js';
import { prisma } from '../lib/prisma.js';
import { type Prisma } from '../prisma/generated/client';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

// SPEC §6: SQL execution runs inside ONE ctx.db transaction with a 30s timeout.
const EXECUTION_TIMEOUT_MS = 30_000;
// Row guard (SPEC §6): snapshot keeps up to 200 rows; the AI pipeline (Task 4)
// caps what reaches the model at 20. Per-value truncation ~200 chars.
const RESULT_ROWS_STORED = 200;
const RESULT_VALUE_MAX_CHARS = 200;

// ponytail: input schemas live here — packages/schemas/src/chatWidget.ts is Task 1's
// file (frozen ownership); these are mutation-input shapes, not domain schemas.
export const confirmActionInputSchema = z.object({
  confirmationId: z.string().ulid(),
  backupAck: z.boolean(),
});
export const confirmationIdInputSchema = z.object({
  confirmationId: z.string().ulid(),
});

// Raw-rows → JSON-safe rows (BigInt/Decimal/Date are not Json-serializable),
// with per-value truncation to bound the snapshot size (SPEC §6).
const truncateValue = (value: unknown): unknown => {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > RESULT_VALUE_MAX_CHARS) {
    return value.slice(0, RESULT_VALUE_MAX_CHARS);
  }
  // Prisma Decimal (raw SELECTs return Decimal for numeric columns)
  if (value && typeof value === 'object' && typeof (value as { toNumber?: unknown }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return value;
};

const sanitizeRow = (row: unknown): Record<string, unknown> => {
  if (!row || typeof row !== 'object') return { value: truncateValue(row) };
  return Object.fromEntries(
    Object.entries(row as Record<string, unknown>).map(([key, value]) => [key, truncateValue(value)]),
  );
};

export const aiChatRouter = router({
  /**
   * SPEC §5.3 — user submits an inline form card.
   * Chat messages persist client-side (useChat + localStorage); there is no
   * server-side chat-message model, so the widget's pending → submitted status
   * transition is owned by the client. The server validates the payload shape
   * and audits it. The server-enforced safety core is the SQL gate below.
   */
  submitFormResponse: protectedProcedure
    .input(chatFormResponseSchema)
    .mutation(async ({ input, ctx }) => {
      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'ai_chat_widget',
        resourceId: input.widgetId,
        message: 'AI chat form response submitted',
        detail: { values: input.values },
      });

      // Structured `form_response` payload the client appends as a user message,
      // then triggers the next AI turn via the existing generation entry.
      return { widgetId: input.widgetId, values: input.values };
    }),

  /**
   * SPEC §5.3 — user confirms the SQL shown on a confirm-action card.
   * Writes demand backupAck: true (SPEC §3 refine: requiresBackupAck ⇔ !readOnly).
   *
   * Caller-scoped: `createdBy` is server-assigned from the authenticated user
   * when the card is created, so scoping the lookup to it stops one admin from
   * confirming (or rejecting, or executing) another admin's pending card.
   */
  confirmAction: protectedProcedure
    .use(hasPermission('ai-admin@access'))
    .input(confirmActionInputSchema)
    .mutation(async ({ input, ctx }) => {
      const gate = await prisma.aiActionConfirmation.findUnique({
        where: { id: input.confirmationId, createdBy: ctx.user.userId },
      });
      if (!gate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Confirmation not found.' });
      }
      if (gate.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Confirmation already resolved (status: ${gate.status}).` });
      }
      if (!gate.readOnly && input.backupAck !== true) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Write SQL requires backupAck: true — verify the backup first.' });
      }

      const confirmed = await prisma.aiActionConfirmation.update({
        where: { id: gate.id },
        data: { status: 'confirmed', backupAck: input.backupAck },
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'ai_action_confirmation',
        resourceId: gate.id,
        message: 'Confirmed AI SQL action',
        detail: {
          widgetId: gate.widgetId,
          chatId: gate.chatId,
          sql: gate.sqlText,
          readOnly: gate.readOnly,
          backupAck: input.backupAck,
        },
      });

      return confirmed;
    }),

  /**
   * SPEC §5.3 — user rejects the card. Terminal: pending → rejected (no execute).
   */
  rejectAction: protectedProcedure
    .use(hasPermission('ai-admin@access'))
    .input(confirmationIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const gate = await prisma.aiActionConfirmation.findUnique({
        where: { id: input.confirmationId, createdBy: ctx.user.userId },
      });
      if (!gate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Confirmation not found.' });
      }
      if (gate.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Confirmation already resolved (status: ${gate.status}).` });
      }

      const rejected = await prisma.aiActionConfirmation.update({
        where: { id: gate.id },
        data: { status: 'rejected' },
      });

      await logActivity(prisma, {
        action: 'REJECT',
        userId: ctx.user.userId,
        resource: 'ai_action_confirmation',
        resourceId: gate.id,
        message: 'Rejected AI SQL action',
        detail: {
          widgetId: gate.widgetId,
          chatId: gate.chatId,
          sql: gate.sqlText,
          readOnly: gate.readOnly,
        },
      });

      return rejected;
    }),

  /**
   * SPEC §6 — the execution gate. The server executes EXACTLY `sqlText` from
   * the confirmed row — never client-supplied SQL, never a fresh model call.
   * One-time-use: only status 'confirmed' is executable; any other status (or a
   * concurrent replay that lost the confirmed → executed claim) is refused with
   * a typed BAD_REQUEST. All raw SQL runs inside ONE ctx.db transaction so a
   * failure rolls back atomically; the failed status is then written fresh.
   *
   * Caller-scoped on `createdBy`, like confirmAction / rejectAction — the highest
   * value of the three, since it is the one that actually runs the statement.
   * A read is additionally wrapped by `applyRowCap` + `capRowsByBytes`; a write
   * runs verbatim or not at all.
   */
  executeConfirmedAction: protectedProcedure
    .use(hasPermission('ai-admin@access'))
    .input(confirmationIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const startedAt = Date.now();

      let executed: { actionResult: ChatActionResult; sqlText: string; widgetId: string; chatId: string; readOnly: boolean };
      try {
        executed = await ctx.db.$transaction(
          async (tx) => {
            const gate = await tx.aiActionConfirmation.findUnique({
              where: { id: input.confirmationId, createdBy: ctx.user.userId },
            });
            if (!gate) {
              throw new TRPCError({ code: 'NOT_FOUND', message: 'Confirmation not found.' });
            }
            if (gate.status !== 'confirmed') {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Confirmation is not executable (status: ${gate.status}) — one-time-use.`,
              });
            }

            const sqlStart = Date.now();
            let actionResult: ChatActionResult;
            if (gate.readOnly) {
              // readOnly → capture rows, under the SAME hard caps /api/ai/query
              // uses. The model chose this statement, so the server — not the
              // model — decides how much comes back: applyRowCap wraps it so a
              // whole-schema SELECT cannot stream, and capRowsByBytes bounds the
              // persisted snapshot. Writes are never wrapped (a subquery around
              // an UPDATE is a different statement).
              const sql = applyRowCap(gate.sqlText, RESULT_ROWS_STORED);
              const raw = await tx.$queryRawUnsafe<unknown[]>(sql);
              const allRows = Array.isArray(raw) ? raw : [];
              const { rows, truncated: sizeTruncated } = capRowsByBytes(allRows.map(sanitizeRow));
              actionResult = {
                confirmationId: gate.id,
                status: 'executed',
                sql,
                rowCount: allRows.length,
                rows,
                // `>= limit` mirrors formatQueryResult: the cap is satisfied, so
                // there may be more rows than the snapshot shows.
                truncated: sizeTruncated || allRows.length >= RESULT_ROWS_STORED,
                durationMs: Date.now() - sqlStart,
              };
            } else {
              // write → capture affected row count.
              const rowCount = await tx.$executeRawUnsafe(gate.sqlText);
              actionResult = {
                confirmationId: gate.id,
                status: 'executed',
                sql: gate.sqlText,
                rowCount,
                truncated: false,
                durationMs: Date.now() - sqlStart,
              };
            }

            // One-time-use claim: confirmed → executed only if still 'confirmed'.
            // A concurrent replay loses this update (0 rows) and its whole
            // transaction aborts — the SQL it already ran rolls back with it.
            const claim = await tx.aiActionConfirmation.updateMany({
              where: { id: gate.id, status: 'confirmed' },
              data: { status: 'executed', result: actionResult as unknown as Prisma.InputJsonValue },
            });
            if (claim.count === 0) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Confirmation already executed — one-time-use.',
              });
            }

            return {
              actionResult,
              sqlText: actionResult.sql,
              widgetId: gate.widgetId,
              chatId: gate.chatId,
              readOnly: gate.readOnly,
            };
          },
          { timeout: EXECUTION_TIMEOUT_MS },
        );
      } catch (error) {
        // Typed refusals (missing / not confirmed / lost race) propagate — the
        // gate row must keep its state. Only real SQL/execution errors take the
        // rollback path below.
        if (error instanceof TRPCError) throw error;

        const message = error instanceof Error ? error.message : 'Unknown error';
        const durationMs = Date.now() - startedAt;
        const gate = await prisma.aiActionConfirmation.findUnique({
          where: { id: input.confirmationId, createdBy: ctx.user.userId },
        });
        if (!gate) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Confirmation not found.' });
        }

        // Fresh write after the aborted transaction (SPEC §6.4). Conditional on
        // 'confirmed' so it can never overwrite a concurrent 'executed' result.
        const failed: ChatActionResult = {
          confirmationId: gate.id,
          status: 'failed',
          sql: gate.sqlText,
          truncated: false,
          error: { message, rolledBack: true },
          durationMs,
        };
        await prisma.aiActionConfirmation.updateMany({
          where: { id: gate.id, status: 'confirmed' },
          data: { status: 'failed', result: failed as unknown as Prisma.InputJsonValue },
        });

        await logActivity(prisma, {
          action: 'UPDATE',
          userId: ctx.user.userId,
          resource: 'ai_action_confirmation',
          resourceId: gate.id,
          message: 'AI SQL execution failed (rolled back)',
          detail: {
            widgetId: gate.widgetId,
            chatId: gate.chatId,
            sql: gate.sqlText,
            error: message,
            rolledBack: true,
            durationMs,
          },
        });

        // The failed result is fed back to the user/AI as the action_result turn.
        return failed;
      }

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'ai_action_confirmation',
        resourceId: executed.actionResult.confirmationId,
        message: 'Executed confirmed AI SQL action',
        detail: {
          widgetId: executed.widgetId,
          chatId: executed.chatId,
          sql: executed.sqlText,
          rowCount: executed.actionResult.rowCount,
          readOnly: executed.readOnly,
          durationMs: executed.actionResult.durationMs,
        },
      });

      return executed.actionResult;
    }),
});

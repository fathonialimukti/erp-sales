import { randomBytes, randomUUID } from 'crypto';
import { stepCountIs, tool, type StopCondition } from 'ai';
import * as z from 'zod';
import {
    chatActionResultSchema,
    chatConfirmActionWidgetSchema,
    chatFormRequestWidgetSchema,
    chatFormResponseSchema,
    chatConfirmationSchema,
    type ChatActionResult,
    type ChatConfirmActionWidget,
    type ChatFormRequestWidget,
} from '@repo/schemas/chatWidget';
import { logActivity } from './activity-log.js';
import type { DbClient } from './prisma.js';

/**
 * Widget tools for the AI chat pipeline (SPEC §3, §5, §8).
 *
 * Both tools are SERVER-executed: the server builds the widget and assigns
 * `id` (ULID) / `status` / `confirmationId` — the model never picks ids.
 * The returned widget JSON becomes the tool output on the assistant message
 * (chat messages persist client-side), and the widget tool call ENDS the
 * generation turn (see createWidgetStopCondition).
 */

export const WIDGET_TOOL_NAMES = ['request_form_input', 'request_confirmation'] as const;

export const isWidgetToolName = (name: string): boolean =>
    (WIDGET_TOOL_NAMES as readonly string[]).includes(name);

// ponytail: same ULID encoding as lib/backup.ts, whose generator isn't exported
// (importing it would pull in backup module side effects); 14 lines < a new dep.
const ULID_ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const generateUlid = (): string => {
    let time = Date.now();
    let timePart = '';
    for (let i = 0; i < 10; i++) {
        timePart = ULID_ENCODING[time % 32]! + timePart;
        time = Math.floor(time / 32);
    }
    let random = BigInt(`0x${randomBytes(10).toString('hex')}`);
    let randomPart = '';
    for (let i = 0; i < 16; i++) {
        randomPart = ULID_ENCODING[Number(random % 32n)]! + randomPart;
        random /= 32n;
    }
    return timePart + randomPart;
};

// SPEC §6 row guard: up to 200 rows are stored, but only the FIRST 20 reach the
// model context (ai-chat.ts stores ≤200 per Task 3's snapshot comment).
const MODEL_ROW_CAP = 20;

// Model-suppliable input shapes (server assigns id/status/confirmationId —
// the model never picks ids). Exported for tests; reused as the tools'
// inputSchema so malformed payloads are rejected by the SDK and fed back to
// the model as retryable tool errors — nothing invalid is ever persisted.
export const formWidgetInputSchema = z.object({
    title: chatFormRequestWidgetSchema.shape.title,
    description: chatFormRequestWidgetSchema.shape.description,
    fields: chatFormRequestWidgetSchema.shape.fields,
});

export const confirmationInputSchema = z.object({
    title: chatConfirmActionWidgetSchema.shape.title,
    description: chatConfirmActionWidgetSchema.shape.description,
    sql: chatConfirmActionWidgetSchema.shape.action.shape.sql,
    readOnly: chatConfirmActionWidgetSchema.shape.action.shape.readOnly,
});

/**
 * `request_form_input` — model supplies { title, description?, fields[] }.
 * Server builds the form-request widget (id + status assigned) and returns it
 * as the tool output.
 */
export const createFormInputTool = () =>
    tool({
        description:
            'Render an interactive form card in the chat for the user to fill in. Use whenever structured ' +
            'information is missing (several related values, a choice from a list, a date, a number, a ' +
            'confirmation) instead of asking plain-text questions. Field labels must already be written in ' +
            "the user's language. select fields MUST include options. Calling this tool ends your turn.",
        inputSchema: formWidgetInputSchema,
        execute: async ({ title, description, fields }) => {
            const widget = chatFormRequestWidgetSchema.parse({
                type: 'form-request',
                id: generateUlid(), // server-assigned — the model never picks ids
                title,
                description,
                fields,
                status: 'pending',
            }) as ChatFormRequestWidget;
            return widget;
        },
    });

/**
 * `request_confirmation` — model supplies { title, description?, sql, readOnly }.
 * Server classifies the SQL itself (classifySqlReadOnly — the model's readOnly
 * flag is advisory and silently overridden, I-1), enforces the SPEC §3 refine
 * (requiresBackupAck = !readOnly), creates the AiActionConfirmation gate row
 * (status 'pending', exact SQL snapshot, chatId, createdBy) + its CREATE
 * activity-log entry, and embeds the server-assigned confirmationId in the
 * confirm-action widget. ADMIN pipeline only — the regular chatbox has no SQL
 * execution path.
 */
/**
 * Server-side read/write classification (I-1) — AUTHORITATIVE. The model's
 * `readOnly` tool flag is advisory: a write mislabeled as a read must not
 * bypass the backup-ack gate. Strip leading whitespace/comments, then read the
 * first keyword: SELECT/EXPLAIN → read; anything else (incl. bare WITH —
 * data-modifying CTEs make `WITH ...` untrustworthy) → write.
 */
export const classifySqlReadOnly = (sql: string): boolean =>
    /^(?:SELECT|EXPLAIN)\b/i.test(sql.replace(/^(?:\s+|--[^\n]*\n?|\/\*[\s\S]*?\*\/)+/, ''));

export interface ConfirmationToolContext {
    db: DbClient;
    userId: string;
    chatId: string;
    /**
     * Optional SQL shape guard (the admin pipeline passes its DDL/multi-statement
     * validator so the old direct-execution guardrails survive the gate move).
     * A rejected statement throws a tool error → the model retries; no gate row
     * is created for invalid SQL.
     */
    validateSql?: (sql: string) => { valid: boolean; reason?: string };
}

export const createConfirmationTool = ({
    db,
    userId,
    chatId,
    validateSql,
}: ConfirmationToolContext) =>
    tool({
        description:
            'Render a SQL confirmation card showing the exact statement for the user to approve. ALWAYS call ' +
            'this before ANY SQL execution (reads and writes alike) — never run SQL through any other path. ' +
            'Exactly ONE SQL statement per confirmation; for multiple steps emit separate cards in sequence. ' +
            'readOnly: true only for SELECT/EXPLAIN/WITH...SELECT; everything else is a write and demands the ' +
            'user to acknowledge the backup. Calling this tool ends your turn.',
        inputSchema: confirmationInputSchema,
        execute: async ({ title, description, sql }) => {
            if (validateSql) {
                const validation = validateSql(sql);
                if (!validation.valid) {
                    throw new Error(validation.reason ?? 'SQL statement rejected');
                }
            }
            // I-1: the server's classification is authoritative — the model's
            // readOnly flag is advisory and silently overridden here, so a write
            // labeled readOnly: true still gets the backup-ack gate.
            const readOnly = classifySqlReadOnly(sql);
            // SPEC §3 refine: requiresBackupAck = !readOnly (writes demand the ack).
            const requiresBackupAck = !readOnly;
            const widgetId = generateUlid(); // server-assigned — the model never picks ids
            // The gate row is the safety core: exact SQL snapshot, one-time-use, pending.
            const gate = await db.aiActionConfirmation.create({
                data: {
                    widgetId,
                    sqlText: sql,
                    readOnly,
                    backupAck: false,
                    status: 'pending',
                    chatId,
                    createdBy: userId,
                },
            });
            await logActivity(db, {
                action: 'CREATE',
                userId,
                resource: 'ai_action_confirmation',
                resourceId: gate.id,
                message: 'AI action confirmation created (pending)',
                detail: { widgetId, sqlText: sql, readOnly, chatId },
            });
            const widget = chatConfirmActionWidgetSchema.parse({
                type: 'confirm-action',
                id: widgetId,
                title,
                description,
                action: { kind: 'run-sql', sql, readOnly },
                requiresBackupAck,
                confirmationId: gate.id, // server-assigned from the gate row
                status: 'pending',
            }) as ChatConfirmActionWidget;
            return widget;
        },
    });

/**
 * stopWhen: a widget tool call ends the generation turn (SPEC §5.2 — the loop
 * pauses; no further generation until the user responds). Falls back to the
 * given base condition (default stepCountIs(5)) for runaway loops.
 */
export const createWidgetStopCondition = (
    base: StopCondition<any, any> = stepCountIs(5),
): StopCondition<any, any> =>
    ({ steps }) => {
        if (base({ steps })) return true;
        const lastStep = steps[steps.length - 1];
        return lastStep?.toolCalls.some((call) => isWidgetToolName(call.toolName)) ?? false;
    };

/**
 * Pause enforcement (server side, SPEC §5.2): the client's sendAutomaticallyWhen
 * (lastAssistantMessageIsCompleteWithToolCalls) fires a continuation POST once a
 * server-executed widget tool result is available. Such a POST must not generate
 * anything — the turn ended at the card and only the user's structured response
 * resumes it. Returns true when the posted thread's last assistant step ended
 * with a widget tool call (any terminal state) and no user turn followed.
 */
export const isWidgetContinuationTurn = (messages: unknown): boolean => {
    if (!Array.isArray(messages) || messages.length === 0) return false;
    const last = messages[messages.length - 1] as { role?: unknown; parts?: unknown } | undefined;
    if (!last || last.role !== 'assistant' || !Array.isArray(last.parts)) return false;
    const lastStepStartIndex = last.parts.reduce<number>(
        (index, part, i) => ((part as { type?: unknown })?.type === 'step-start' ? i : index),
        -1,
    );
    return last.parts.slice(lastStepStartIndex + 1).some((part) => {
        const p = part as { type?: unknown; state?: unknown };
        return (
            typeof p?.type === 'string' &&
            p.type.startsWith('tool-') &&
            isWidgetToolName(p.type.slice('tool-'.length)) &&
            (p.state === 'output-available' || p.state === 'output-error')
        );
    });
};

/**
 * Structured user-side turns (client appends them as message metadata before
 * calling the generation entry — Task 3 payload shapes):
 *   metadata.form_response  { widgetId, values }
 *   metadata.confirmation   { widgetId, confirmationId, decision }
 *   metadata.action_result  { confirmationId, status, sql, rowCount?, rows?, truncated, error?, durationMs }
 *
 * Each is rendered into the model context as a tagged JSON block (structured,
 * not free text). Malformed payloads are passed through untouched (plain text).
 * action_result rows are capped to the FIRST 20 with a truncated note.
 */
export function renderStructuredTurns<
    T extends { id?: string; role: string; parts?: unknown[]; metadata?: unknown },
>(messages: readonly T[]): Array<T | StructuredTurnMessage> {
    return messages.map((message) => {
        const meta = message.metadata as Record<string, unknown> | null | undefined;
        if (!meta || typeof meta !== 'object') return message;

        if (meta.form_response !== undefined) {
            const parsed = chatFormResponseSchema.safeParse(meta.form_response);
            if (!parsed.success) return message;
            return structuredTurnMessage(
                message,
                '[form_response]',
                JSON.stringify({ widgetId: parsed.data.widgetId, values: parsed.data.values }),
            );
        }

        if (meta.confirmation !== undefined) {
            const parsed = chatConfirmationSchema.safeParse(meta.confirmation);
            if (!parsed.success) return message;
            return structuredTurnMessage(
                message,
                '[confirmation]',
                JSON.stringify({
                    widgetId: parsed.data.widgetId,
                    confirmationId: parsed.data.confirmationId,
                    decision: parsed.data.decision,
                }),
            );
        }

        if (meta.action_result !== undefined) {
            const parsed = chatActionResultSchema.safeParse(meta.action_result);
            if (!parsed.success) return message;
            // Row-cap seam: the stored snapshot may carry up to 200 rows — only the
            // first 20 reach the model, with a truncated note when more existed.
            const rows = parsed.data.rows;
            const payload: ChatActionResult = {
                ...parsed.data,
                rows: rows === undefined ? undefined : rows.slice(0, MODEL_ROW_CAP),
                truncated: parsed.data.truncated || (rows !== undefined && rows.length > MODEL_ROW_CAP),
            };
            return structuredTurnMessage(message, '[action_result]', JSON.stringify(payload));
        }

        return message;
    });
}

export interface StructuredTurnMessage {
    id: string;
    role: 'user';
    parts: Array<{ type: 'text'; text: string }>;
}

const structuredTurnMessage = (
    original: { id?: string },
    tag: string,
    json: string,
): StructuredTurnMessage => ({
    id: original.id ?? randomUUID(),
    role: 'user',
    parts: [{ type: 'text', text: `${tag}\n${json}` }],
});

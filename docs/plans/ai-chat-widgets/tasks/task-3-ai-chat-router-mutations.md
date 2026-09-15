### Task 3: AI Chat Router Mutations (incl. SQL Execution Gate)

**Files:**
- Modify: the existing AI chat router file (locate it yourself — start from `apps/server/src/router.ts` and follow the AI/chat import). Add 4 mutations. Prefer extending the existing router file over creating a new one.
- Modify: `apps/server/src/router.ts` ONLY if you must create a new router file to register.
- Test: `apps/server/src/tests/aiChatWidgets.test.ts` (write only — never run; QE runs them)

**Interfaces:**
- Consumes (from Task 1 `## Produces`, verbatim): `chatFormResponseSchema`, `chatConfirmationSchema`, `chatActionResultSchema` and types `ChatWidget`, `ChatFormRequestWidget`, `ChatConfirmActionWidget`, `ChatActionResult` from `@repo/schemas`. From Task 2: Prisma model `AiActionConfirmation` (fields: `id, widgetId, sqlText, readOnly, backupAck, status, chatId, createdBy, result, createdAt, updatedAt`).
- Produces (report EXACT names after aligning with the existing router's namespace):
  - Mutations on the existing AI chat namespace (spec calls them `submitFormResponse`, `confirmAction`, `rejectAction`, `executeConfirmedAction` — if the existing namespace forces different casing/prefix, report the real fully-qualified names, e.g. `trpcClient.ai.submitFormResponse`).
  - Input Zod schemas + output TS types for each mutation.
  - Permission strings used (aligned with existing `ai@*` permissions found in the repo).
  - Message payload JSON shapes for user-side structured messages: `form_response { widgetId, values }`, `confirmation { widgetId, confirmationId, decision }`, `action_result` (= `ChatActionResult`).
  - **How the next AI turn is triggered** after a user-side structured message exists (name of the existing generate/send procedure the client calls) — Task 8 depends on this.

**Reads (in your own context):**
- `docs/plans/ai-chat-widgets/SPEC.md` §5, §6, §10, §11
- `apps/server/src/routers/region.ts` (reference router pattern)
- `apps/server/src/router.ts` + the existing AI chat router file(s) and the AI message model usage
- Activity-log helper file(s) used by existing routers
- `AGENTS.md`

**Frozen contract (behavior — SPEC is law):**
1. `submitFormResponse({ widgetId, values })` — validate via `chatFormResponseSchema`; find the assistant message carrying that form-request widget; refuse (typed `TRPCError` BAD_REQUEST) unless its status is `pending`; append a structured `form_response` user message; set widget `status: 'submitted'` (persist the JSON update); activity log entry; return the updated message(s).
2. `confirmAction({ confirmationId, backupAck })` — `protected` + `hasPermission('<ai permission>')`; load `AiActionConfirmation`; refuse unless `status === 'pending'`; if `readOnly === false && backupAck !== true` → BAD_REQUEST; set `status: 'confirmed'`, store `backupAck`; flip the widget JSON status to `'confirmed'`; activity log; return the confirmation row.
3. `rejectAction({ confirmationId })` — refuse unless `pending`; set `status: 'rejected'` (terminal); widget → `'rejected'`; activity log; return.
4. `executeConfirmedAction({ confirmationId })` — `protected` + `hasPermission('<ai execute permission>')`; inside ONE `ctx.db` transaction (30s timeout): load confirmation; refuse unless `status === 'confirmed'` (one-time-use — replay = BAD_REQUEST per SPEC §11); execute **exactly** `sqlText` from the row (never client-supplied SQL): `readOnly` → `$queryRawUnsafe`, else `$executeRawUnsafe`; build `ChatActionResult` (rowCount; for selects also `rows` capped at 200 stored / 20 to AI, `truncated` flag, values truncated ~200 chars; `durationMs`); success → `status: 'executed'`, save `result`; any error → transaction aborts (rollback), then in a fresh write set `status: 'failed'`, `result.error = { message, rolledBack: true }`; append `action_result` user-side message to the chat; activity log either way (SQL text + rowCount + durationMs, or error + rolledBack); return the `ChatActionResult`.

**Steps:**
- [ ] Step 1: Write the test file first (describe/it blocks, no runs): form submit lifecycle (pending→submitted, replay refused); confirm requires backupAck on writes; one-time-use (second executeConfirmedAction refused); exact-SQL invariant (executed SQL equals the confirmed snapshot); rollback → `failed` + `rolledBack: true` + no partial data; activity-log entries; permission refusal.
- [ ] Step 2: Implement the four mutations per the frozen contract, reusing existing router patterns (input schemas from `@repo/schemas`, `ctx.db` transactions, activity-log helpers, typed TRPCErrors).
- [ ] Step 3: Run `bun run check-types` (scoped to server). Fix until clean. Do NOT run tests.
- [ ] Step 4: Self-review against SPEC §5–§6 point by point.

**Report back (mandatory):** end with `## Produces` — exact namespace + mutation names, input/output types, permission strings, message payload shapes, and the existing procedure used to trigger an AI generation turn.

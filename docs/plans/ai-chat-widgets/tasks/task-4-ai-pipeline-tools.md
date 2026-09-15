### Task 4: AI Pipeline Tools + System Prompt + Result Feedback

**Files:**
- Modify: the existing AI chat generation pipeline module(s) (locate yourself: from the AI chat router's generate/turn entry, follow into the lib/service files that talk to the LLM). Touch ONLY pipeline files — the tRPC router belongs to Task 3.
- Test: `apps/server/src/tests/aiPipelineWidgets.test.ts` (write only — never run)

**Interfaces:**
- Consumes: Task 1 schemas `chatFormRequestWidgetSchema`, `chatConfirmActionWidgetSchema`, `chatActionResultSchema` + types from `@repo/schemas`. Task 2 model `AiActionConfirmation` (the pipeline creates rows with `status: 'pending'` when `request_confirmation` is called — Prisma client from `../lib/prisma.js`, inside `ctx.db` where applicable).
- Produces (report exactly):
  - Tool names as registered: `request_form_input`, `request_confirmation`
  - What the model supplies vs what the server assigns (server assigns widget `id` ULID + `confirmationId`; model supplies title/description/fields or sql/readOnly)
  - The system-prompt additions (verbatim text you added)
  - How each incoming structured turn type reaches the model context: `form_response` (values), `confirmation` (decision), `action_result` (result snapshot)
  - Pause behavior: a widget tool call ends the generation turn (no further generation)

**Reads (in your own context):**
- `docs/plans/ai-chat-widgets/SPEC.md` §5, §8, §11
- The existing AI pipeline files (found via the chat router's imports)
- `AGENTS.md`

**Frozen contract (behavior — SPEC is law):**
1. Register two tools in the pipeline, input-validated by the Task 1 schemas (server strips/assigns `id`, `status`, `confirmationId` — the model never picks ids):
   - `request_form_input`: model supplies `{ title, description?, fields[] }` → server builds a `form-request` widget (`status: 'pending'`), persists it as JSON on the assistant message, ends the turn.
   - `request_confirmation`: model supplies `{ title, description?, sql, readOnly }` → server enforces the SPEC §3 refine (`requiresBackupAck = !readOnly`; writes demand ack), creates the `AiActionConfirmation` row (`status: 'pending'`, `sqlText` snapshot, `chatId`, `createdBy` from ctx user), builds a `confirm-action` widget embedding `confirmationId`, persists on the assistant message, ends the turn.
2. System-prompt additions (SPEC §8 intent, your wording): use `request_form_input` whenever structured info is missing; **always** `request_confirmation` before ANY SQL; **exactly one SQL statement per confirmation**; after an `action_result` **always restate and analyze the outcome** (interpret row counts/rows, flag surprises, suggest verification SELECTs for writes — each further SQL again gets its own confirm card); never claim success without a result.
3. Turn context: when generating, structured user-side messages (`form_response`, `confirmation`, `action_result`) are rendered into the model context as structured blocks (not free text) per their Task 3 payload shapes.
4. Malformed tool payload from the model (SPEC §11): validation error → retry generation once → else fall back to plain text. Never persist an invalid widget.

**Steps:**
- [ ] Step 1: Write the test file first (no runs): tool registration; `request_confirmation` creates the gate row with the exact SQL snapshot and `requiresBackupAck` rule; widget persisted on the assistant message; turn ends on widget tool call; `form_response`/`confirmation`/`action_result` appear in model context; malformed payload → retry-then-plaintext.
- [ ] Step 2: Implement per the frozen contract inside the existing pipeline module(s). Minimal diff — do not restructure the pipeline.
- [ ] Step 3: Run `bun run check-types` (scoped to server). Fix until clean. Do NOT run tests.
- [ ] Step 4: Self-review against SPEC §5 + §8.

**Report back (mandatory):** end with `## Produces` — tool names, server-assigned fields, verbatim system-prompt additions, context-rendering shapes, pause semantics.

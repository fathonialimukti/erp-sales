# AI Chat Widgets — Generative UI Forms & SQL Confirmation Gate

**Date:** 2026-09-11
**Status:** Approved design (pending implementation plan)
**Scope:** All AI chatboxes (shared generative-UI mechanism) + AI Admin chat (SQL confirm/execute gate)

---

## 1. Summary

Add generative-UI widgets to the AI chat experience:

1. **Inline form cards** — the AI, mid-conversation, renders an interactive form inside a chat message (via a `request_form_input` tool call). The user fills it in and submits; values return to the AI as a structured turn; the AI continues.
2. **SQL confirmation cards** — before the AI executes any SQL (AI Admin context), it must render a `confirm-action` card showing the **exact SQL**. For write statements, the card requires a mandatory "I have verified the backup" checkbox. Only an explicit user confirm — recorded server-side — allows execution.

**Safety model (user decision):** the AI may propose **free-form SQL** (Approach A). The warranty is the existing backup/restore module. The server-enforced invariant is: *the server executes exactly the SQL the admin saw and confirmed — never re-generated, never client-supplied, one-time-use, inside a DB transaction.*

**Crucial requirements from the user:**
- All SQL execution runs inside a **DB transaction** (`ctx.db`); failures roll back atomically.
- Execution results are **fed back into the conversation** as structured data; the AI must **re-show and re-analyze** the outcome (row counts, sample rows, rollback errors).

## 2. Decisions (settled during brainstorming)

| Decision | Choice |
|---|---|
| Widget emission mechanism | Tool-call widget protocol (AI tool calls; validated by Zod) |
| SQL freedom | Free-form SQL proposed by the AI, gated by human confirmation |
| Form response flow | Structured turn (`form_response`), not text injection |
| Statements per confirmation | **Exactly one SQL statement per confirm card** (atomic by definition; multi-step = sequence of cards) |
| Field types at launch | text, textarea, number, select, date, checkbox |
| Applies to | All AI chatboxes; the SQL confirm/execute gate is used by the AI Admin chat |

## 3. Widget protocol (`packages/schemas`)

New file `packages/schemas/src/chatWidget.ts`, exported from `packages/schemas/src/index.ts`.

```ts
// Field
chatWidgetFieldSchema = z.object({
  key: z.string().min(1),            // identifier returned in values
  label: z.string().min(1),          // already-localized by the AI at generation time
  type: z.enum(['text', 'textarea', 'number', 'select', 'date', 'checkbox']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // select only
  placeholder: z.string().optional(),
})

// form-request widget (stored on assistant message)
chatFormRequestWidgetSchema = z.object({
  type: z.literal('form-request'),
  id: z.string().ulid(),             // widget id
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(chatWidgetFieldSchema).min(1),
  status: z.enum(['pending', 'submitted', 'cancelled']).default('pending'),
})

// confirm-action widget (stored on assistant message)
chatConfirmActionWidgetSchema = z.object({
  type: z.literal('confirm-action'),
  id: z.string().ulid(),
  title: z.string().min(1),
  description: z.string().optional(),
  action: z.object({
    kind: z.literal('run-sql'),
    sql: z.string().min(1),
    readOnly: z.boolean(),
  }),
  requiresBackupAck: z.boolean(),    // true for writes, false for reads
  confirmationId: z.string().ulid(), // links to the server-side gate record (§4)
  status: z.enum(['pending', 'confirmed', 'rejected', 'executed', 'failed']).default('pending'),
})

// user turn payloads
chatFormResponseSchema = z.object({
  widgetId: z.string(),
  values: z.record(z.union([z.string(), z.number(), z.boolean()])),
})
chatConfirmationSchema = z.object({
  widgetId: z.string(),
  confirmationId: z.string(),
  decision: z.enum(['confirm', 'reject']),
})
```

Validation rules (Zod `.refine`):
- `select` fields must carry `options` (min 1).
- `requiresBackupAck: false` requires `action.readOnly: true` (writes always demand backup ack).

## 4. Data model (Prisma)

**Chat message changes** (existing message model — exact model/table names to be aligned by the implementing agent against the current schema):
- Add optional `widget Json?` column on assistant messages (validated `chatWidgetSchema` union on write).
- User messages that carry a widget response get a structured payload: `form_response` / `confirmation` / `action_result` JSON (reuses existing message-content storage pattern).

**New model `AiActionConfirmation`** — the server-side gate record (this is the safety core):

```prisma
model AiActionConfirmation {
  id         String   @id // ULID per repo convention
  widgetId   String
  sqlText    String                 // exact SQL snapshot the user saw
  readOnly   Boolean
  backupAck  Boolean   @default(false)
  status     String    @default("pending") // pending | confirmed | executed | failed | rejected
  chatId     String                  // conversation it belongs to
  createdBy  String                  // user id (for activity log attribution)
  result     Json?                   // execution result snapshot (§6)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

State machine: `pending → confirmed → executed | failed`; `pending → rejected` (terminal, no execute). Transitions happen inside transactions; execution is refused for any status other than `confirmed` (one-time-use; replay attempts rejected with a typed error).

## 5. Chat flow

1. AI decides it needs structured input or wants to run SQL → calls tool `request_form_input` / `request_confirmation` (tool input validated by the widget schemas above).
2. Pipeline persists the widget JSON on the assistant message; for `confirm-action`, it **first** creates the `AiActionConfirmation` row (`status: pending`, SQL snapshot) and embeds `confirmationId` in the widget. The AI loop **pauses** (the tool call ends the turn; no further generation until the user responds).
3. User interacts with the card:
   - **Form submit** → `aiChat.submitFormResponse({ widgetId, values })` → appends a structured `form_response` user message, flips widget status to `submitted` → triggers the next AI turn with the structured values in context.
   - **Confirm** → client calls `aiChat.confirmAction({ confirmationId, backupAck })` → requires `backupAck: true` when the SQL is a write; sets gate status `confirmed`, records who/when. The client then calls `aiChat.executeConfirmedAction({ confirmationId })` → server executes exactly the snapshot SQL inside a transaction (§6), appends the `action_result` message, and triggers the AI re-analysis turn — the model is never asked to re-emit SQL.
   - **Reject** → `aiChat.rejectAction({ confirmationId })` → gate `rejected`, widget `rejected` → structured `decision: reject` fed to the AI so it can apologize / propose alternatives.
4. After execution (or failure), the server appends an `action_result` user-side message (§6) and triggers the AI's re-analysis turn.

History re-renders cards from persisted widget status: a `pending` form is still submittable after reload (state lives server-side); a `submitted`/`executed` card renders read-only.

## 6. Execution gate + transactions + result feedback

**Mutation: `aiChat.executeConfirmedAction({ confirmationId })`** — `protected`, permission-gated (permission string aligned with existing `ai@*` conventions by the implementing agent; proposed: `ai@execute`).

Server-side, inside **one `ctx.db` transaction** (`$transaction`, 30s timeout):

1. Load the confirmation row. Reject unless `status === 'confirmed'` (one-time-use).
2. Execute **exactly** `sqlText` from the row — never SQL from the client, never from a fresh model call:
   - `readOnly: true` → `$queryRawUnsafe(sqlText)`; capture rows.
   - write → `$executeRawUnsafe(sqlText)`; capture affected row count.
3. On success → gate `status: 'executed'`, `result` snapshot saved, activity log written (SQL text, row count, duration, user).
4. On error → transaction aborts (**rollback is automatic and atomic**) → gate `status: 'failed'`, error snapshot saved, activity log written.

**Result snapshot shape (stored + fed back):**

```ts
{
  confirmationId: string,
  status: 'executed' | 'failed',
  sql: string,                       // echo
  rowCount?: number,                 // affected (write) or returned (select)
  rows?: unknown[],                  // select only: first 20 rows, values truncated
  truncated: boolean,                // more rows existed than shown
  error?: { message: string, rolledBack: true },
  durationMs: number,
}
```

**Re-show & re-analyze (crucial):**
- The `action_result` message is appended to the chat and triggers the AI turn. The AI is **system-prompted to always re-analyze the outcome**: restate what ran, interpret row counts/rows, flag surprises (e.g., "0 rows matched — schema guess may be wrong; want me to inspect?"), and for writes suggest a verification SELECT (each further SQL again goes through its own confirm card).
- Row guard: max 20 sample rows to the AI (200 stored), values truncated to ~200 chars — protects the context window.

## 7. Client UI (`apps/client`)

**`ChatWidgetRenderer`** — switches on the widget `type` inside the message bubble; unknown/future types render a graceful fallback ("unsupported widget").

**`ChatFormRequestCard`** — shadcn form controls per field type; required-field validation; submit button → `submitFormResponse`; card locks read-only showing the entered values; disabled + spinner while submitting; error toast on failure.

**`ChatConfirmCard`** —
- SQL displayed in a monospace code block, plus a read-only/write badge.
- Write SQL: mandatory checkbox *"I have verified the backup"* — Confirm disabled until checked. (Optional convenience: a "Create backup now" shortcut button that calls the existing backup service from `docs/plans/backup-restore`; reads of that router belong to the implementing agent's `Reads:` list.)
- Confirm → `confirmAction`; Reject → `rejectAction`. After result: status chip (Executed ✓ / Failed / Rejected), row count, collapsible result table for SELECTs.
- All cards render correctly read-only from history per persisted status.

Strings via `intl.formatMessage` only; semantic Tailwind tokens (no raw hex); motion per `apps/client/src/lib/motion.ts`.

## 8. AI pipeline changes

- Register the two tools (`request_form_input`, `request_confirmation`) in the existing chat pipeline; tool schemas from `@repo/schemas`.
- System-prompt additions: use `request_form_input` whenever structured info is missing; **always** use `request_confirmation` before any SQL; exactly **one SQL statement per confirmation**; after an `action_result`, always restate and analyze the outcome; never claim success without the result.
- Pause behavior: a widget tool call ends the generation turn.

## 9. i18n (`ai.widget.*` in `en.json` + `id.json`)

`ai.widget.form.submit`, `ai.widget.form.submitting`, `ai.widget.form.submitted`, `ai.widget.form.cancel`,
`ai.widget.confirm.writeWarning`, `ai.widget.confirm.backupAck`, `ai.widget.confirm.backupRunNow`,
`ai.widget.confirm.confirm`, `ai.widget.confirm.reject`, `ai.widget.confirm.readOnlyBadge`, `ai.widget.confirm.writeBadge`,
`ai.widget.status.pending`, `ai.widget.status.confirmed`, `ai.widget.status.rejected`, `ai.widget.status.executed`, `ai.widget.status.failed`,
`ai.widget.result.rowsAffected`, `ai.widget.result.rowsReturned`, `ai.widget.result.showTable`, `ai.widget.result.truncated`,
`ai.widget.result.rolledBack`, `ai.widget.error.expired`, `ai.widget.error.unsupported`.

## 10. Permissions & activity log

- Mutations are `protected` procedures with `hasPermission('ai@...')` (exact string aligned to existing `ai@*` permissions in the repo by the implementing agent).
- Activity log entries (repo hard rule — mutations must log): confirmation created, confirmed, rejected, SQL executed (SQL text + rowCount + durationMs), execution failed (error + rolledBack).

## 11. Error handling

- Replay/double-submit of a confirmation → typed `TRPCError` (BAD_REQUEST), surfaced as card error state + toast (`ai.widget.error.expired`).
- Malformed widget payload from the model → tool-call validation error; pipeline retries generation once, then falls back to plain text (never a broken card).
- Unknown widget type on render → fallback card.
- Execution error → transaction rollback; `failed` status; error fed back to AI and user; never a partial write.

## 12. Testing strategy

**Server (vitest, test DB):**
- Confirmation lifecycle: pending → confirmed → executed; replay rejected; reject path terminal.
- Exact-SQL invariant: executed SQL equals the confirmed snapshot (assert via test table effects / spy).
- Transaction rollback: failing write → rollback verified (no partial data), status `failed`, `action_result` carries `rolledBack: true`.
- Write without `backupAck` → refused. Missing permission → refused.
- Activity log entries written for confirm/execute/reject/fail.
- `form_response` → widget `submitted`, structured values reach the next AI turn.

**Client (vitest + testing-library):**
- Form card: renders fields per type, validation, submit lock (read-only values shown).
- Confirm card: backup checkbox gates the Confirm button (write), SQL shown verbatim, result chip + collapsible table render from `action_result`.

**E2E (playwright, optional if AI creds available):** admin asks for a read query → confirm card → result table + AI re-analysis appears.

## 13. Task DAG (preview — detailed plan comes next)

```
T1 widget schemas (@repo/schemas) + index export
  ↓
T2 Prisma model AiActionConfirmation + migration
  ↓
T3 aiChat router mutations (submitFormResponse, confirmAction, rejectAction, executeConfirmedAction) + register
  ↓
T4 AI pipeline tools + system prompt + result feedback loop (pause/resume)
T5 WidgetRenderer + ChatFormRequestCard   ┐
T6 ChatConfirmCard + result table          ├ (parallel, disjoint files)
T7 i18n ai.widget.* (en + id)              ┘
  ↓
T8 wire renderer into existing chat pages / AI admin chat
  ↓
T9 server tests + client tests
  ↓
QE whole-branch review (lean, then ship)
```

Shared-file ownership: `index.ts` (schemas) → T1 only; `router.ts` → T3 only; `routes.tsx` not touched (no new pages); chat page files → T8 only.

## 14. Out of scope (v1)

- Multi-statement SQL scripts per confirmation (one statement per card).
- Widget sandboxing of arbitrary custom UI beyond the two types.
- Streaming sidecar events.
- Non-SQL admin actions (restart services, etc.).

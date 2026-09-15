### Task 1: Widget Schemas (`@repo/schemas`)

**Files:**
- Create: `packages/schemas/src/chatWidget.ts`
- Modify: `packages/schemas/src/index.ts` (add exports only)
- Test: `packages/schemas/src/chatWidget.test.ts` (write only — you never run tests; QE runs them)

**Interfaces:**
- Consumes: SPEC §3 (exact schema shapes) and §6 (result snapshot shape) at `docs/plans/ai-chat-widgets/SPEC.md`. Existing schema conventions — read `packages/schemas/src/` files yourself.
- Produces (exact export names — later tasks import these verbatim from `@repo/schemas`):
  - `chatWidgetFieldSchema` → type `ChatWidgetField`
  - `chatFormRequestWidgetSchema` → type `ChatFormRequestWidget`
  - `chatConfirmActionWidgetSchema` → type `ChatConfirmActionWidget`
  - `chatWidgetSchema` (discriminated union on `type`) → type `ChatWidget`
  - `chatFormResponseSchema` → type `ChatFormResponse`
  - `chatConfirmationSchema` → type `ChatConfirmation`
  - `chatActionResultSchema` → type `ChatActionResult`

**Reads (in your own context):**
- `docs/plans/ai-chat-widgets/SPEC.md` §3 and §6
- `AGENTS.md`
- 2–3 existing files in `packages/schemas/src/` for conventions (naming, zod import style, `.js` extensions, ULID/id patterns)

**Frozen contract:**
- Field types enum: `'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox'`
- form-request status enum: `'pending' | 'submitted' | 'cancelled'`
- confirm-action status enum: `'pending' | 'confirmed' | 'rejected' | 'executed' | 'failed'`
- `chatActionResultSchema` matches SPEC §6 shape exactly: `{ confirmationId, status: 'executed'|'failed', sql, rowCount?, rows?, truncated, error?: { message, rolledBack: true }, durationMs }`

**Steps:**
- [ ] Step 1: Write the test file first: valid field parses; `select` without `options` rejected; `requiresBackupAck: false` with `readOnly: false` rejected (the refine); valid form-request parses with `status` defaulting to `'pending'`; valid confirm-action parses; valid/invalid `chatActionResultSchema` cases.
- [ ] Step 2: Implement `chatWidget.ts` exactly per SPEC §3 + §6 shapes (ulid ids, `.default(false)` on required, `.default('pending')` on statuses, `.refine` rules).
- [ ] Step 3: Export all seven schemas + inferred types from `packages/schemas/src/index.ts`.
- [ ] Step 4: Run `bun run check-types` (scoped to schemas package). Fix until clean. Do NOT run tests.
- [ ] Step 5: Self-review against SPEC §3 field-by-field.

**Report back (mandatory):** end with `## Produces` listing every exported schema/type name exactly as above (confirm or correct the list — if the repo's existing schema conventions force a different export style, report the real names).

### Task 6: ChatConfirmCard + Result Block

**Files:**
- Create: `apps/client/src/components/ai/ChatConfirmCard.tsx`
- Create: `apps/client/src/components/ai/ChatActionResultBlock.tsx`
- Test: `apps/client/src/components/ai/ChatConfirmCard.test.tsx` (write only — never run; QE runs them)

**Interfaces:**
- Consumes: from `@repo/schemas` — `ChatConfirmActionWidget`, `ChatActionResult`. From Task 3 `## Produces` — exact namespace + `confirmAction`, `rejectAction`, `executeConfirmedAction` inputs/outputs. i18n keys (frozen, SPEC §9, implemented by Task 7): `ai.widget.confirm.writeWarning`, `ai.widget.confirm.backupAck`, `ai.widget.confirm.backupRunNow`, `ai.widget.confirm.confirm`, `ai.widget.confirm.reject`, `ai.widget.confirm.readOnlyBadge`, `ai.widget.confirm.writeBadge`, `ai.widget.status.confirmed`, `ai.widget.status.rejected`, `ai.widget.status.executed`, `ai.widget.status.failed`, `ai.widget.result.rowsAffected`, `ai.widget.result.rowsReturned`, `ai.widget.result.showTable`, `ai.widget.result.truncated`, `ai.widget.result.rolledBack`, `ai.widget.error.expired`.
- Produces (exact — Task 8 imports these):
  - `ChatConfirmCard` — props: `{ widget: ChatConfirmActionWidget; chatId: string; disabled?: boolean }` (align with Task 5's renderer seam; report final signature)
  - `ChatActionResultBlock` — props: `{ result: ChatActionResult }`

**Reads (in your own context):**
- `docs/plans/ai-chat-widgets/SPEC.md` §6, §7, §9
- `docs/design-system/DESIGN.md`, `apps/client/src/index.css`, `apps/client/src/lib/motion.ts`
- `apps/client/src/pages/Region*.tsx` (reference patterns)
- Existing chat message bubble components (integration seam)
- `docs/plans/backup-restore/tasks/task-3-backup-router.md` + the actual backup router file — ONLY for the optional "Create backup now" shortcut button (call the existing backup-create mutation if trivially wireable; otherwise omit the button and note it)
- `AGENTS.md`

**Frozen contract (behavior — SPEC §7 is law):**
- SQL shown verbatim in a monospace code block; badge: `readOnly` → `ai.widget.confirm.readOnlyBadge`, else `ai.widget.confirm.writeBadge`.
- Write SQL: mandatory checkbox `ai.widget.confirm.backupAck` — Confirm stays disabled until checked. (Reads: no checkbox.)
- Confirm flow (two calls, per SPEC §5): `confirmAction({ confirmationId, backupAck })` → then `executeConfirmedAction({ confirmationId })`. Reject → `rejectAction({ confirmationId })`. Spinners during calls; typed replay error → `ai.widget.error.expired` state on the card + toast.
- Result rendering: `ChatActionResultBlock` shows status chip (Executed ✓ / Failed / Rejected via `ai.widget.status.*`), `rowCount` via `rowsAffected`/`rowsReturned` (ICU `{count}`), collapsible result table from `rows` when present (simple table, `truncated` note when flagged), `rolledBack` warning line on failure.
- History persistence: card renders read-only per persisted widget `status` (`confirmed` → executing/disabled, `executed`/`failed`/`rejected` → final states). Reload must never resurrect a live Confirm button on a consumed confirmation.
- All strings via `intl.formatMessage`; semantic tokens only; functional components.

**Steps:**
- [ ] Step 1: Write the test file first (no runs): SQL rendered verbatim; write mode gates Confirm on the backup checkbox; confirm calls the two mutations in order; reject calls rejectAction; result block renders chip + counts + collapsible table + rolledBack line; consumed statuses render read-only.
- [ ] Step 2: Implement both components per the frozen contract.
- [ ] Step 3: Run `bun run check-types` (scoped to client). Fix until clean. Do NOT run tests.
- [ ] Step 4: Self-review against SPEC §7.

**Report back (mandatory):** end with `## Produces` — exact component names + prop signatures, mutation call order, whether the backup shortcut was wired (and to which existing mutation), files created.

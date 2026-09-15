### Task 9: Whole-Branch Quality Review (runs all tests)

**Agent:** quality-engineer · **Depends on:** T1–T8

**Scope:** the full AI-chat-widgets branch diff vs main.

**Do (in your own context):**
- [ ] Run `bun run check-types` (full workspace) — must be clean.
- [ ] Run `bunx vitest run` — full suite: new server tests (`aiChatWidgets`, `aiPipelineWidgets`, schema tests) + client tests (form card, confirm card, wiring) + existing suite (no regressions).
- [ ] Run `bunx playwright test` only if AI creds/test env allow (SPEC §12 marks e2e optional); otherwise note skipped.
- [ ] Review the diff against `docs/plans/ai-chat-widgets/SPEC.md`, hunting specifically:
  1. **Exact-SQL invariant:** `executeConfirmedAction` executes only the `AiActionConfirmation.sqlText` snapshot; no client/model SQL path into execution.
  2. **One-time-use:** replay of a consumed confirmation is refused; state machine terminal states respected.
  3. **Transactions:** execution wrapped in one `ctx.db` transaction (30s); failure → rollback → `failed` + `rolledBack: true` + activity log.
  4. **Result feedback:** `action_result` appended + AI re-analysis prompt present; row caps (20 AI / 200 stored) respected.
  5. **Backup gate:** write SQL requires `backupAck: true`; Confirm disabled without it.
  6. Activity-log entries on confirm/execute/reject/fail; permission strings consistent with existing `ai@*`.
  7. i18n: all `ai.widget.*` keys in en + id; no raw user-visible strings in components.
  8. Design law compliance (semantic tokens, motion lib, shadcn usage) + no over-engineering (ponytail lens).
- [ ] Write the full report: findings ranked blocker/major/minor, Session Changes list.

**Rules:** never `git add/commit/push/merge/PR`. End with a one-sentence **Commit/Push recommendation**.

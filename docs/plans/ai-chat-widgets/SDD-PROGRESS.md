# SDD Ledger — plan: docs/plans/ai-chat-widgets/PLAN.md

Scratch file (safe to delete with the workspace at the end).

## Setup rulings (repo constraints override skill defaults)

- Ruling: no per-task git commits — repo hard rule "git is manual-only"; user commits at the end. Cost if wrong: review diffs are less granular; QE reviews the whole branch instead.
- Ruling: implementers write tests but never run them (AGENTS.md testing ownership); QE runs the full suite in Task 9. Cost if wrong: broken tests surface later than TDD ideal.
- Ruling: single final whole-branch QE review (orchestrator role) instead of per-task reviewer subagents (skill default). Cost if wrong: cross-task issues caught later, not earlier.
- Ruling: Layer-2 tasks T4–T7 dispatch in parallel (orchestrator DAG model) despite skill's "never parallel implementers" — briefs own disjoint file sets by design. Cost if wrong: shared-file collisions; mitigated by frozen ownership table in PLAN.md.
- Ruling: work happens in the current workspace; no git worktree (orchestrator has no bash). User manages branches/commits.
- Ruling (pre-flight, T5/T6 seam): `ChatWidgetRenderer` (T5) imports `./ChatConfirmCard` using the prop signature frozen identically in both briefs `{ widget: ChatConfirmActionWidget; chatId: string; disabled?: boolean }`. T5's scoped check-types may fail while T6 is mid-flight — that is expected and not a defect; signature must match the frozen contract. Cost if wrong: one integration fix round in T8.

## Pre-flight conflict scan

| Pair | Producer → Consumer | Finding |
|---|---|---|
| T1→T3/T4/T5/T6 | schema export names listed identically in every brief | Clean (single source: SPEC §3/§6) |
| T2→T3 | `AiActionConfirmation` fields identical in both briefs | Clean |
| T3↔T4 | T3 owns routers/*+router.ts, T4 owns pipeline module only; gate-status enums identical | Clean |
| T3→T5/T6/T8 | real namespace unknown until T3 returns; briefs defer via `## Produces` paste | Clean by design |
| T5↔T6 | confirm-card import seam | Ruled above (frozen props, parallel import) |
| T5↔T7 | i18n keys vs T7 table | Fixed pre-dispatch (phantom `status.submitted` removed from T5) |
| T6↔T7 | i18n keys vs T7 table | Clean (all 17 keys present in T7 table) |
| Each task self-check | test files declared = test files touched; file lists internally consistent | Clean |

## Progress

- Plan written: SPEC.md, PLAN.md, task briefs 1–8 + QE brief 9. Awaiting T1 dispatch.
- Task 1: complete (footprint: `packages/schemas/src/chatWidget.ts` + test + index export + vitest devDep; typecheck clean, runtime smoke 13 asserts pass). Deferred minors for Task 9 triage: (a) QE runs full schemas vitest file, (b) schemas package uses extensionless relative imports (valid NodeNext+CJS locally) — observation only. Produces: seven schemas/names exactly as brief (see conversation, pasted into T3+ dispatches).
- T2 dispatched (backend-engineer, brief task-2, T1 Produces pasted).
- Task 2: complete (model `AiActionConfirmation` → table `ai_action_confirmations`, snake_case @maps, `@default(ulid())`, indexes on chat_id/created_by, no FKs; migration `20260911112952_ai_action_confirmation` applied + resolved). Ruling: real prisma paths are `apps/server/src/prisma/...` (not `apps/server/prisma/...`) — future briefs/dispatches use real paths. Ruling: `migrate dev` unavailable (P3014, no CREATEDB) — T2 used `migrate diff` + `db execute` + `migrate resolve`; user should grant CREATEDB or set shadow DB URL for future migrations.
- T3 + T7 dispatched in parallel (disjoint: server routers vs client locales).
- Task 7: complete (23 keys × 2 files, flat dot-notation inside `ai.*` cluster, typecheck clean, identical key sets verified).
- Task 3: complete (new `aiChat` tRPC router `apps/server/src/routers/ai-chat.ts` + registered in router.ts; test written `apps/server/src/tests/aiChatWidgets.test.ts`). Rulings: (1) **No server-side chat-message model exists** — chat persists client-side (useChat + localStorage, Express routes `/api/ai/chat` + `/api/ai/admin/chat`); SPEC §4's "widget JSON on server message" adapts to client-owned widget status; destructive-path enforcement (gate, one-time-use, backup-ack, exact SQL) is fully server-side. Form double-submit is client-guarded only (non-destructive) — spec intent preserved. (2) Permissions: `ai-admin@access` (seeded) for confirm/reject/execute; `submitFormResponse` auth-only (SPEC's `ai@execute` doesn't exist in repo; seed out of scope). (3) Row-cap seam: mutation returns ≤200 rows; Task 4 slices to 20 for model context. (4) Generation entry = client `useChat` `sendMessage` (DefaultChatTransport) — mutations only prepare the turn; Task 8 appends structured message + calls sendMessage.
- T4, T5, T6 dispatched in parallel (disjoint files; T5 imports `./ChatConfirmCard` per pre-flight seam ruling).
- Task 4: complete (`lib/ai-widgets.ts` new; tools wired in `routes/ai.ts` [form only] + `routes/ai-admin.ts` [both]; pause via stopWhen + 204 continuation no-op; structured-turn rendering via `metadata.{form_response,confirmation,action_result}` → tagged JSON blocks, rows sliced 20/200). Rulings: (1) `queryDatabaseAdmin` direct-execute tool REMOVED from admin pipeline — it was the exact bypass the gate replaces; validateAdminSql guardrails kept as the gate's validateSql hook; restore is a 1-line revert if QE/user disagrees. (2) Retry-once implemented as SDK input-schema rejection + model retry within stepCountIs(5) — equivalent intent, no handler restructure. (3) `request_confirmation` admin-only — registering it in the general chat would give non-admins a card that executes write SQL (privilege escalation).
- Task 5: complete (`ChatWidgetRenderer`, `ChatFormRequestCard` in `components/ai/`; renderer imports `./ChatConfirmCard` — verified against T6's landed file; `ChatFormRequestWidgetPayload = ChatFormRequestWidget & { values? }` for locked-history values).
- Task 6: complete (`ChatConfirmCard` + `ChatActionResultBlock`; backup shortcut wired to `trpcClient.backup.create`). Deferred minors for Task 9: (a) client has NO vitest config — QE must add jsdom + vitest config for client render tests; (b) FORBIDDEN toast (not hidden button) when user lacks `backup@create`; (c) reload mid-execution shows static Confirmed chip if T8 doesn't wire onStatusChange/onResult; (d) eslint broken repo-wide w/ TS 7.0 (pre-existing).
- T8 dispatched (frontend-engineer, T3–T6 Produces pasted).
- Task 8: complete (`AiAssistant.tsx` + `AiAdminChatPage.tsx` wired; new `ChatWidgetWiring.tsx` shared module + wiring test written; renderer got additive callback seam; dead `queryDatabaseAdmin` branch removed; auto-continuation excluded client-side with server 204 backstop). Rulings: (1) additive callback seam on T5's `ChatWidgetRenderer` was necessary — structured-turn flow impossible without it (backward-compatible defaults). (2) `resolveWidgetPartWidget` returns raw tool output (zod v4 stripping would drop stashed `values`). (3) Form cancel = local status only (no server mutation by design). Deferred: client vitest config missing (QE).
- **Fix dispatch (load-bearing, from T8 finding):** `ChatConfirmCard` never renders `ChatActionResultBlock` — result table/row-count invisible after execution AND after reload; violates SPEC §7 re-show (user's crucial requirement). One fixer, files: `ChatConfirmCard.tsx` (T6) + `ChatWidgetWiring.tsx` (T8) + `ChatWidgetRenderer.tsx` (T5 seam).
- Fix complete: optional `result` prop threaded (wiring resolver `resolveActionResultForConfirmation` → renderer → card), freshest-wins, confirmationId-matched, single-render ownership confirmed; client typecheck clean; tests extended (write-only).
- All implementation tasks complete (T1–T8 + fix). T9 QE dispatched — runs all tests, provisions client vitest env (jsdom) as authorized test infra, triages deferred minors, verdict + Commit/Push recommendation.
- Task 9 QE: complete. Tests: check-types clean; server 38 files/260 tests PASS (live DB, run from apps/server); schemas 25/25; client 186/186 (after provisioning `apps/client/vitest.config.ts` + `vitest.setup.ts` + devDeps, and fixing 5 test defects + 2 small production corrections: updateWidgetPartOutput referential stability, duplicate status-chip suppression, aria-hidden asterisks). e2e + lint skipped (no e2e exists; lint pre-broken). Spec verdicts 1–10 all PASS.
- Ruling (M-1): `queryDatabase` (pre-existing validated read-only client tool) REMOVED from admin pipeline tools + its client branch in `AiAdminChatPage` — SPEC §5 requires ALL admin SQL through cards; assistant chat keeps it (T4 already scoped request_confirmation to admin only). 1-line revert if user prefers the convenience path.
- Findings: I-1 Important — model-supplied `readOnly` never cross-checked vs SQL (write labeled read → no backup ack + executes via $queryRawUnsafe, empirically confirmed). Fix dispatched (server classification authoritative). M-2/M-4/M-5 minors deferred (benign/cosmetic per QE). e2e unwritten (optional per SPEC §12).
- I-1/M-1 fix dispatched (backend-engineer, one fixer, findings list verbatim).
- Fix complete: `classifySqlReadOnly` (server-authoritative classification, model flag advisory; gate+log+widget all carry server verdict; adminClientTools spreads clientTools minus queryDatabase; admin page branch removed). Tests: scoped 40/40, full server 266/266, check-types 3/3.
- Scoped re-review: I-1 ADDRESSED, M-1 ADDRESSED, no new breakage — fix wave ACCEPTED. Deferred minors (no loop): SELECT side-effecting functions classified read; tool-description drift re bare WITH; hallucinated-tool "Unknown tool" feedback; M-2/M-4/M-5; backup-button FORBIDDEN toast; no confirmed-without-result spinner; eslint pre-broken; e2e unwritten (optional).
- FINAL STATE: all tasks complete, all suites green. Recommend: commit + push (scoped to widget files; worktree also holds unrelated PDF-workstream changes; delete this scratch ledger pre-commit if unwanted).

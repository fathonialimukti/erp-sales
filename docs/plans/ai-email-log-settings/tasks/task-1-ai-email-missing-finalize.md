### Task 1: AI Email CRM — fix `missing_finalize` error

**Files:**
- Discover + Modify: `apps/server/src/routers/<ai-email-crm>.ts` (resolve exact router name in-context — likely `ai`, `email`, `aiEmail`, or `crm`; only ONE router file)
- Test: `apps/server/src/tests/<ai-email-crm>.test.ts` (create if missing, else extend)

**Interfaces:**
- Consumes: none (Layer 1 — derive from request + conventions)
- Produces: exact error root-cause, fixed procedure signature(s), regression test name(s)

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/ai-email-log-settings/tasks/task-1-ai-email-missing-finalize.md` (this brief)
- Reference router: `apps/server/src/routers/region.ts` (conventions only)
- The AI Email / CRM router(s) — find via own search for `missing_finalize` string and `finalize` procedure/flow

**Frozen contract:**
- Resource: `<ai-email-crm as discovered>`
- Permission strings: keep existing `<resource>@action` — do NOT invent new ones
- Router namespace: keep existing `trpcClient.<resource>.{...}` — fix only, no rename
- Symptom: `missing_finalize` thrown from AI Email CRM flow

**Steps:**
- [ ] Step 1: Reproduce — search for `missing_finalize` / `finalize` in server + schemas; trace the AI email flow (draft → finalize? streaming? state machine?) and write a FAILING regression test first (TDD)
- [ ] Step 2: Minimal fix — missing state transition / guard / finalize handler / Zod schema case. Follow `region.ts` conventions: `.js` imports, `protected` + `hasPermission`, `ctx.db`, activity log on mutations, ULID `currentId` on updates
- [ ] Step 3: Typecheck only — `bun run check-types` scoped to your change. DO NOT run vitest/playwright (QE owns test execution)
- [ ] Step 4: Self-review — no scope creep, no renames, no new deps

**Report back (mandatory):**
End report with `## Produces` block: exact router file + procedure names fixed, root cause (1 line), regression test file + test names, any schema/signature change (exact export names). Later tasks do NOT depend on this — keep isolated.

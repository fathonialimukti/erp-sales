### Task 12b: Exclude service accounts from demo login (deny-list)

**Files:**
- Modify: `apps/server/src/routers/auth.ts` (listDemoUsers filter + demoLogin reject — owned by this task)
- Add (if needed): `apps/server/src/lib/demo-users.js` (excluded-emails constant — only if no better home exists in your context)
- Test: extend `apps/server/src/tests/auth-demo.test.ts` (write only, do NOT run)
- Do NOT touch: seeder (T12a owns), schemas, client, router.ts, routes

**Interfaces:**
- Consumes: T2 procedures `auth.listDemoUsers` / `auth.demoLogin` gated on `DEMO_LOGIN_ENABLED`; User model has NO flag — email deny-list recommended.
- Produces: exclusion behavior for T13 + QE.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/src/routers/auth.ts`
- `apps/server/src/routers/region.ts` (reference)
- Seeder emails: `AI_SYSTEM_EMAIL ?? 'ai-system@mail.com'`, `ERP_INTEGRATION_EMAIL ?? 'n8n@mail.com'`

**Frozen contract:**
- Constant: `SYSTEM_EXCLUDED_EMAILS = [AI_SYSTEM_EMAIL ?? 'ai-system@mail.com', ERP_INTEGRATION_EMAIL ?? 'n8n@mail.com']` (env-driven with literal fallback, exact-match, no substring).
- `listDemoUsers`: add `where: { email: { notIn: SYSTEM_EXCLUDED_EMAILS } }` (keep orderBy email, keep output schema).
- `demoLogin`: reject those ids/emails with same FORBIDDEN path as disabled (do NOT leak which account; unknown userId stays NOT_FOUND).
- Imports `.js`; Prisma via `ctx.db`; no `hasPermission` change (public demo gate stays, documented).
- Tests (write only): list excludes both service emails; demoLogin for excluded id → FORBIDDEN; existing 4 tests keep passing.

**Steps:**
- [ ] Add constant + filter + reject
- [ ] Extend test file (no run)
- [ ] Self-review only
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: exact constant + values, filter/reject locations, test cases added. T13/QE consume verbatim.

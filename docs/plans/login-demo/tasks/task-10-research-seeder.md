### Task 10: Research seeder users/roles (report only, no edits)

**Files:** none (research only — do NOT modify seeder, schemas, routers, env)

**Interfaces:**
- Consumes: login-demo Option A live (`auth.listDemoUsers` returns all users ordered by email, unbounded).
- Produces: seeder inventory + proposal for demo user set.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- Seeder files in `apps/server` (prisma seed / seed scripts — locate in your own context)
- `apps/server/src/routers/auth.ts` (`listDemoUsers` mapping) + role/permission model

**Frozen contract:**
- Report only. No code edits. Never git add/commit/push. No test runs.
- Questions to answer:
  1. Which users does the seeder create today (emails, names, roles)? Which are system/integration accounts (AI System, n8n integration)?
  2. How are `role` + `capabilities` derived for `listDemoUsers` (role→permissions mapping)?
  3. How to exclude system accounts from demo list (filter by email/flag/role — recommend exact mechanism, e.g. flag vs deny-list)?
  4. Propose demo user set for an ERP sales + goods-receiving operation: admin + manager + supervisor + staff + INBOUND staff (goods receiving only). For each: name/email/role + minimal permission set + what they can/cannot do. Keep inbound staff scoped to receiving (e.g. inbound/read+create, no approve/delete, no sales-pricing).
  5. Seeder change sketch (which file, what to add — exact user/role rows) WITHOUT applying it.

**Steps:**
- [ ] Inventory seeder users + roles/permissions
- [ ] Explain AI System / n8n accounts and exclusion mechanism
- [ ] Propose new demo set with permission scoping
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: inventory table, exclusion recommendation, proposed user table (user/role/permissions/scope notes), seeder sketch (file + rows to add).

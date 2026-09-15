### Task 20: User table description (backend, DB-backed card text)

**Files:**
- Modify: Prisma schema (`schema.prisma` User model — add `description String?`) ONLY if no reusable description column exists in your context (check Role.description first — T10 found `role.description` EN-only in DB but unexposed; user explicitly asked for *user table* desc, so prefer adding `User.description` unless reuse is clearly better — decide and report why)
- Modify: migration (add column, nullable, no backfill required except demo seeds)
- Modify: `apps/server/src/prisma/seed.ts` (descriptions for the 5 `@aetherglo.com` demo users + admin — one or two sentences each, role story: what this account does)
- Modify: `packages/schemas/src/auth.ts` (`demoUserSchema` gains `description: string nullable/optional`) + re-export if needed
- Modify: `apps/server/src/routers/auth.ts` (`listDemoUsers` maps `description`; keep exclusion + gating untouched)
- Test: extend `apps/server/src/tests/auth-demo.test.ts` (write only, do NOT run — description present in output)

**Interfaces:**
- Consumes: T12a demo users/roles; T12b exclusion; `demoUserSchema = {id,email,name,role,capabilities}` (capabilities stay in output for now — frontend simply stops rendering them; do NOT remove from schema to avoid breaking other consumers).
- Produces: `description` field end-to-end (DB → seed → schema → router output) for T21 card.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- Prisma schema + seed.ts + routers/auth.ts + packages/schemas/src/auth.ts

**Frozen contract:**
- Descriptions (EN, data not i18n keys — note the tradeoff in report):
  - Demo Admin: full access, users/roles/every workflow.
  - Demo Manager: runs sales operation, reviews/validates/approves team orders.
  - Demo Supervisor: supervises team, proposes/validates orders, never approves.
  - Demo Staff: field account, own sales orders and visits.
  - Demo Inbound: receiving only, records incoming goods, no pricing or sales orders.
- Nullable column, upserts set description (do not overwrite Admin's if it has one — set only when missing or per your context's convention; report choice).
- Imports `.js`; Prisma via `ctx.db`; no gating/exclusion change. Never git add/commit/push.

**Steps:**
- [ ] Add column (or reuse + justify) + migrate dev DB
- [ ] Seed descriptions + expose via schema + router + tests (write-only)
- [ ] Self-review, no test/seed run beyond the migration itself (report if seed run needed → orchestrator will approve separately)
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: column decision + migration name, exact seed texts, schema/router bindings, test additions.

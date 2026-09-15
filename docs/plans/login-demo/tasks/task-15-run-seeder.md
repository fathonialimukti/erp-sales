### Task 15: Run legacy seeder to materialize @aetherglo.com demo users (explicit user approval)

**Files:** none (ops — seed run only, no code edits)

**Interfaces:**
- Consumes: T12a added 5 upserts + 4 roles + 2 perms in `apps/server/src/prisma/seed.ts` (NOT yet applied to DB); T12b exclusion already in router.
- Produces: 5 demo users + roles live in dev DB.

**Reads (in your own context):** AGENTS.md, `apps/server/src/prisma/seed.ts` (seed entry), package.json seed scripts.

**Frozen contract:**
- User explicitly approved running the seeder (this task only).
- Run ONLY the legacy access-control seeder (the `prisma db seed` target → `seed.ts`). Do NOT run `seed:ph --all` (fixture data, out of scope).
- Seeder uses upserts by email — safe to re-run; legacy users untouched.
- After seed: probe `auth.listDemoUsers` (or DB query) to confirm the 5 `@aetherglo.com` users exist with roles, and service accounts (`ai-system@mail.com`, `n8n@mail.com`) exist but are filtered from the list.
- Never git add/commit/push. No code edits. If seed fails, report error verbatim, do not force.

**Steps:**
- [ ] Run legacy seeder for dev DB
- [ ] Verify 5 demo users + roles live, exclusion holds
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: exact command run, users/roles created (or already existed), probe result, any errors.

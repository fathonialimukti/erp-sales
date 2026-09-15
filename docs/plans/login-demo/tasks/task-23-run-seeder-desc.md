### Task 23: Re-run legacy seeder to populate User.description (approved)

**Files:** none (ops — seed run only)

**Interfaces:**
- Consumes: T20 added `User.description` column (migrated, live) + seed texts for 5 demo users; T12a demo users already live.
- Produces: 5 demo descriptions in dev DB.

**Reads (own context):** AGENTS.md, seed.ts upsert blocks.

**Frozen contract:**
- Run ONLY legacy seeder (`bun prisma db seed` in apps/server — NOT seed:ph --all). Upserts by email, idempotent; Demo Admin description set only-when-missing (never overwrite), other 4 always-updated (T20 convention).
- Verify: DB probe — 5 demo users have non-empty `description` matching T20 texts; `listDemoUsers` output includes them (flag on).
- Never git add/commit/push. No code edits. On failure report verbatim.

**Steps:** [ ] Run seed [ ] Probe descriptions + listDemoUsers [ ] Report.

**Report back (mandatory):** End with `## Produces`: command, description values present, probe result.
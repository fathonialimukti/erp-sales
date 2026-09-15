### Task 7: Email CRM detail loading forever — backend debug + fix

**Files:**
- Discover + Modify: `apps/server/src/routers/email-crm.ts` (`detail` procedure only — ONE router file)
- Test: `apps/server/src/tests/routers/email-crm.test.ts` (extend)

**Interfaces:**
- Consumes: none (independent; repro ID `01M2HVDFB7600RYH6F2WF231QV` ULID from prod URL `/email-crm/:id`)
- Produces: root cause, fix, regression test

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-7-detail-backend.md`)
- Reference: `apps/server/src/routers/region.ts`
- Target: `apps/server/src/routers/email-crm.ts` detail + Zod input schema + Prisma model + `apps/server/src/lib/logger.ts`

**Frozen contract:**
- Resource stays `email-crm`, procedure `detail({id})`, no renames, keep `protected` + `hasPermission`, `.js` imports, `ctx.db`

**Steps:**
- [ ] Step 1: Reproduce — call `detail` with `01M2HVDFB7600RYH6F2WF231QV` + unknown id + invalid id. Check: Zod id validation hanging vs throwing, permission `email-crm@read` deny shape, Prisma `findUnique` on missing row (null → NOT_FOUND?), un-awaited promise / transaction never committing, include/select blowing up on null relation, logger swallowing error. Check app log file. Write FAILING test first.
- [ ] Step 2: Minimal fix — throw NOT_FOUND / BAD_REQUEST correctly, never hang, never return null-shape that FE spins on.
- [ ] Step 3: `bun run check-types` scoped. DO NOT run vitest (write only, QE runs).
- [ ] Step 4: Self-review — detail only, no list/send changes

**Report back (mandatory):**
End with `## Produces`: exact file+procedure, root cause 1 line, test names, error shape before/after (hang vs TRPCError code).

### Task 5: Compose reply Send failure — backend debug + fix

**Files:**
- Discover + Modify: `apps/server/src/routers/email-crm.ts` (`sendMessage` and related compose/send procedures — ONE router only)
- Test: `apps/server/src/tests/routers/email-crm.test.ts` (extend)

**Interfaces:**
- Consumes: T1 Produces — `sendMessage` sets `agentStatus:'SENT'`, `agentError:null` on SMTP success, keeps `email-crm@update`
- Produces: root cause, fixed signature, regression test

**Reads (in your own context):**
- `AGENTS.md`
- This brief
- `apps/server/src/routers/region.ts` (conventions)
- `apps/server/src/routers/email-crm.ts` + `apps/server/src/lib/email-concierge.ts` (`validateConciergeResult`) + `apps/server/src/lib/logger.ts` + recent `logs/app-*.log` / `trpcClient.applicationLog.list`

**Frozen contract:**
- Resource stays `<email-crm>`, no renames, no new permissions unless missing (list exact string in Produces)
- Keep `protected` + `hasPermission`, `ctx.db` tx, activity log, `.js` imports

**Steps:**
- [ ] Step 1: Reproduce — call `sendMessage` path directly; check: Zod input validation, `hasPermission('email-crm@update')`, SMTP transport/config error, message_id unique constraint (QE H2: static mock `<smtp-test@aetherglo.com>` → P2002 on 2nd send), agentStatus transition. Check app-log file + console for thrown TRPCError. Write FAILING test first.
- [ ] Step 2: Minimal fix — validator, permission seed note, SMTP error surfacing, unique message_id, or status transition. No scope creep.
- [ ] Step 3: `bun run check-types` scoped. DO NOT run vitest/playwright (write only, QE runs).
- [ ] Step 4: Self-review

**Report back (mandatory):**
End with `## Produces`: exact file+procedure, root cause 1 line, test file+names, user-visible error before/after, any env/seed note (SMTP vars, permission row).

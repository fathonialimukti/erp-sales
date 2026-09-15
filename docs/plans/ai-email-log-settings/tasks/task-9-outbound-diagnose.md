### Task 9: Email outbound never happens — diagnose + fix (AI finalize + SMTP)

**Evidence (prod payload, conversation `01M2HVDFB7600RYH6F2WF231QV`):**
- `agentStatus: "FAILED"`, `agentError: "missing_finalize"`, `lastOutboundAt: null`
- `messages: [INBOUND, INBOUND]` only — **zero OUTBOUND rows**, all `sendStatus: null`, `sentAt: null`, `error: null`
- `customerId: null`, `customer: null` (conversation not linked to a customer)
- Two identical inbound "try again" messages at 06:17 and 08:48; `updatedAt` 08:48:43 (concierge ran ~12s after inbound and failed)
- Sibling query returned `{ count: 0 }`

**Interpretation to verify:** the failure is upstream of the UI — no outbound message is ever persisted, so both the AI path (never called `finalizeCustomerReply` → `missing_finalize`) and the manual compose path (no OUTBOUND row, `lastOutboundAt` null) are producing nothing. `customerId: null` may starve the AI of pricing/customer context, which would make it unable to finalize.

**Files:**
- Discover + Modify: `apps/server/src/lib/email-concierge.ts` (finalize validation / `validateConciergeResult` path) and/or `apps/server/src/routers/email-crm.ts` (`sendMessage` outbound write) — ONLY the file(s) that own the fault; state which in Produces
- Test: `apps/server/src/tests/routers/email-crm.test.ts` or `apps/server/src/tests/email-concierge.test.ts`

**Interfaces:**
- Consumes: T1 — `sendMessage` sets `agentStatus:'SENT'`, `agentError:null` on SMTP success; T7 — `detail` typed errors
- Produces: root cause, whether the defect is AI-finalize or SMTP-outbound or config, fix, regression test, config/env findings

**Reads (in your own context):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-9-outbound-diagnose.md`)
- `apps/server/src/routers/region.ts` (conventions)
- `apps/server/src/lib/email-concierge.ts`, `apps/server/src/routers/email-crm.ts`, SMTP/mail transport lib, `apps/server/src/lib/logger.ts`, recent `apps/server/logs/app-*.log`

**Frozen contract:**
- Keep resource `email-crm`, permissions as-is (list any missing seed row in Produces), `.js` imports, `ctx.db`, activity log on mutations
- NO UI changes (that is Task 10)

**Steps:**
- [ ] Step 1: Reproduce the exact flow — inbound on a conversation with `customerId: null` → concierge → assert FAILED/missing_finalize. Then call the manual send path and assert whether an OUTBOUND row + `lastOutboundAt` are produced. Write FAILING tests first.
- [ ] Step 2: Determine which of these is true:
  (a) AI provider/model unconfigured or returning no `finalizeCustomerReply` tool call → failure is config/agent-prompt, not code
  (b) `customerId: null` starves agent context, so it can never finalize → needs graceful manual-reply fallback
  (c) SMTP transport unconfigured/erroring → no OUTBOUND persisted
  (d) `sendMessage` swallows transport errors → no row, no surfaced error
  Report config findings (env var names present/absent: SMTP_HOST/PORT/USER/PASS/FROM, AI provider keys) WITHOUT printing secret values.
- [ ] Step 3: Minimal fix for whichever is true — e.g. persist OUTBOUND + surface typed error on SMTP failure, ensure manual send works with `customerId: null`, and/or clear `missing_finalize` on successful manual reply so the FAILED banner stops lying.
- [ ] Step 4: `bun run check-types` scoped. DO NOT run vitest/playwright (write only, QE runs).
- [ ] Step 5: Self-review — no scope creep, no renames.

**Report back (mandatory):**
End with `## Produces`: exact file(s)+procedure(s), **answer to "is the problem on email outbound?"** (yes/no/partially + 1 line why), root cause, test file+names, config/env gaps (names only, no values), what the user sees before/after, and whether a seed/migration is needed.

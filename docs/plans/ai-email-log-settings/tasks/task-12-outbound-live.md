### Task 12: LIVE email outbound verification + fix (real SMTP, not mocked)

**Why:** T9 concluded "outbound is healthy" using a MOCKED SMTP transport. That proves code, not transport. User insists the fault is outbound. The prod payload shows `lastOutboundAt: null` and **zero OUTBOUND rows** — so we have never actually observed a successful real send. Verify LIVE.

**Files:**
- Discover + Modify: SMTP/mail transport lib (resolve exact path, e.g. `apps/server/src/lib/mail.ts` / `smtp.ts` / `email.ts`) and/or `apps/server/src/routers/email-crm.ts` `sendMessage` — ONLY what owns the fault
- Test: `apps/server/src/tests/routers/email-crm.test.ts` or a transport test

**Interfaces:**
- Consumes: T9 (`runEmailConcierge` finalize enforcement), T1 (`sendMessage` clears FAILED/missing_finalize on success)
- Produces: live send result, exact SMTP error (if any), fix, regression test, config corrections

**Reads (in your own context):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-12-outbound-live.md`)
- `apps/server/src/routers/email-crm.ts`, the mail/SMTP transport lib, `apps/server/src/lib/logger.ts`, `apps/server/.env` (READ ONLY — never print secret values), recent `apps/server/logs/app-*.log`

**Frozen contract:**
- Resource `email-crm` unchanged, permissions unchanged, `.js` imports, `ctx.db`
- **Do NOT print any secret values** — report env var NAMES and present/absent/format-validity only
- Send AT MOST ONE real test email, to the configured `SMTP_FROM`/`SMTP_USER` address (self-send). No bulk, no external recipients.

**Steps:**
- [ ] Step 1: **LIVE transport test.** Load `apps/server/.env`, construct the same transport the app uses, `verify()` the connection, then send ONE test email to `SMTP_FROM`. Capture the EXACT error object (code, responseCode, command, response) if it fails. This is the decisive test — do it FIRST and report raw output.
- [ ] Step 2: Check the transport config against the provider: host/port/`secure` pairing (587+STARTTLS vs 465+TLS), auth method, `from` address vs authenticated user, timeouts, `rejectUnauthorized`/TLS settings. Gmail/SMTP specifics: app-password required, "Less secure apps" removed, `from` must match or be authorized alias.
- [ ] Step 3: Trace the outbound write path — confirm whether an OUTBOUND `EmailMessage` row with `sendStatus`/`sentAt` is persisted on success, and whether `lastOutboundAt` is set. If the row is only written AFTER a successful send, a failing send leaves exactly the prod signature (no OUTBOUND row, `lastOutboundAt: null`).
- [ ] Step 4: Also verify the compose/manual-send input path end-to-end (the `sendMessage` procedure) with a real conversation: does it reach the transport, or fail earlier (validation/permission)?
- [ ] Step 5: Minimal fix for whatever is actually broken (transport config validation, error surfacing, `secure`/port mismatch, from-address, or persisting a FAILED outbound row with `error` so failures are visible instead of silent). Write FAILING test first.
- [ ] Step 6: `bun run check-types` scoped (from `apps/server`).
- [ ] Step 7: Self-review.

**Report back (mandatory):**
End with `## Produces`:
- **Raw live result:** did `verify()` pass? did the real send succeed? full error object if not
- exact file(s)+procedure(s) changed
- root cause 1 line
- whether the problem IS email outbound (yes/no + evidence)
- config corrections needed (env var NAMES + values only where non-secret, e.g. port numbers)
- test file+names, and the exact command to run it
- what the user sees before/after

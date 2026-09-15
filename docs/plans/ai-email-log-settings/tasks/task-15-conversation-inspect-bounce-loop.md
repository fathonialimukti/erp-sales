### Task 15: Inspect conversation 01M2JDEEN4XB1JZ0YKMT531J82 + fix VERP bounce auto-reply loop

**Context:** User reports "it's here" pointing at `https://erp-sales.aetherglo.com/email-crm/01M2JDEEN4XB1JZ0YKMT531J82`. We need ground truth on this conversation's message-level state: did the outbound actually land, did the customer's reply come back, is the round-trip working now that port 2525 is live. Second: T14 found a **proven** code fault — the app auto-replied to a Brevo VERP bounce address, creating a mail loop.

**Files:**
- Read-only inspection: DB (`EmailConversation`, `EmailMessage`, `appSetting`)
- Discover + Modify: `apps/server/src/lib/email-inbound.ts` (`shouldSkipInbound` bounce filter) — ONE file
- Test: `apps/server/src/tests/lib/email-inbound.test.ts` (create/extend)

**Interfaces:**
- Consumes: T14 — `shouldSkipInbound` filters `noreply@|no-reply@|mailer-daemon@|postmaster@|bounce@` but NOT VERP bounce addresses like `bounces-486094414-3447527115@mail.aetherglo.com`; observed auto-reply to a bounce at 11:38:37
- Produces: conversation forensics + bounce-loop fix + tests

**Reads (in your own context):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-15-conversation-inspect-bounce-loop.md`)
- `apps/server/src/lib/email-inbound.ts`, `apps/server/src/lib/email-concierge.ts`, `apps/server/src/routers/email-crm.ts`, recent `apps/server/logs/app-*.log`

**Frozen contract:**
- NEVER print secret values. Env var NAMES only.
- Inspection is READ-ONLY. Only the bounce filter may change.
- Do NOT send mail to customer addresses.

**Steps:**
- [ ] Step 1: **Conversation forensics (read-only).** For `01M2JDEEN4XB1JZ0YKMT531J82`, dump: conversation fields (`status`, `agentStatus`, `agentError`, `customerId`, `lastMessageAt`, `lastOutboundAt`, `createdAt`, `updatedAt`) and **every** message (`direction`, `messageId`, `inReplyTo`, `sendStatus`, `sentAt`, `error`, `createdAt`, recipient/from where available). Report the ordered timeline.
- [ ] Step 2: **Answer the delivery question with evidence.** Is there now an OUTBOUND row with `sendStatus: SENT` + `sentAt` set? Did a customer INBOUND reply arrive afterwards (proving end-to-end round-trip)? Is `lastOutboundAt` populated? Is the `FAILED`/`missing_finalize` banner cleared? If an inbound arrived, quote its `messageId`/`inReplyTo` linkage to prove threading.
- [ ] Step 3: Cross-check `apps/server/logs/app-*.log` for this conversation id and the messageIds — note any SMTP error, bounce, or inbound webhook entries.
- [ ] Step 4: **Fix the VERP bounce loop.** Broaden `shouldSkipInbound` to also reject VERP/bounce senders — at minimum `bounces?[+-]` / `bounce[+-]` local parts and the `mail.` bounce subdomain pattern (e.g. `bounces-<digits>-<digits>@mail.<domain>`), while NOT rejecting legitimate customer local parts that merely contain "bounce" as a substring (avoid over-matching). Keep any existing filters intact.
- [ ] Step 5: Write FAILING tests first for the new patterns: `bounces-486094414-3447527115@mail.aetherglo.com` → skipped; `bounce+abc@x.com` → skipped; `mailer-daemon@x.com` (existing) → skipped; a normal customer `bouncer@x.com`/`mybounce@x.com` → NOT skipped (guard against over-matching); normal customer address → NOT skipped.
- [ ] Step 6: `bun run check-types` from `apps/server`. Write tests only — do not run the full suite.
- [ ] Step 7: Self-review — no scope creep.

**Report back (mandatory):**
End with `## Produces`:
- **Timeline** for the conversation: ordered messages with direction/status/timestamps
- **Delivery verdict:** outbound SENT? sentAt set? lastOutboundAt set? customer reply received? round-trip working? FAILED banner cleared?
- Any log evidence (errors, bounces, webhook hits)
- Exact file changed for the bounce fix + new regex
- Test file + names + exact run command
- Remaining risks / follow-ups
- Whether the email problem is now RESOLVED (yes/no + why)
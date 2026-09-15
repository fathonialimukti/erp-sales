### Task 14: "Email sent" but never delivered — verify Brevo delivery outcome

**Symptom:** UI now shows email sent (port fix worked — relay accepts with `250 queued`), but **no mail arrives** at the recipient. Question: is Brevo actually working?

**Critical distinction:** `250 2.0.0 OK: queued as <id>` means **Brevo accepted the message**, NOT that it was delivered. Delivery is a separate downstream event. We must find the real outcome: delivered / spam / bounced / blocked / silently dropped.

**Files:**
- Discover + Modify: only if a code fault is proven (e.g. wrong `to`, wrong `from`, missing reply-to, optimistic "sent" state written before SMTP confirmation)
- Test: extend `apps/server/src/tests/lib/email-smtp.test.ts` or `email-crm.test.ts` only if a code fault is found

**Interfaces:**
- Consumes: T12/T13 — port 2525 works, `250 queued` observed, `SMTP_FROM = AetherGlo Sales <info@aetherglo.com>`, `SMTP_DOMAIN` absent (defaults `aetherglo.com`)
- Produces: actual delivery status, root cause, DNS/auth findings, exact fix

**Reads (in your own context):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-14-brevo-delivery.md`)
- `apps/server/src/lib/email-smtp.ts`, `apps/server/src/routers/email-crm.ts`, `apps/server/.env` (READ ONLY), recent `apps/server/logs/app-*.log`

**Frozen contract:**
- NEVER print secret values (SMTP_PASS, Brevo API key, tokens). Env var NAMES + present/absent only.
- Do NOT send bulk mail. At most a 2–3 message deliverability probe, all to addresses you can inspect (the app's own address first).

**Steps:**
- [ ] Step 1: **Find the exact outbound record.** Query the DB for the most recent OUTBOUND `EmailMessage` rows: `to`, `from`, `messageId`, `sentAt`, `sendStatus`, `error`. Note the recipient that "didn't receive" and the `messageId` actually returned by Brevo. Confirm whether the app writes `sendStatus: SENT` optimistically or only after the SMTP `250` (check both `sendMessage` and `applyConciergeResult`).
- [ ] Step 2: **Ask Brevo what happened to that message.** If a Brevo API key is configured (look for `BREVO_API_KEY` / `SENDINBLUE_API_KEY` or similar in `.env` — name only), query Brevo's transactional event log for the `messageId` / recipient:
  - `GET https://api.brevo.com/v3/smtp/statistics/events` (filter by `messageId`/`email`) — look for `delivered`, `spam`, `bounced`, `blocked`, `deferred`, `error`
  - If no API key exists, REPORT that clearly — this is the single most useful missing piece.
- [ ] Step 3: **Check sender-domain authentication via DNS.** Run live DNS lookups and report raw records:
  - `dig TXT aetherglo.com` → does SPF exist and include Brevo (`include:spf.brevo.com` / `sendinblue`)?
  - `dig TXT mail._domainkey.aetherglo.com` (and any Brevo DKIM selector, e.g. `brevo._domainkey`) → is DKIM published?
  - `dig TXT _dmarc.aetherglo.com` → is DMARC present and what policy?
  - Verdict: unauthenticated `From: info@aetherglo.com` → **Gmail will spam-folder or reject** even though Brevo queued it.
- [ ] Step 4: **Confirm the sender is a verified sender in Brevo.** Report what evidence you can obtain (API `GET /v3/senders` if a key exists, or note that it must be checked in the Brevo dashboard). An unverified sender is accepted by the relay but dropped/bounced downstream — this matches the symptom exactly.
- [ ] Step 5: **Deliverability probe.** Send 2 clearly-marked test messages to addresses you can inspect (the app's own `SMTP_FROM` and one external mailbox the user controls if available). Report `accepted[]`, `rejected[]`, `response`, and returned `messageId` for each. Do NOT probe customer addresses.
- [ ] Step 6: Check the recipient side for the specific failing case: is the customer address real (`fathonialim2@gmail.com` from the prod payload)? Gmail spam folder? Check whether the message was threaded into the original conversation (In-Reply-To/References) — a missing thread header can land it in spam.
- [ ] Step 7: Fix ONLY a proven code fault. If the cause is DNS/sender-verification (likely), do NOT invent a code workaround — produce the exact remediation checklist instead.
- [ ] Step 8: `bun run check-types` from `apps/server` if any code changed.

**Report back (mandatory):**
End with `## Produces`:
- **Direct answer: is Brevo working?** (yes-no-partially + 1 line)
- The outbound row evidence: `to`, `from`, `messageId`, `sentAt`, `sendStatus`, `error`
- **Brevo event status** for that messageId (delivered/spam/bounced/blocked/deferred) or "no API key — cannot query"
- **DNS results** verbatim: SPF present? DKIM present? DMARC policy?
- Is the sender verified in Brevo? (and how you know)
- Root cause, 1 line
- **Exact remediation checklist** (Brevo dashboard steps, DNS records to add, env vars to set — names + record values only, no secrets)
- Whether any code was changed + test names
- What the user should check first (spam folder, Brevo dashboard → Transactional → Logs)
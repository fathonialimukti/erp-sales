# Email CRM + Concierge Outbound — Context Pack (FROZEN)

> Single source of truth for Backend + Frontend specialists.  
> Design: `docs/superpowers/specs/2026-07-22-email-concierge-outbound-design.md`  
> Plan: `docs/superpowers/plans/2026-07-22-email-concierge-outbound.md`  
> Prior inbound design: `docs/superpowers/specs/2026-07-20-email-crm-inbound-design.md`  
> Worker sample: `docs/cloudflare/index.js`

## Frozen Contract

```
## FROZEN CONTRACT — do not reinterpret, do not re-read conventions
Resource: emailCrm
Fields:
  EmailConversation:
    email(string, NOT unique — indexed), subject?, status(OPEN|PENDING|RESOLVED|SPAM),
    priority(LOW|NORMAL|HIGH|URGENT), sentiment?, tags?(string[]), lastMessageAt?,
    customerId?, agentStatus(IDLE|RUNNING|AWAITING_SEND|SENT|FAILED default IDLE),
    agentError?, lastOutboundAt?
  EmailMessage:
    conversationId, direction(INBOUND|OUTBOUND), body, htmlBody?, messageId?,
    inReplyTo?, references?, sendStatus(PENDING|SENT|FAILED|SKIPPED|null), sentAt?, error?
  SalesOrder: emailConversationId? required when created from email path; source EMAIL_CRM
NO outletId on EmailConversation
Permission strings: email-crm@create | email-crm@read | email-crm@update | email-crm@delete
Inbound (public Express): POST /api/email/inbound
  Header: X-Email-Webhook-Secret == env EMAIL_WEBHOOK_SECRET (timing-safe)
  Body: emailInboundPayloadSchema
  Behavior: store with HEADER THREADING + enqueue Email Concierge (async)
  Threading: In-Reply-To / References → parent message → same conversation; else NEW conversation (same sender OK)
Auto-reply: server-owned SMTP after agent finalizeCustomerReply — NOT Cloudflare message.reply AI body
SMTP env: SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS SMTP_FROM (info@aetherglo.com)
AI rate limit: 50 RPM on model provider — serialize/throttle concierge jobs; stopWhen ≤ 8 steps
Router namespace (tRPC): trpcClient.emailCrm.{list, detail, create, update, delete, createMessage, sendMessage, suggestReply, createDraftOrder, retryAgent}
Schema file: packages/schemas/src/email-crm.ts → @repo/schemas/email-crm
Router file: apps/server/src/routers/email-crm.ts
Lib: email-inbound.ts, email-smtp.ts, email-html.ts, email-concierge.ts, email-concierge-tools.ts
Client pages: apps/client/src/pages/email-crm/*
Landing: REMOVE CustomerAiWidget from LandingPage
SO detail: link back to /email-crm/:id when emailConversationId set
i18n prefix: emailCrm.* (en + id)
Reference router: apps/server/src/routers/email-crm.ts (existing) + customer.ts patterns
Reference AI tools: apps/server/src/lib/customer-ai-tools.ts (copy patterns; email-scoped module)
Reference discount: apps/server/src/lib/action-program-discount.ts findBestDiscount
Design is FROZEN. Do NOT invoke brainstorming, writing-plans, or re-read .github/instructions for redesign.
```

## Critical product rules

1. **finalizeCustomerReply** is the only customer-facing send unlock (HTML required).
2. Free-form agent text is never SMTP'd.
3. No second LLM reviewer — deterministic sanitize only.
4. Draft SO from agent/email UI: `source: 'EMAIL_CRM'` + `emailConversationId`.
5. Never commit SMTP secrets. Rotate any key pasted in chat.
6. **50 RPM AI API** — in-process queue; no unbounded parallel concierge runs.
7. Public `/api/ai/customer/chat` must NOT gain email-thread tools.

## Env (server)

```
EMAIL_WEBHOOK_SECRET=
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=b277cd001@smtp-brevo.com
SMTP_PASS=   # never commit
SMTP_FROM=AetherGlo Sales <info@aetherglo.com>
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
```

## Out of scope

- Cloudflare deploy
- Second LLM reviewer
- Attachments
- Auto-approve sales orders
- Durable Redis queue (v1 in-process is fine)

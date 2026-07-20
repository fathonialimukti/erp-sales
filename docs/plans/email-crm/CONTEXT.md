# Email CRM — Context Pack (FROZEN)

> Single source of truth for Backend + Frontend specialists.  
> Design: `docs/superpowers/specs/2026-07-20-email-crm-inbound-design.md`  
> Plan: `docs/superpowers/plans/2026-07-20-email-crm.md`  
> Worker sample: `docs/cloudflare/worker.txt`

## Frozen Contract

```
## FROZEN CONTRACT — do not reinterpret, do not re-read conventions
Resource: emailCrm
Fields:
  EmailConversation: email(string unique normalized), subject?, status(OPEN|PENDING|RESOLVED|SPAM default OPEN), priority(LOW|NORMAL|HIGH|URGENT default NORMAL), sentiment?, tags?(string[]), lastMessageAt?, customerId?
  EmailMessage: conversationId, direction(INBOUND|OUTBOUND), body, messageId?, inReplyTo?, references?
  SalesOrder delta: emailConversationId?, source includes EMAIL_CRM
NO outletId on EmailConversation
Permission strings: email-crm@create | email-crm@read | email-crm@update | email-crm@delete
Inbound (public Express, NOT tRPC): POST /api/email/inbound
  Header: X-Email-Webhook-Secret == env EMAIL_WEBHOOK_SECRET (timing-safe)
  Body: emailInboundPayloadSchema from @repo/schemas/email-crm
Router namespace (tRPC): trpcClient.emailCrm.{list, detail, create, update, delete, createMessage, suggestReply, createDraftOrder}
Schema file: packages/schemas/src/email-crm.ts  (import @repo/schemas/email-crm — package has NO index.ts barrel; exports are "./*")
Router file: apps/server/src/routers/email-crm.ts → register emailCrm in apps/server/src/router.ts
Inbound files: apps/server/src/lib/email-inbound.ts + apps/server/src/routes/email-inbound.ts → register in apps/server/src/index.ts
Client pages: apps/client/src/pages/email-crm/EmailCrmIndexPage.tsx, EmailCrmDetailPage.tsx, EmailCrmFormPage.tsx
Routes: /email-crm, create, :id, :id/edit under ProtectedRoute
Nav: nav.sales child, permission email-crm@read, i18n key nav.email_crm
i18n prefix: emailCrm.* (both en.json and id.json)
Worker sample (docs only, do not deploy): docs/cloudflare/worker.txt — keep payload fields compatible
Reference router: apps/server/src/routers/customer.ts
Reference schema: packages/schemas/src/region.ts + common createListInputSchema(extraShape)
Reference pages: apps/client/src/pages/customer/*
Reference AI: apps/server/src/lib/ai-provider.ts chatModel; generateText from 'ai' (see ai-sales-order-validation.ts)
Reference customer AI tools (doc number pattern only): apps/server/src/lib/customer-ai-tools.ts
Test helpers: apps/server/src/tests/helpers/caller.ts createCaller; setup apps/server/src/tests/setup.ts
Seed permissions: apps/server/src/prisma/seed.ts PERMISSIONS array
Design is FROZEN. Do NOT invoke brainstorming, writing-plans, or re-read .github/instructions for redesign.
```

## Key repo facts

- Monorepo: Bun, Turbo, Express+tRPC server port 10022, React+Vite client
- Prisma client: import from generated path via `../lib/prisma.js` singleton; schema at `apps/server/src/prisma/schema.prisma`
- All server imports use `.js` extensions
- Activity log required on mutations: `logActivity` + `buildCreateLogDetail` / `buildUpdateLogDetail` / `buildDeleteLogDetail`
- List helpers: `buildPaginationParams`, `buildPaginationMeta`, `buildTextSearchWhere` from `../lib/list-query.js`
- Procedure tiers: `protectedProcedure` + `.use(hasPermission('email-crm@…'))`
- Client data: vanilla `trpcClient` + `@tanstack/react-query` (NO createTRPCReact hooks)
- CustomerContact.email already exists for inbound customer matching
- SalesOrder.outletId remains required on SO; conversation does not store outlet
- Public customer AI at `/api/ai/customer/chat` must NOT gain email-thread tools

## createListInputSchema usage

```ts
// packages/schemas/src/common.ts supports extra shape:
export const emailCrmListInputSchema = createListInputSchema({
  status: emailConversationStatusSchema.optional(),
  priority: emailConversationPrioritySchema.optional(),
  customerId: z.string().optional(),
});
// returns optional() schema — match how other routers pass input
```

## Inbound payload (must match worker.txt)

```json
{
  "from": "buyer@example.com",
  "to": "info@example.com",
  "subject": "…",
  "text": "…",
  "html": "…",
  "messageId": "<…>",
  "inReplyTo": "…",
  "references": "…",
  "date": "…",
  "rawSize": 1234
}
```

## Out of scope

- Cloudflare deploy
- Brevo/SMTP send
- Auto-reply without admin
- Attachments
- Outlet FK on conversation

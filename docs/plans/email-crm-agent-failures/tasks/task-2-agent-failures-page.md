### Task 2: Agent Failures page + route (frontend)

**Files:**
- Create: `apps/client/src/pages/email-crm/EmailCrmAgentFailuresPage.tsx`
- Modify: `apps/client/src/routes.tsx` (add route)
- Modify: `apps/client/src/locales/en.json` and `apps/client/src/locales/id.json` (i18n keys)

**Interfaces:**
- Consumes: `trpcClient.emailCrm.list.query({ agentStatus: 'FAILED', ... })`
- Produces: `EmailCrmAgentFailuresPage` component

**Frozen contract:**
- Resource: `email-crm`
- Permission: `email-crm@read`
- Router namespace: `trpcClient.emailCrm.list.query({ agentStatus: 'FAILED' })`
- i18n prefix: `emailCrm.agentFailures.*`

**Design law (FROZEN):** docs/design-system
**Tokens:** apps/client/src/index.css
**Motion:** apps/client/src/motion.ts
**UI craft owner:** Frontend Engineer + ui-ux-pro-max
**Design is FROZEN. No brainstorming / writing-plans / rediscovery. No design essay in this contract.**

**Steps:**
- [ ] Create `EmailCrmAgentFailuresPage.tsx` — a table showing conversations where `agentStatus === 'FAILED'`, with columns: email, subject, agentError (failure reason), lastMessageAt, and a "Retry" action button that calls `trpcClient.emailCrm.retryAgent.mutate()`
- [ ] Add route `/email-crm/agent-failures` in `routes.tsx`
- [ ] Add i18n keys under `emailCrm.agentFailures.*` in both `en.json` and `id.json`
- [ ] Run `bun run check-types` to verify

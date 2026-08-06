### Task 1: Agent Status filter (backend)

**Files:**
- Modify: `packages/schemas/src/email-crm.ts`
- Modify: `apps/server/src/routers/email-crm.ts`

**Interfaces:**
- Consumes: existing `emailCrmListInputSchema`, existing router `list` query
- Produces: `agentStatus` filter accepted by `trpcClient.emailCrm.list.query()`

**Frozen contract:**
- Resource: `email-crm`
- Permission: `email-crm@read` (reuse existing list permission)
- Schema path: `packages/schemas/src/email-crm.ts`
- Router path: `apps/server/src/routers/email-crm.ts`

**Steps:**
- [ ] Add `agentStatus` optional field to `emailCrmListInputSchema` (type: `z.enum(['IDLE', 'RUNNING', 'SENT', 'FAILED'])`)
- [ ] In the `list` query handler, add `...(input?.agentStatus ? { agentStatus: input.agentStatus } : {})` to the where object
- [ ] Run `bun run check-types` to verify

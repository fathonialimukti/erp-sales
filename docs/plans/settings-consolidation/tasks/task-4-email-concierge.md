### Task 4: Email concierge — stop reading `emailAgent.name`

**Files:**
- Modify: `apps/server/src/lib/email-concierge.ts`

**Interfaces:**
- Consumes: `getSettingValue` from `settings-service.ts`
- Produces: unchanged — concierge still signs replies with a fixed agent name

**Frozen contract:**
- Remove the `agentName` read: `const agentName = String(await getSettingValue(prisma, 'emailAgent.name')) || EMAIL_AGENT_NAME;`
- Keep `EMAIL_AGENT_NAME` constant (`process.env.EMAIL_AGENT_NAME || 'Andi'`) — this is now the **only** source of the agent name.
- In the system prompt, replace `${agentName}` with `${EMAIL_AGENT_NAME}` (or a local `const agentName = EMAIL_AGENT_NAME;` — your choice, keep it minimal).
- Keep `agentTitle` / `agentCompany` reads from `emailAgent.title` / `emailAgent.company` unchanged.
- Keep `maxThreadChars` read unchanged.

**Steps:**
- [ ] Step 1: Edit `apps/server/src/lib/email-concierge.ts` per contract.
- [ ] Step 2: Run `bun run check-types` at repo root.
- [ ] Step 3: Self-review — no `emailAgent.name` reference remains in this file.

**Note:** Do NOT touch `settings-service.ts` (separate task) or client files.

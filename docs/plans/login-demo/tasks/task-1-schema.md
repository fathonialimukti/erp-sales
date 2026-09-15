### Task 1: Auth Demo Schema (passwordless Option A)

**Files:**
- Create (or extend if exists): `packages/schemas/src/auth.ts`
- Modify: `packages/schemas/src/index.ts` (add export only, owned by this task)
- Test: `packages/schemas` typecheck via `bun run check-types` (no test runner ownership)

**Interfaces:**
- Consumes: none (Layer 1 root, from naming conventions)
- Produces: exact Zod schema names + inferred TS types for T2 router

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `packages/schemas/src/index.ts`
- Reference schema example in `packages/schemas/src/` (e.g. region/user if present, else any domain schema)

**Frozen contract:**
- Resource: `auth`
- Feature: `login-demo`, Option A passwordless one-click
- Procedures to support (T2 will implement): `trpcClient.auth.listDemoUsers`, `trpcClient.auth.demoLogin`
- Schemas to create:
  - `demoUserCapabilitySchema` — { permission: string, label?: string } (or reuse existing permission string pattern)
  - `demoUserSchema` — { id: string, email: string, name: string, role: string, capabilities: string[] }
  - `listDemoUsersOutputSchema` — array of demoUserSchema
  - `demoLoginInputSchema` — { userId: string } (NO password field, ULID)
  - `demoLoginOutputSchema` — { token/session shape matching existing login output — subagent to mirror existing auth pattern in its own context }
- Rules: IDs are ULID; `.js` import extensions; Zod only in schemas package
- Demo gating flag name to standardize: `DEMO_LOGIN_ENABLED` (boolean env) — schema does NOT read env, just document it for T2

**Steps:**
- [ ] Step 1: Define the 5 schemas above in `packages/schemas/src/auth.ts`
- [ ] Step 2: Export from `packages/schemas/src/index.ts` (single owner of this edit)
- [ ] Step 3: Self-review (no test run — quality-engineer owns tests)
- [ ] Step 4: Report back

**Report back (mandatory):**
End your report with a `## Produces` block listing exact export names, file paths, and inferred type names (e.g. `demoLoginInputSchema`, `DemoLoginInput`). Later-layer briefs copy this block verbatim into `Consumes:`.

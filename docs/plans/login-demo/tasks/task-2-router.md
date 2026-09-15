### Task 2: Auth Demo Router (passwordless Option A)

**Files:**
- Modify: `apps/server/src/routers/auth.ts` (extend existing router, do NOT rewrite login)
- Test: `apps/server/src/tests/auth-demo.test.ts` (write test file only — do NOT run, QE owns execution)
- Do NOT touch: `apps/server/src/router.ts` (owned by T3), schemas (owned by T1), client files

**Interfaces:**
- Consumes (verbatim from T1 ## Produces):
  - File: `packages/schemas/src/auth.ts` (re-exported via existing `export * from './auth'` in `packages/schemas/src/index.ts`)
  - Exports (schemas): `demoUserCapabilitySchema`, `demoUserSchema`, `listDemoUsersOutputSchema`, `demoLoginInputSchema`, `demoLoginOutputSchema`
  - Exports (types): `DemoUserCapability`, `DemoUser`, `ListDemoUsersOutput`, `DemoLoginInput`, `DemoLoginOutput`
  - Shapes: `demoUserCapabilitySchema` = `{ permission: string, label?: string }`; `demoUserSchema` = `{ id: ULID, email: string, name: string, role: string, capabilities: string[] }`; `listDemoUsersOutputSchema` = `demoUserSchema[]`; `demoLoginInputSchema` = `{ userId: ULID }` (no password); `demoLoginOutputSchema` = `{ user: { id, email, name, roles: [{ id, name, permissions: string[] }] }, tokenExpiresAt: number | null }` (mirrors existing `login` output)
  - Gate flag for T2: `DEMO_LOGIN_ENABLED` (boolean env, enforced in router, not schema)
- Produces: exact procedure names + input/output bindings for T3 register + T4 frontend

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/src/routers/auth.ts`
- `apps/server/src/routers/region.ts` (reference router pattern)
- `packages/schemas/src/auth.ts` (T1 output)

**Frozen contract:**
- Resource: `auth`
- Router namespace: `trpcClient.auth.listDemoUsers`, `trpcClient.auth.demoLogin`
- Procedures:
  - `listDemoUsers`: `public` procedure, `.output(listDemoUsersOutputSchema)`, no input. Returns seeded/demo users with id/email/name/role/capabilities. If `DEMO_LOGIN_ENABLED !== 'true'`, throw `TRPCError FORBIDDEN`.
  - `demoLogin`: `public` procedure, `.input(demoLoginInputSchema)`, `.output(demoLoginOutputSchema)`. Looks up user by userId, issues same session/cookie as existing `login` (mirror token creation + expiry logic), writes activity log via existing log helpers + `ctx.db` transaction pattern. If flag off → FORBIDDEN. If user not found → NOT_FOUND.
- Hard rules: imports use `.js`; Prisma via `../lib/prisma.js` / `ctx.db`; mutations write activity log (+ log-detail helpers); `hasPermission` NOT required for these two (public demo gate replaces it) — document why.
- Do NOT add password handling. Do NOT change existing `login`.

**Steps:**
- [ ] Step 1: Write failing test file `apps/server/src/tests/auth-demo.test.ts` (list returns users with capabilities; demoLogin returns same shape as login; flag-off → FORBIDDEN)
- [ ] Step 2: Implement the two procedures minimal, reusing existing login session + activity-log helpers
- [ ] Step 3: Self-review only (no test run)
- [ ] Step 4: Report back

**Report back (mandatory):**
End your report with a `## Produces` block listing exact procedure names, router file path, input/output schema bindings, permission/gating behavior, and activity-log writes. T3/T4 copy this verbatim into `Consumes:`.

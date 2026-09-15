### Task 6: Enable demo login env (follow-up — Demo login is turned off)

**Files:**
- Modify: `.env.example` (add demo flag template — owned by this task)
- Modify: local dev env file for server (locate in your own context, e.g. root `.env` or `apps/server/.env` — set flag true for local demo only, do NOT commit secrets)
- Do NOT touch: `apps/server/src/routers/auth.ts` (gate logic stays), schemas, client files, routes

**Interfaces:**
- Consumes (verbatim from T2 ## Produces):
  - Procedures: `auth.listDemoUsers`, `auth.demoLogin`
  - Gating: both throw `TRPCError FORBIDDEN` ("Demo login is disabled.") when `DEMO_LOGIN_ENABLED !== 'true'`
  - File: `apps/server/src/routers/auth.ts` — `assertDemoLoginEnabled()` lines ~46-50 is first statement in both procedures
- Produces: `DEMO_LOGIN_ENABLED=true` in dev/demo env + template entry so `listDemoUsers` returns users instead of FORBIDDEN

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/src/routers/auth.ts` (gate helper only)
- `.env.example` + actual dev env file(s) + `apps/server/.env` if present

**Frozen contract:**
- Resource: `auth`
- Var: `DEMO_LOGIN_ENABLED=true` for local dev/demo ONLY. Comment in `.env.example`: demo-only, never enable in production with real data (endpoints are `public` by design).
- Do NOT change router gating logic, permission strings, or activity logging. Env wiring only.
- Do NOT commit real secrets. `.env.example` gets `DEMO_LOGIN_ENABLED=true` + warning comment; local `.env` gets the flag enabled for demo.
- Note the dev-server restart requirement in your report (env changes need restart).

**Steps:**
- [ ] Step 1: Add template entry to `.env.example` with prod warning
- [ ] Step 2: Set flag true in local dev env file(s)
- [ ] Step 3: Self-review (no test run — quality-engineer owns tests)
- [ ] Step 4: Report back

**Report back (mandatory):**
End with `## Produces` listing exact files modified, exact lines added (var name + value + comment), which env file enables local demo, and restart instruction. Later tasks copy this verbatim if needed.

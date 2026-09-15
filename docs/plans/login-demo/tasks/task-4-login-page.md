### Task 4: Login Page Redesign (passwordless Option A)

**Files:**
- Modify: `apps/client/src/pages/auth/LoginPage.tsx` (login page — if path differs in your context, use the actual login route file and report the real path; do NOT create a second login page)
- Create: `apps/client/src/pages/auth/DemoUserCard.tsx` (user card with capabilities, single responsibility)
- Do NOT touch: `apps/client/src/locales/en.json`, `id.json` (owned by T5), `apps/client/src/routes.tsx` (owned by T6), server/schemas

**Interfaces:**
- Consumes (verbatim from T2 ## Produces):
  - Procedures: `auth.listDemoUsers`, `auth.demoLogin` (`trpcClient.auth.listDemoUsers`, `trpcClient.auth.demoLogin`)
  - File: `apps/server/src/routers/auth.ts` (extended `authRouter`; already registered as `auth:` in `apps/server/src/router.ts` — no T3 change needed for these two)
  - Bindings: `listDemoUsers` = `publicProcedure.output(listDemoUsersOutputSchema)`, no input; `demoLogin` = `publicProcedure.input(demoLoginInputSchema).output(demoLoginOutputSchema)` — all schemas imported verbatim from `@repo/schemas/auth`
  - Gating: both throw `TRPCError FORBIDDEN` when `DEMO_LOGIN_ENABLED !== 'true'`; `demoLogin` throws `NOT_FOUND` for unknown `userId`; no `hasPermission()` on either (public demo gate replaces it); no password handling
  - Activity-log writes: `demoLogin` → LOGIN log; unknown-user → WARN log; `listDemoUsers` no log
- Produces: final login UX + component prop signatures for T6 routes + keys needed from T5

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- Actual login page + auth hook/client (`trpcClient` usage) in `apps/client/src/`
- Reference pages: `apps/client/src/pages/Region*.tsx`
- Design law (FROZEN): `docs/design-system/DESIGN.md`, Tokens: `apps/client/src/index.css`, Motion: `apps/client/src/lib/motion.ts`

**Frozen contract:**
- UX Option A passwordless: NO password field anywhere. Page shows list of available demo users via `trpcClient.auth.listDemoUsers.query()` in `queryFn`, each card shows name/email/role + capabilities chips, Select → `trpcClient.auth.demoLogin.mutate({ userId })` → existing session handling/redirect (mirror existing login success path). Loading / empty / FORBIDDEN-disabled / NOT_FOUND states required.
- Client rules: tRPC vanilla only (`trpcClient.*` in `queryFn`), functional components, semantic Tailwind tokens (no raw hex, no gray text), all strings via `intl.formatMessage` (use `auth.*` / `login.*` / `demo.*` keys — T5 owns the JSON, you declare the keys you need).
- UI craft owner: frontend-engineer + ui-ux-pro-max. Design is FROZEN, no brainstorming.

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Step 1: Replace login form with demo user list + cards (vanilla tRPC)
- [ ] Step 2: Wire select → demoLogin → existing post-login redirect/session
- [ ] Step 3: Empty/error/disabled states
- [ ] Step 4: Self-review only (no test run)

**Report back (mandatory):**
End with `## Produces` listing exact files touched/created, component names + prop signatures, trpc namespaces called, i18n keys required (for T5/T6 to consume), and post-login redirect behavior.

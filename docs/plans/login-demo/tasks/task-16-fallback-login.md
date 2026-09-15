### Task 16: Fallback to email+password login when demo disabled

**Files:**
- Modify: `apps/client/src/pages/LoginPage.tsx` (branch demo vs legacy — owned by this task)
- Modify: `apps/client/src/lib/useAuth.ts` ONLY if `login()` wrapper needs re-activation (it exists but is currently unreachable — reuse, do not reinvent)
- Create (only if needed): `apps/client/src/pages/auth/LegacyLoginForm.tsx` (isolate legacy form; else inline in LoginPage)
- Do NOT touch: `DemoUserCard.tsx` (unchanged), locales JSON (T17 owns), server, schemas, routes

**Interfaces:**
- Consumes:
  - Demo path (flag on): `trpcClient.auth.listDemoUsers.query()` in queryFn + `trpcClient.auth.demoLogin.mutate({userId})` via `useAuth.demoLogin` → `/dashboard` (existing, keep).
  - Legacy path (flag off): existing server `login` procedure (untouched, password-based) via `useAuth.login` (existing wrapper, currently unreachable per QE) → same session atoms + `/dashboard` redirect.
  - Disabled signal: `listDemoUsers` throws `FORBIDDEN` (`Demo login is disabled.`) when `DEMO_LOGIN_ENABLED!=='true'` — use this as the branch trigger (do NOT add new env plumbing to client).
- Produces: branch behavior + keys required (T17).

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/client/src/pages/LoginPage.tsx`, `apps/client/src/pages/auth/DemoUserCard.tsx`, `apps/client/src/lib/useAuth.ts`
- git history or prior version of login form for the legacy email+password fields (locate in your own context — the password-form imports Input/Label/Checkbox were removed in T4; restore the pattern)

**Frozen contract:**
- Branch: `listDemoUsers` success → demo picker (current UX, unchanged). `listDemoUsers` FORBIDDEN → render regular email+password form (email + password + rememberMe + sign-in button + error banner), submitting via `useAuth.login` → toast + `navigate("/dashboard")`. Other list errors (network/generic) keep existing error-retry banner (do NOT show legacy form for those — only FORBIDDEN triggers fallback).
- Legacy form rules: functional component, semantic tokens, `intl.formatMessage`, min 44px CTA, password input `type="password"` + autocomplete, error mapping (invalid credentials → `login.errors.*`, forbidden stays demo-only).
- Keep demo card UX (summaries + expandable) untouched. No new routes. No server changes.

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Branch on FORBIDDEN → legacy form (reuse login wrapper/session handling)
- [ ] Restore email+password fields + validation + errors
- [ ] Keep demo path pixel-identical
- [ ] Self-review, no tests

**Report back (mandatory):** End with `## Produces`: files touched, branch condition, login() reuse notes, i18n keys required (for T17), redirect behavior both paths.

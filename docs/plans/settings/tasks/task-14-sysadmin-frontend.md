### Task 14: Sys admin sees "no permission" on /settings (frontend gate fix)

**Files:**
- Modify: `apps/client/src/pages/settings/AppSettingsPage.tsx` and/or shared gate (`RequirePermission` / permission hook / `authUserAtom` selector — subagent to resolve exact gate file via glob, minimal change, single gate file + page only)
- Modify (only if gate fix requires): `apps/client/src/routes.tsx` `/settings` gate `['settings@read','settings@app@read','settings@user@read']`
- DO NOT touch: `apps/server/**`, `packages/schemas/**`, locales (keys frozen)

**Interfaces:**
- Consumes (verbatim from T11 frontend + T12 backend + QE):
  - Route `/settings` → `AppSettingsPage`, gate `['settings@read','settings@app@read','settings@user@read']` ANY-semantics (`.some()`), page-level `settings@app@read` / `settings@app@update` gates.
  - Route `/setting` → `UserSettingsPage`, auth-only, NO gate (working, do NOT regress).
  - Backend: `settings.get`=`settings@read`, `getApp`=`settings@app@read`, `update`=`settings@update`, `updateApp`=`settings@app@update` (all KEPT); sys admin must pass all (see T13 parallel task — same root cause, frontend must honor the same all-access flag).
  - Bug: sys-admin user (has-all-permissions) sees deny card / "you do not have permission" on `/settings`. QE nit: page calls `useAppSettings()` unconditionally, firing one wasted FORBIDDEN before deny card.
- Produces: gate files changed, sys-admin bypass logic, `/settings` gating after fix.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/settings/PLAN.md`
- `apps/client/src/pages/settings/AppSettingsPage.tsx`
- `apps/client/src/routes.tsx`
- gate itself (`RequirePermission` + permission hook / `authUserAtom` — resolve via glob) + `apps/client/src/constants/nav-menu.ts`

**Frozen contract:**
- Resource: `settings` (`app.*` admin vs `user.*` per-user). Routes: `/settings`=app-only, `/setting`=user standalone (do NOT re-split, do NOT rename routes).
- Rule: sys admin (same all-access flag T13 fixes on backend) MUST pass frontend gates. Fix the CHECK, not the strings — keep `settings@app@read/@update`, `settings@read` strings as-is. `/setting` stays auth-only.
- Design law (FROZEN): docs/design-system
- Tokens: apps/client/src/index.css
- Motion: apps/client/src/lib/motion.ts
- UI craft owner: frontend-engineer + ui-ux-pro-max
- Client rules: tRPC vanilla only, semantic tokens (no raw hex, no gray text), functional components, strings via `intl.formatMessage`. No visual redesign — gate fix only (+ `enabled: canRead`-style guard to kill the wasted FORBIDDEN query if trivial).

**Steps:**
- [ ] Step 1: Repro — sys-admin auth state vs `RequirePermission` / `canRead` evaluation → find why all-access flag is ignored.
- [ ] Step 2: Minimal fix — honor the codebase's existing all-access signal (wildcard `*` / admin flag / role — reuse, do NOT invent a second system) in gate + page-level checks.
- [ ] Step 3: `bun run check-types` client scope, self-review. DO NOT run vitest/playwright.

**Report back (mandatory):**
End with `## Produces` listing exact gate file(s) + function, bypass logic (1 line), `/settings` gating after fix, nav gating if changed, tests/pages verified.

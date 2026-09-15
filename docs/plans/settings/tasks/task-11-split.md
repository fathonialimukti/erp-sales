### Task 11: Split Settings into 2 individual pages

**Files:**
- Modify: `apps/client/src/pages/settings/AppSettingsPage.tsx` (revert to app-only, like before — remove any User Settings tab/section/block)
- Modify: `apps/client/src/pages/settings/UserSettingsPage.tsx` (ensure standalone, no dependency on combined layout)
- Modify: `apps/client/src/pages/settings/SettingsLayout.tsx` (strip combining logic — app-only or deprecated; subagent decides, must not break /settings)
- Modify: `apps/client/src/routes.tsx` (ensure 2 individual routes: `/settings` → App Settings, `/setting` → User Settings)
- Modify: `apps/client/src/locales/en.json` + `apps/client/src/locales/id.json` ONLY if keys missing (preserve `settings.*` keys, do not rename)
- DO NOT touch: `apps/server/**`, `packages/schemas/**`

**Interfaces:**
- Consumes: `trpcClient.settings.*` existing procedures (app.* admin + user.<userId>.* per-user) — signatures unchanged from T2/T4. No new backend contract.
- Produces: exact route paths + page component names + any i18n keys touched (for QE + backend task).

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/settings/PLAN.md` (Taxonomy + Storage Model are FROZEN)
- `apps/client/src/pages/settings/*` (current combined implementation)
- `apps/client/src/routes.tsx`
- `apps/client/src/lib/hooks/useSettings.ts`

**Frozen contract:**
- Resource: `settings` (key-value, namespace `app.*` admin vs `user.<userId>.*` per-user, `Setting` model unique(key, userId))
- Routes: `/settings` = App Settings ONLY (like before). `/setting` (singular) = User Settings ONLY standalone.
- Permission (frontend): `/settings` keeps existing permission gate as-is. `/setting` requires auth ONLY — NO permission gate (open without permission).
- Router namespace: `trpcClient.settings.*` — unchanged, do not rewire.
- i18n prefix: `settings.*` — preserve, do not rename.
- Design law (FROZEN): docs/design-system
- Tokens: apps/client/src/index.css
- Motion: apps/client/src/lib/motion.ts
- UI craft owner: frontend-engineer + ui-ux-pro-max
- Design is FROZEN. No brainstorming / rediscovery. Client: tRPC vanilla only (`trpcClient.*` in `queryFn`), semantic Tailwind tokens (no raw hex, no gray text), functional components, all strings via `intl.formatMessage`.

**Steps:**
- [ ] Step 1: Ensure `/settings` renders App Settings only (General/Appearance/Notifications/Security org-level), like before.
- [ ] Step 2: Ensure `/setting` renders User Settings standalone (Profile/Preferences/Notifications/Security per-user), auth-only, no permission check.
- [ ] Step 3: Fix `routes.tsx` + nav entries for 2 individual routes. Remove combined tabs.
- [ ] Step 4: Run `bun run check-types` for client scope, self-review. DO NOT run vitest/playwright (quality-engineer owns tests).

**Report back (mandatory):**
End report with a `## Produces` block listing exact page component paths, route paths (`/settings`, `/setting`), auth vs permission gating per route, and i18n keys touched. Later tasks copy this verbatim.

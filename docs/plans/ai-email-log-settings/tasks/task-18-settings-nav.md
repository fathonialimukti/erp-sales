### Task 18: Settings navigation — make the SMTP/app-settings page reachable again

**Problem (discovered by T17):** the SMTP configuration form lives in `apps/client/src/pages/settings/AppSettingsPage.tsx` on route **`/settings`**. But:
- T3 removed the entire `nav.settings` group from the sidebar (both `/setting` and `/settings`).
- The user modal's Settings item navigates to **`/setting`** = `UserSettingsPage` (**personal** settings), not the app settings page.

**Net effect:** the page where SMTP host/port/encryption/key live is now **unreachable from the UI** — only via a hand-typed URL. The user asked to configure SMTP "according to settings" and could not find it. This is a regression introduced by T3.

**Files:**
- Modify: the user modal (`apps/client/src/components/UserAvatarMenu.tsx`) — add a distinct entry for app/system settings
- Modify: `apps/client/src/components/Sidebar.tsx` (admin section filter + `HREF_MODULE`) if needed so the app-settings page resolves nav metadata (breadcrumb/title)
- Modify: `apps/client/src/constants/nav-menu.ts` if a hidden/utility nav entry is wanted for breadcrumb metadata
- Modify: `apps/client/src/locales/en.json` + `id.json` for any new label
- Test: extend `apps/client/src/components/UserMenuSettings.test.tsx`

**Interfaces:**
- Consumes: T3 — modal order is Profile → Settings (`/setting`) → separator → Logout; `user.menu.settings` label reused. T17 — SMTP form is on `/settings` (`AppSettingsPage`), read `settings@read`, write `settings@update`
- Produces: reachable nav path to `/settings`, final modal order, i18n keys

**Reads (in your own context):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-18-settings-nav.md`)
- `apps/client/src/pages/Region*.tsx` (patterns only)
- `apps/client/src/components/UserAvatarMenu.tsx`, `Sidebar.tsx`, `constants/nav-menu.ts`, `apps/client/src/routes.tsx`

**Frozen contract:**
- **Keep BOTH destinations distinct and reachable:**
  - `/setting` = personal settings (Profile-adjacent)
  - `/settings` = app/system settings (SMTP lives here)
- Sidebar must stay Settings-free (T3's removal stands — do not re-add it to the sidebar).
- The app-settings entry must be **permission-gated on `settings@read`** (hide entirely if the user lacks it — follow the existing permission-gate pattern).
- Target modal order: Profile → Settings (personal, `/setting`) → App settings (system, `/settings`) → separator → Logout. If a different grouping is clearly better for the design system, propose it, but both destinations must be reachable.
- Client rules: tRPC vanilla only, semantic Tailwind tokens (no raw hex, no gray text), functional components, all strings via `intl.formatMessage` (add keys to both locales).
- Do NOT touch the SMTP form itself (T17 owns it).

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Step 1: Confirm in-context that `AppSettingsPage` is on `/settings` and that SMTP fields are inside it; confirm `/setting` is `UserSettingsPage`. Report the exact route→component mapping.
- [ ] Step 2: Add a permission-gated app/system settings entry to the user modal pointing at `/settings`, labelled distinctly from personal Settings. Reuse existing i18n keys where possible; add new ones to BOTH locales if needed.
- [ ] Step 3: Restore nav metadata for `/settings` (breadcrumb title / module) so the Topbar doesn't fall back to a generic title — via a hidden/utility entry or an explicit meta lookup, WITHOUT showing it in the sidebar.
- [ ] Step 4: Keep a11y + keyboard order + focus behavior correct; no regression to T3's verified Profile → Settings → Logout flow.
- [ ] Step 5: `bun run check-types` scoped to `apps/client`. Write tests (extend `UserMenuSettings.test.tsx`); do NOT run the full suite.
- [ ] Step 6: Self-review — sidebar still Settings-free, both routes reachable, no dead imports.

**Report back (mandatory):**
End with `## Produces`:
- Exact route→component mapping confirmed
- Files changed + final modal item order
- Permission gate used (`settings@read`) and behavior when denied
- New i18n keys added (both locales)
- How a user now reaches the SMTP config page (click path, step by step)
- Test file + names + exact run command (from `apps/client`)
- Any remaining navigation gap
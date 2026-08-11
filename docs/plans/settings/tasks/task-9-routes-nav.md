# Task 9: Routes + nav + avatar menu

**Files:**
- Modify: `apps/client/src/routes.tsx` (add lazy imports + route entries)
- Modify: `apps/client/src/constants/nav-menu.ts` (add nav entries)
- Modify: `apps/client/src/components/Sidebar.tsx` (add hrefs to section arrays — TWO-GATE RULE)
- Modify: `apps/client/src/components/UserAvatarMenu.tsx` (Settings item → `/settings`)

**Interfaces:**
- Consumes: `SettingsPage` (T5), `AppSettingsPage` (T6), `settings` module color (T7), `nav.settings*` i18n keys (T8).
- Produces: navigable routes + menu entries.

## Frozen contract

### routes.tsx
```ts
const SettingsPage = lazyNamed(() => import('./pages/settings/SettingsPage'), 'SettingsPage');
const AppSettingsPage = lazyNamed(() => import('./pages/settings/AppSettingsPage'), 'AppSettingsPage');
```
Add under the protected `PrivateLayout` children (kebab-case URLs):
```tsx
{
  path: 'settings',
  children: [
    { index: true, element: <SettingsPage /> },
    { path: 'app', element: <AppSettingsPage /> },
  ],
},
```

### nav-menu.ts
Add to `NAV_MENU` (top-level, after `nav.ai_admin` or in a logical spot):
```ts
{
  name: "nav.settings",
  icon: icons.navSettings,   // add a settings icon to apps/client/src/assets/icons.ts if none exists
  children: [
    { name: "nav.settings_personal", icon: icons.navSettings, href: "/settings" },
    { name: "nav.settings_app", icon: icons.navSettings, href: "/settings/app", permission: "settings@read" },
  ],
},
```
- If `icons.navSettings` doesn't exist, add it to `apps/client/src/assets/icons.ts` (match existing icon style).

### Sidebar.tsx — TWO-GATE RULE (CRITICAL)
- Add `'/settings'` and `'/settings/app'` to the **admin section array** (the hardcoded href arrays that re-filter leaves). Without this, the nav entries silently vanish even with correct permissions.
- Add `'/settings': 'settings'` to `HREF_MODULE` (already done in T7 — verify).

### UserAvatarMenu.tsx
- Change `handleSettings` from `navigate("/users")` to `navigate("/settings")`.
- Keep the Settings item visible to all authenticated users (personal settings are self-scoped).
- Add missing `user.menu.*` keys to BOTH `apps/client/src/locales/en.json` + `id.json` (the component references `user.menu.label`, `user.menu.profile`, `user.menu.settings` with defaultMessage fallbacks — add real keys for proper i18n):
  - `user.menu.label`: "User menu" / "Menu pengguna"
  - `user.menu.profile`: "Profile" / "Profil"
  - `user.menu.settings`: "Settings" / "Pengaturan"

**Steps:**
- [ ] Add routes
- [ ] Add nav entries + icon
- [ ] Add hrefs to Sidebar section arrays
- [ ] Fix avatar menu settings link
- [ ] `bunx tsc --noEmit` in apps/client

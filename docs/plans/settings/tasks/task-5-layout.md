### Task 5: Settings Layout

**Files:**
- Create: `apps/client/src/pages/settings/SettingsLayout.tsx`

**Interfaces:**
- Consumes: route definitions (T9), i18n keys (T8)
- Produces: layout component with sidebar nav for App Settings and User Settings

**Reads (in your own context):**
- `apps/client/src/pages/RegionIndexPage.tsx` (reference for page structure)
- `docs/design-system/DESIGN.md` (design law)
- `apps/client/src/index.css` (tokens)
- `AGENTS.md`

**Frozen contract:**
- Functional component, named export `SettingsLayout`
- Sidebar navigation with two items: "App Settings" and "User Settings"
- Uses semantic Tailwind tokens only (no raw hex, no gray text)
- All user-visible strings via `intl.formatMessage` with `settings.*` i18n keys
- Uses react-router `NavLink` or `Outlet` for nested routing
- `settings.layout.title`, `settings.nav.appSettings`, `settings.nav.userSettings` i18n keys

**Steps:**
- [ ] Write layout component with sidebar nav + Outlet
- [ ] Wire up nav links to `/settings/app` and `/settings/user`
- [ ] Apply design system tokens
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing exact component name and i18n keys used.

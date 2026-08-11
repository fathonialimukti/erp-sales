### Task 8: Routes + nav — rename `/settings/app` → `/settings/app-settings`

**Files:**
- Modify: `apps/client/src/routes.tsx`
- Modify: `apps/client/src/constants/nav-menu.ts`
- Modify: `apps/client/src/components/Sidebar.tsx`

**Interfaces:**
- Consumes: nothing (pure path rename)
- Produces: app settings reachable at `/settings/app-settings`

**Frozen contract:**
- `routes.tsx`: change `{ path: 'app', element: <AppSettingsPage /> }` → `{ path: 'app-settings', element: <AppSettingsPage /> }`.
- `nav-menu.ts`: change `href: "/settings/app"` → `href: "/settings/app-settings"`.
- `Sidebar.tsx`: change `"/settings/app"` in the admin-section href list → `"/settings/app-settings"`.
- Do NOT change the `/settings` personal-settings route or any other route.

**Steps:**
- [ ] Step 1: Edit `routes.tsx`, `nav-menu.ts`, `Sidebar.tsx` per contract.
- [ ] Step 2: Run `bun run check-types` at repo root.
- [ ] Step 3: Self-review — grep for `/settings/app` (exact, not `/settings/app-settings`) to confirm no stale references remain.

**Note:** Do NOT touch the page component or locale files — separate tasks.

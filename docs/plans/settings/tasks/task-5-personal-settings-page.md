# Task 5: Personal settings page

**Files:**
- Create: `apps/client/src/pages/settings/SettingsPage.tsx`

**Interfaces:**
- Consumes: `trpcClient.userSettings.get/update` (T3), `userSettingsSchema` types (T1), `useToast`, `PageHeader`, `useMeta`, `useIntl`, `useAtomValue`/`useSetAtom` (jotai), `localeActionsAtom` + `persistLocale` (client locale), `themeModeAtom` (client theme).
- Produces: `SettingsPage` named export — consumed by T9 routes.

## Frozen contract

### Page
- Route: `/settings` (personal). Named export `SettingsPage`.
- `useMeta` title/description from `settings.personal.*` i18n keys.
- `PageHeader` with `module="settings"`, title `settings.personal.title`, subtitle `settings.personal.subtitle`.
- Sections (cards, `bg-card` opaque per design law):
  1. **Profile** — read-only display of `authUserAtom` (name, email, roleName). No edit here (user management owns that).
  2. **Preferences** — form fields:
     - Locale: select `en`/`id` (labels from `localeLabels` in `lib/locale.ts`). On save: call `userSettings.update`, then `localeActionsAtom` + `persistLocale`.
     - Theme: select `light`/`dark`. On save: call `userSettings.update`, then set `themeModeAtom`.
     - Default page size: number input (5-100).
     - Timezone: text input (IANA name).
  3. **Notifications** — toggles: in-app, email digest.
  4. **Email signature** — textarea (max 2000 chars).
  5. **Default filters** — region/area selects (optional; use `trpcClient.region.list` / `area.list` if available, else text inputs).
- Load via `useQuery({ queryKey: ['userSettings'], queryFn: () => trpcClient.userSettings.get.query() })`.
- Save via `useMutation` → `trpcClient.userSettings.update.mutate(patch)` → toast `settings.personal.saved` → invalidate `['userSettings']`.
- Form state initialized from loaded settings; dirty tracking; Save button disabled when pristine.
- Design law: opaque `bg-card`, no backdrop-blur, black data text, `font-normal` body, module color `settings` for header/icon plates. Use `ui-ux-pro-max` for layout craft.

**Steps:**
- [ ] Create SettingsPage.tsx with all sections
- [ ] Wire locale/theme persistence
- [ ] `bunx tsc --noEmit` in apps/client

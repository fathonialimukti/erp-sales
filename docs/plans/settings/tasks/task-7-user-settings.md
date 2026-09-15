### Task 7: User Settings Page

**Files:**
- Create: `apps/client/src/pages/settings/UserSettingsPage.tsx`

**Interfaces:**
- Consumes: `useUserSettings()`, `useUpdateUserSettings()` hooks (T4), `settings.*` i18n keys (T8)
- Produces: `UserSettingsPage` component

**Reads (in your own context):**
- `apps/client/src/pages/Region*.tsx` (reference pages for form patterns)
- `docs/design-system/DESIGN.md` (design law)
- `apps/client/src/index.css` (tokens)
- `AGENTS.md`

**Frozen contract:**
- Functional component, named export `UserSettingsPage`
- Sections: Profile, Preferences, Notifications, Security
- Form fields map exactly to user settings schema (displayName, avatarUrl, email (read-only), phone, bio, themeOverride, languageOverride, timezone, dateFormat, currency, tableDensity, emailNotifications, pushNotifications, inAppNotifications, digestFrequency, mutedCategories, twoFactorEnabled)
- All user-visible strings via `intl.formatMessage` with `settings.user.*` i18n keys
- Semantic Tailwind tokens only
- Submit calls `updateUserSettings.mutate()`
- Loading/error states handled

**Steps:**
- [ ] Write page with all 4 sections and form fields
- [ ] Wire up hooks for data + mutation
- [ ] Apply design system tokens
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing exact component name and i18n keys used.

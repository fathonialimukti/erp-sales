### Task 6: App Settings Page

**Files:**
- Create: `apps/client/src/pages/settings/AppSettingsPage.tsx`

**Interfaces:**
- Consumes: `useAppSettings()`, `useUpdateAppSettings()` hooks (T4), `settings.*` i18n keys (T8)
- Produces: `AppSettingsPage` component

**Reads (in your own context):**
- `apps/client/src/pages/Region*.tsx` (reference pages for form patterns)
- `docs/design-system/DESIGN.md` (design law)
- `apps/client/src/index.css` (tokens)
- `AGENTS.md`

**Frozen contract:**
- Functional component, named export `AppSettingsPage`
- Sections: General, Appearance, Notifications, Security
- Form fields map exactly to app settings schema (companyName, logoUrl, defaultLanguage, timezone, dateFormat, numberFormat, defaultCurrency, defaultTheme, accentColor, sidebarCollapsed, emailNotifications, defaultNotificationFrequency, announcement, sessionTimeout, minPasswordLength, enforceTwoFactor, allowedLoginMethods)
- All user-visible strings via `intl.formatMessage` with `settings.app.*` i18n keys
- Semantic Tailwind tokens only
- Submit calls `updateAppSettings.mutate()`
- Loading/error states handled

**Steps:**
- [ ] Write page with all 4 sections and form fields
- [ ] Wire up hooks for data + mutation
- [ ] Apply design system tokens
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing exact component name and i18n keys used.

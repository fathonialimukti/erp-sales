# Settings Feature Plan

## Taxonomy

### App Settings (organization-level, admin-controlled)
- General: companyName, logoUrl, defaultLanguage, timezone, dateFormat, numberFormat, defaultCurrency
- Appearance: defaultTheme (light/dark/system), accentColor, sidebarCollapsed
- Notifications: emailNotifications (bool), defaultNotificationFrequency, announcement
- Security: sessionTimeout (minutes), minPasswordLength, enforceTwoFactor, allowedLoginMethods

### User Settings (individual preferences, per-user)
- Profile: displayName, avatarUrl, email (read-only), phone, bio
- Preferences: themeOverride, languageOverride, timezone, dateFormat, currency, tableDensity
- Notifications: emailNotifications, pushNotifications, inAppNotifications, digestFrequency, mutedCategories
- Security: twoFactorEnabled

## Storage Model
Key-value with namespace: `app.*` (admin) vs `user.<userId>.*` (per-user). Stored in `Setting` Prisma model with unique(key, userId).

## Task DAG

```
T1: Schema        (packages/schemas/src/settings.ts)
  ↓
T2: Router        (apps/server/src/routers/settings.ts)
  ↓
T3: Register      (apps/server/src/router.ts)
  ↓
T4: Client hooks  (apps/client/src/lib/hooks/useSettings.ts)
  ├───────────────┐
T5: Layout        (apps/client/src/pages/settings/SettingsLayout.tsx)
T6: AppSettings   (apps/client/src/pages/settings/AppSettingsPage.tsx)
T7: UserSettings  (apps/client/src/pages/settings/UserSettingsPage.tsx)
T8: i18n          (en.json + id.json)
  ├───────────────┘
T9: Routes        (apps/client/src/routes.tsx)
  ↓
T10: Tests        (server + client)
```

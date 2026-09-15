### Task 8: i18n Keys

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Interfaces:**
- Consumes: nothing (foundational)
- Produces: all `settings.*` i18n keys in English and Indonesian

**Reads (in your own context):**
- `apps/client/src/locales/en.json` (current state — see existing key patterns)
- `AGENTS.md`

**Frozen contract:**
i18n prefix: `settings.*`

Required keys (English):
```
settings.pageTitle = "Settings"
settings.layout.title = "Settings"
settings.nav.appSettings = "App Settings"
settings.nav.userSettings = "User Settings"

settings.app.title = "App Settings"
settings.app.section.general = "General"
settings.app.section.appearance = "Appearance"
settings.app.section.notifications = "Notifications"
settings.app.section.security = "Security"
settings.app.field.companyName = "Company Name"
settings.app.field.logoUrl = "Logo URL"
settings.app.field.defaultLanguage = "Default Language"
settings.app.field.timezone = "Timezone"
settings.app.field.dateFormat = "Date Format"
settings.app.field.numberFormat = "Number Format"
settings.app.field.defaultCurrency = "Default Currency"
settings.app.field.defaultTheme = "Default Theme"
settings.app.field.accentColor = "Accent Color"
settings.app.field.sidebarCollapsed = "Sidebar Collapsed by Default"
settings.app.field.emailNotifications = "Email Notifications"
settings.app.field.defaultNotificationFrequency = "Notification Frequency"
settings.app.field.announcement = "System Announcement"
settings.app.field.sessionTimeout = "Session Timeout (minutes)"
settings.app.field.minPasswordLength = "Minimum Password Length"
settings.app.field.enforceTwoFactor = "Enforce Two-Factor Authentication"
settings.app.field.allowedLoginMethods = "Allowed Login Methods"

settings.user.title = "User Settings"
settings.user.section.profile = "Profile"
settings.user.section.preferences = "Preferences"
settings.user.section.notifications = "Notifications"
settings.user.section.security = "Security"
settings.user.field.displayName = "Display Name"
settings.user.field.avatarUrl = "Avatar URL"
settings.user.field.email = "Email"
settings.user.field.phone = "Phone"
settings.user.field.bio = "Bio"
settings.user.field.themeOverride = "Theme"
settings.user.field.languageOverride = "Language"
settings.user.field.timezone = "Timezone"
settings.user.field.dateFormat = "Date Format"
settings.user.field.currency = "Currency"
settings.user.field.tableDensity = "Table Density"
settings.user.field.emailNotifications = "Email Notifications"
settings.user.field.pushNotifications = "Push Notifications"
settings.user.field.inAppNotifications = "In-App Notifications"
settings.user.field.digestFrequency = "Digest Frequency"
settings.user.field.mutedCategories = "Muted Categories"
settings.user.field.twoFactorEnabled = "Two-Factor Authentication"

settings.save = "Save Settings"
settings.saving = "Saving..."
settings.saved = "Settings saved successfully"
settings.saveFailed = "Failed to save settings"
settings.loading = "Loading..."
```

Indonesian (id.json): translate all values to Bahasa Indonesia.

**Steps:**
- [ ] Add all keys to en.json under `settings.*` namespace
- [ ] Add all keys to id.json with Indonesian translations
- [ ] Ensure no duplicate keys exist
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing both locale files modified and total key count.

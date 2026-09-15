### Task 1: Settings Schema

**Files:**
- Create: `packages/schemas/src/settings.ts`
- Modify: `packages/schemas/src/index.ts`

**Interfaces:**
- Consumes: nothing (foundational)
- Produces: `AppSettingsSchema`, `UpdateAppSettingsSchema`, `UserSettingsSchema`, `UpdateUserSettingsSchema`, exported from `@repo/schemas`

**Reads (in your own context):**
- `packages/schemas/src/region.ts` (reference for schema patterns)
- `AGENTS.md`

**Frozen contract:**
- Resource: `settings`
- App settings fields: `companyName: string`, `logoUrl: string|null`, `defaultLanguage: enum(en|id)`, `timezone: string`, `dateFormat: string`, `numberFormat: string`, `defaultCurrency: string`, `defaultTheme: enum(light|dark|system)`, `accentColor: string`, `sidebarCollapsed: bool`, `emailNotifications: bool`, `defaultNotificationFrequency: enum(realtime|daily|weekly)`, `announcement: string|null`, `sessionTimeout: int(min 5, max 1440)`, `minPasswordLength: int(min 8, max 128)`, `enforceTwoFactor: bool`, `allowedLoginMethods: array`
- User settings fields: `displayName: string`, `avatarUrl: string|null`, `email: string (read-only)`, `phone: string|null`, `bio: string|null`, `themeOverride: enum(light|dark|system|null)`, `languageOverride: enum(en|id|null)`, `timezone: string|null`, `dateFormat: string|null`, `currency: string|null`, `tableDensity: enum(compact|comfortable)`, `emailNotifications: bool`, `pushNotifications: bool`, `inAppNotifications: bool`, `digestFrequency: enum(realtime|daily|weekly)`, `mutedCategories: array`, `twoFactorEnabled: bool`
- All update schemas are partial (Partial<T>) — every field optional

**Steps:**
- [ ] Write Zod schemas for AppSettings and UserSettings with the exact fields above
- [ ] Write UpdateAppSettingsSchema = AppSettingsSchema.partial() and UpdateUserSettingsSchema = UserSettingsSchema.partial()
- [ ] Export all from `packages/schemas/src/index.ts`
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing exact export names and types.

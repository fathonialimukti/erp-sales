import * as z from 'zod';

// App settings — typed per group. Secrets are write-only.
export const appSettingsSchema = z.object({
  ai: z.object({
    baseUrl: z.string().url().or(z.literal('')).optional(),
    apiKey: z.string().optional(), // write-only: empty = keep existing
    model: z.string().optional(),
    multimodalEnabled: z.boolean().optional(),
    // Rate limit (requests per minute) for the shared API key. Requests queue
    // instead of being rejected; unset = unlimited.
    globalRpm: z.number().int().min(1).max(600).nullable().optional(),
    embeddingBaseUrl: z.string().url().or(z.literal('')).optional(),
    embeddingApiKey: z.string().optional(), // write-only: empty = keep existing
    embeddingModel: z.string().optional(),
    embeddingDimensions: z.number().int().positive().optional(),
  }),
  smtp: z.object({
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    // Explicit transport encryption. 'ssl'/'tls' = implicit TLS (e.g. 465),
    // 'starttls' = upgrade on the plain port (587/2525), 'none' = plain.
    // Unset = infer from the port (465 → ssl, otherwise starttls).
    secure: z.enum(['none', 'starttls', 'ssl', 'tls']).optional(),
    user: z.string().optional(),
    pass: z.string().optional(), // write-only
    from: z.string().optional(),
    domain: z.string().optional(),
  }),
  emailAgent: z.object({
    title: z.string().optional(),
    company: z.string().optional(),
    maxThreadChars: z.number().int().positive().optional(),
  }),
  system: z.object({
    aiSystemEmail: z.string().email().optional(),
    systemUserId: z.string().optional(),
  }),
  company: z.object({
    name: z.string().optional(),
    tagline: z.string().optional(),
    address: z.string().optional(),
    taxId: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  general: z.object({
    currencySymbol: z.string().optional(),
    currencyCode: z.string().optional(),
    fiscalYearStartMonth: z.number().int().min(1).max(12).optional(),
    defaultPageSize: z.number().int().min(5).max(100).optional(),
    passwordMinLength: z.number().int().min(6).max(64).optional(),
    auditLogRetentionDays: z.number().int().positive().optional(),
  }),
});

// Personal settings
export const userSettingsSchema = z.object({
  locale: z.enum(['en', 'id']).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  defaultPageSize: z.number().int().min(5).max(100).optional(),
  timezone: z.string().optional(),
  emailSignature: z.string().max(2000).optional(),
  notifications: z
    .object({
      inApp: z.boolean().optional(),
      emailDigest: z.boolean().optional(),
    })
    .optional(),
  defaultRegionId: z.string().optional(),
  defaultAreaId: z.string().optional(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;

// ── Settings feature (Task 1) ──────────────────────────────────────────────

export const AppSettingsSchema = z.object({
  companyName: z.string(),
  logoUrl: z.string().nullable(),
  defaultLanguage: z.enum(['en', 'id']),
  timezone: z.string(),
  dateFormat: z.string(),
  numberFormat: z.string(),
  defaultCurrency: z.string(),
  defaultTheme: z.enum(['light', 'dark', 'system']),
  accentColor: z.string(),
  sidebarCollapsed: z.boolean(),
  emailNotifications: z.boolean(),
  defaultNotificationFrequency: z.enum(['realtime', 'daily', 'weekly']),
  announcement: z.string().nullable(),
  sessionTimeout: z.number().int().min(5).max(1440),
  minPasswordLength: z.number().int().min(8).max(128),
  enforceTwoFactor: z.boolean(),
  allowedLoginMethods: z.array(z.string()),
});

export const UpdateAppSettingsSchema = AppSettingsSchema.partial();

export const UserSettingsSchema = z.object({
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
  email: z.string(),
  phone: z.string().nullable(),
  bio: z.string().nullable(),
  themeOverride: z.enum(['light', 'dark', 'system']).nullable(),
  languageOverride: z.enum(['en', 'id']).nullable(),
  timezone: z.string().nullable(),
  dateFormat: z.string().nullable(),
  currency: z.string().nullable(),
  tableDensity: z.enum(['compact', 'comfortable']),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  digestFrequency: z.enum(['realtime', 'daily', 'weekly']),
  mutedCategories: z.array(z.string()),
  twoFactorEnabled: z.boolean(),
});

export const UpdateUserSettingsSchema = UserSettingsSchema.partial();

export type AppSettingsInput = z.infer<typeof AppSettingsSchema>;
export type UpdateAppSettingsInput = z.infer<typeof UpdateAppSettingsSchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
export type UpdateUserSettingsInput = z.infer<typeof UpdateUserSettingsSchema>;

import * as z from 'zod';

// App settings — typed per group. Secrets are write-only.
export const appSettingsSchema = z.object({
  ai: z.object({
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(), // write-only: empty = keep existing
    model: z.string().optional(),
  }),
  embedding: z.object({
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(), // write-only
    model: z.string().optional(),
    dimensions: z.number().int().positive().optional(),
    similarityThreshold: z.number().min(0).max(1).optional(),
  }),
  smtp: z.object({
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    user: z.string().optional(),
    pass: z.string().optional(), // write-only
    from: z.string().optional(),
    domain: z.string().optional(),
  }),
  emailAgent: z.object({
    name: z.string().optional(),
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

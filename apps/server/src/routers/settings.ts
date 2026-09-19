import { Prisma } from '../prisma/generated/client';
import { getCompanyIdentity } from '../lib/company-identity.js';
import { logActivity } from '../lib/activity-log.js';
import { getMessage } from '../lib/locale.js';
import { buildUpdateLogDetail } from '../lib/log-detail.js';
import { getAppSettings, getUserSettings, setAppSettings, setUserSettings } from '../lib/settings-service.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { appSettingsSchema, userSettingsSchema, AppSettingsSchema, UpdateAppSettingsSchema, UserSettingsSchema, UpdateUserSettingsSchema } from '@repo/schemas/settings';

const APP_SETTINGS_DEFAULTS = {
  companyName: '',
  logoUrl: null,
  defaultLanguage: 'en',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: '1,234.56',
  defaultCurrency: 'USD',
  defaultTheme: 'system',
  accentColor: '#3b82f6',
  sidebarCollapsed: false,
  emailNotifications: true,
  defaultNotificationFrequency: 'daily',
  announcement: null,
  sessionTimeout: 60,
  minPasswordLength: 8,
  enforceTwoFactor: false,
  allowedLoginMethods: [],
} satisfies Record<string, unknown>;

const USER_SETTINGS_DEFAULTS = {
  displayName: '',
  avatarUrl: null,
  email: '',
  phone: null,
  bio: null,
  themeOverride: null,
  languageOverride: null,
  timezone: null,
  dateFormat: null,
  currency: null,
  tableDensity: 'comfortable',
  emailNotifications: true,
  pushNotifications: true,
  inAppNotifications: true,
  digestFrequency: 'daily',
  mutedCategories: [],
  twoFactorEnabled: false,
} satisfies Record<string, unknown>;

export const settingsRouter = router({
  // Permission-free: any authenticated user can read non-sensitive display
  // settings (currency, fiscal year, page size). No smtp/emailAgent/system/company.
  // multimodalEnabled is a non-sensitive boolean toggle, safe to expose.
  public: protectedProcedure.query(async ({ ctx }) => {
    const settings = await getAppSettings(ctx.db);
    return {
      currencyCode: settings.general.currencyCode,
      currencySymbol: settings.general.currencySymbol,
      fiscalYearStartMonth: settings.general.fiscalYearStartMonth,
      defaultPageSize: settings.general.defaultPageSize,
      multimodalEnabled: settings.ai?.multimodalEnabled ?? false,
    };
  }),

  // Company letterhead for print surfaces (server PDF + client print sheet).
  // Env-sourced display data — same permission-free class as settings.public.
  companyIdentity: protectedProcedure.query(() => getCompanyIdentity()),

  get: protectedProcedure
    .use(hasPermission('settings@read'))
    .query(async ({ ctx }) => {
      // Service already masks secrets (ai.apiKey / smtp.pass -> { hasValue }).
      return getAppSettings(ctx.db);
    }),

  update: protectedProcedure
    .use(hasPermission('settings@update'))
    .input(appSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      await setAppSettings(ctx.db, input, ctx.user.userId);

      await logActivity(ctx.db, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'settings',
        resourceId: 'app',
        message: getMessage(ctx.locale, 'settings.updated'),
      });

      return { success: true };
    }),

  // Key-value stored PascalCase app settings (Task 2)
  getApp: protectedProcedure
    .use(hasPermission('settings@app@read'))
    .output(AppSettingsSchema)
    .query(async ({ ctx }) => {
      const rows = await ctx.db.setting.findMany({ where: { scope: 'APP', userId: null } });
      const values = rows.reduce<Record<string, unknown>>((acc, row) => {
        acc[row.key.slice('app.'.length)] = row.value;
        return acc;
      }, {});
      return AppSettingsSchema.parse({ ...APP_SETTINGS_DEFAULTS, ...values });
    }),

  updateApp: protectedProcedure
    .use(hasPermission('settings@app@update'))
    .input(UpdateAppSettingsSchema)
    .output(AppSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.userId;
      return ctx.db.$transaction(async (tx) => {
        const before = await tx.setting.findMany({ where: { scope: 'APP', userId: null } });
        const beforeMap = Object.fromEntries(before.map((r) => [r.key.slice('app.'.length), r.value]));

        for (const [field, value] of Object.entries(input)) {
          if (value === undefined) continue;
          const key = `app.${field}`;
          const jsonValue = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
          // ponytail: Prisma cannot address @@unique([key,userId]) with null,
          // so findFirst + create/update instead of upsert.
          const existing = await tx.setting.findFirst({ where: { key, userId: null } });
          if (existing) {
            await tx.setting.update({ where: { id: existing.id }, data: { value: jsonValue } });
          } else {
            await tx.setting.create({ data: { key, value: jsonValue, scope: 'APP', userId: null } });
          }
        }

        const after = await tx.setting.findMany({ where: { scope: 'APP', userId: null } });
        const afterMap = Object.fromEntries(after.map((r) => [r.key.slice('app.'.length), r.value]));

        await logActivity(tx, {
          action: 'UPDATE',
          userId,
          resource: 'settings',
          resourceId: 'app',
          message: 'Updated app settings',
          detail: buildUpdateLogDetail(
            { ...APP_SETTINGS_DEFAULTS, ...beforeMap },
            { ...APP_SETTINGS_DEFAULTS, ...afterMap },
          ),
        });

        return AppSettingsSchema.parse({ ...APP_SETTINGS_DEFAULTS, ...afterMap });
      });
    }),

  // Key-value stored PascalCase user settings (Task 2)
  // Task 12: open without permission — any authenticated user may read/write
  // ONLY their own user.* namespace (server-side ctx.user.userId scoping).
  getUser: protectedProcedure
    .output(UserSettingsSchema)
    .query(async ({ ctx }) => {
      const rows = await ctx.db.setting.findMany({ where: { scope: 'USER', userId: ctx.user.userId } });
      const values = rows.reduce<Record<string, unknown>>((acc, row) => {
        acc[row.key.slice('user.'.length)] = row.value;
        return acc;
      }, {});
      return UserSettingsSchema.parse({ ...USER_SETTINGS_DEFAULTS, ...values });
    }),

  updateUser: protectedProcedure
    .input(UpdateUserSettingsSchema)
    .output(UserSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.userId;
      return ctx.db.$transaction(async (tx) => {
        const before = await tx.setting.findMany({ where: { scope: 'USER', userId } });
        const beforeMap = Object.fromEntries(before.map((r) => [r.key.slice('user.'.length), r.value]));

        for (const [field, value] of Object.entries(input)) {
          if (value === undefined) continue;
          const key = `user.${field}`;
          const jsonValue = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
          await tx.setting.upsert({
            where: { key_userId: { key, userId } },
            create: { key, value: jsonValue, scope: 'USER', userId },
            update: { value: jsonValue },
          });
        }

        const after = await tx.setting.findMany({ where: { scope: 'USER', userId } });
        const afterMap = Object.fromEntries(after.map((r) => [r.key.slice('user.'.length), r.value]));

        await logActivity(tx, {
          action: 'UPDATE',
          userId,
          resource: 'settings',
          resourceId: `user:${userId}`,
          message: 'Updated user settings',
          detail: buildUpdateLogDetail(
            { ...USER_SETTINGS_DEFAULTS, ...beforeMap },
            { ...USER_SETTINGS_DEFAULTS, ...afterMap },
          ),
        });

        return UserSettingsSchema.parse({ ...USER_SETTINGS_DEFAULTS, ...afterMap });
      });
    }),
});

export const userSettingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    // Self-scoped — always the logged-in user, no permission required.
    return getUserSettings(ctx.db, ctx.user.userId);
  }),

  update: protectedProcedure
    .input(userSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      await setUserSettings(ctx.db, ctx.user.userId, input);

      return { success: true };
    }),
});

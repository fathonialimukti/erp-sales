import { logActivity } from '../lib/activity-log.js';
import { getMessage } from '../lib/locale.js';
import { getAppSettings, getUserSettings, setAppSettings, setUserSettings } from '../lib/settings-service.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { appSettingsSchema, userSettingsSchema } from '@repo/schemas/settings';

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

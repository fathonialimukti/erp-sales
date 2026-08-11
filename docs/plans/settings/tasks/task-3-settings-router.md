# Task 3: Settings router + registration

**Files:**
- Create: `apps/server/src/routers/settings.ts`
- Modify: `apps/server/src/router.ts` (import + `appRouter` entry)

**Interfaces:**
- Consumes: `appSettingsSchema`/`userSettingsSchema` (T1), `getAppSettings`/`setAppSettings`/`getUserSettings`/`setUserSettings` (T2), `hasPermission`/`protectedProcedure`/`router` from `../trpc.js`, `getMessage` from `../lib/locale.js`.
- Produces: `settingsRouter` + `userSettingsRouter` — consumed by T5-T8 pages via `trpcClient.settings.*` / `trpcClient.userSettings.*`.

## Frozen contract

### Router namespace
```ts
export const settingsRouter = router({
  get: protectedProcedure.use(hasPermission('settings@read')).query(...),
  update: protectedProcedure.use(hasPermission('settings@update')).input(appSettingsSchema).mutation(...),
});

export const userSettingsRouter = router({
  get: protectedProcedure.query(...),   // self-scoped, no permission
  update: protectedProcedure.input(userSettingsSchema).mutation(...),  // self-scoped
});
```

### Behavior
- `settings.get` → returns `getAppSettings(ctx.db)` with secrets masked:
  ```ts
  {
    ...settings,
    ai: { ...settings.ai, apiKey: settings.ai.apiKey ? '••••••' : '' },
    smtp: { ...settings.smtp, pass: settings.smtp.pass ? '••••••' : '' },
  }
  ```
  (The service returns `hasValue` booleans for secrets — mask accordingly.)
- `settings.update` → `setAppSettings(ctx.db, input, ctx.user.userId)`; returns `{ success: true }`. Log activity via `logActivity` (action `UPDATE`, resource `settings`).
- `userSettings.get` → `getUserSettings(ctx.db, ctx.user.userId)` (force self-scope, ignore any input).
- `userSettings.update` → `setUserSettings(ctx.db, ctx.user.userId, input)`; returns `{ success: true }`.
- Add locale messages to `apps/server/src/lib/locale.ts` (en + id):
  - `settings.notFound` / `settings.insufficientPermissions` (reuse `auth.insufficientPermissions` if present — check first)
  - `settings.updated` / `userSettings.updated`

### router.ts registration
```ts
import { settingsRouter, userSettingsRouter } from './routers/settings.js';
// in appRouter:
settings: settingsRouter,
userSettings: userSettingsRouter,
```

**Steps:**
- [ ] Create settings.ts router
- [ ] Register in router.ts
- [ ] Add locale messages
- [ ] `bunx tsc --noEmit` in apps/server

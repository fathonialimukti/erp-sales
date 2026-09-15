### Task 2: Settings Router

**Files:**
- Create: `apps/server/src/routers/settings.ts`

**Interfaces:**
- Consumes: `AppSettingsSchema`, `UpdateAppSettingsSchema`, `UserSettingsSchema`, `UpdateUserSettingsSchema` from `@repo/schemas`
- Produces: tRPC router with procedures: `getApp`, `updateApp`, `getUser`, `updateUser`

**Reads (in your own context):**
- `apps/server/src/routers/region.ts` (reference router — follow exact patterns)
- `AGENTS.md`

**Frozen contract:**
- Resource: `settings`
- Permission strings: `settings@app@read`, `settings@app@update`, `settings@user@read`, `settings@user@update`
- Router namespace: `trpcClient.settings.{getApp, updateApp, getUser, updateUser}`
- Storage: key-value via Prisma `Setting` model. Key format: `app.<key>` for app settings, `user.<key>` for user settings. Value stored as JSON.
- `getApp`: public (or protected) — returns all app settings as a typed object
- `updateApp`: `transactionalProtected` + `hasPermission('settings@app@update')` — accepts partial app settings, writes activity log, returns updated settings
- `getUser`: `protected` + `hasPermission('settings@user@read')` — returns current user's settings
- `updateUser`: `transactionalProtected` + `hasPermission('settings@user@update')` — accepts partial user settings for current user, writes activity log, returns updated
- Use `ctx.db` for Prisma access
- Mutations must write activity log via activity log helpers

**Steps:**
- [ ] Write the router following `region.ts` patterns exactly
- [ ] Implement getApp (read all `app.*` keys, return typed object)
- [ ] Implement updateApp (upsert keys, activity log, return typed object)
- [ ] Implement getUser (read all `user.*` keys for ctx.user.id, return typed object)
- [ ] Implement updateUser (upsert keys for current user, activity log, return typed object)
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing exact procedure names, permission strings, and input/output types.

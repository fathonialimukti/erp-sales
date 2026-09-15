import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCaller } from './helpers/caller.js';
import { deleteTestRole, deleteTestUser, seedRoleWithPermissions, seedTestUser } from './helpers/seed.js';
import { prisma } from '../lib/prisma.js';

// Task 10: integration tests for the Task 2 key-value settings procedures
// (settings.getApp / updateApp / getUser / updateUser). The legacy nested
// settings.get/update + userSettings procedures are covered by
// tests/routers/settings.test.ts. Patterns mirror that file + backup.test.ts.

const APP_PERMISSIONS = [
  'settings@app@read',
  'settings@app@update',
  'settings@user@read',
  'settings@user@update',
] as const;

const APP_DEFAULTS = {
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
};

const USER_DEFAULTS = {
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
};

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;

const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([...APP_PERMISSIONS]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `settings-kv-actor-${randomUUID()}@example.com`,
    name: 'Settings KV Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  // Remove key-value rows written by these tests (APP scope is global).
  await prisma.setting.deleteMany({ where: { scope: 'APP', key: { startsWith: 'app.' } } });
  await prisma.setting.deleteMany({ where: { userId: { in: [actorUserId, ...createdUserIds] } } });
  // Remove activity logs written by updateApp / updateUser.
  await prisma.activityLog.deleteMany({
    where: { resource: 'settings', resourceId: { in: ['app', `user:${actorUserId}`, ...createdUserIds.map((id) => `user:${id}`)] } },
  });
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  if (createdRoleIds.length > 0) {
    await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
  }
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('settings getApp/updateApp (key-value app settings)', () => {
  it('getApp returns defaults when nothing is stored', async () => {
    // The shared dev DB may carry app.* rows from an interrupted run —
    // snapshot them, verify defaults against an empty store, then restore.
    const existing = await prisma.setting.findMany({
      where: { scope: 'APP', key: { startsWith: 'app.' } },
    });
    await prisma.setting.deleteMany({ where: { scope: 'APP', key: { startsWith: 'app.' } } });
    try {
      const settings = await caller.settings.getApp();
      expect(settings).toEqual(APP_DEFAULTS);
    } finally {
      for (const row of existing) {
        await prisma.setting.create({
          data: { key: row.key, value: row.value as object, scope: row.scope, userId: row.userId },
        });
      }
    }
  });

  it('updateApp writes and returns updated settings', async () => {
    const updated = await caller.settings.updateApp({
      companyName: 'Acme Corp',
      defaultLanguage: 'id',
      sessionTimeout: 90,
      allowedLoginMethods: ['password', 'oauth'],
    });

    expect(updated).toMatchObject({
      ...APP_DEFAULTS,
      companyName: 'Acme Corp',
      defaultLanguage: 'id',
      sessionTimeout: 90,
      allowedLoginMethods: ['password', 'oauth'],
    });

    // Rows are persisted in the Setting table under the app.* namespace.
    const rows = await prisma.setting.findMany({ where: { scope: 'APP', key: { startsWith: 'app.' } } });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    expect(byKey.get('app.companyName')).toBe('Acme Corp');
    expect(byKey.get('app.defaultLanguage')).toBe('id');

    // A subsequent read reflects the write.
    const reread = await caller.settings.getApp();
    expect(reread.companyName).toBe('Acme Corp');
    expect(reread.sessionTimeout).toBe(90);

    // The mutation writes an activity log.
    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'settings', resourceId: 'app', action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();
    expect(activity?.userId).toBe(actorUserId);
  });

  it('updateApp partial update preserves untouched fields', async () => {
    await caller.settings.updateApp({ companyName: 'Acme Corp' });
    const updated = await caller.settings.updateApp({ defaultCurrency: 'IDR' });

    expect(updated.companyName).toBe('Acme Corp');
    expect(updated.defaultCurrency).toBe('IDR');
    // Untouched fields stay at their defaults.
    expect(updated.timezone).toBe(APP_DEFAULTS.timezone);
  });
});

describe('settings getUser/updateUser (key-value user settings)', () => {
  it('getUser returns current user defaults', async () => {
    const settings = await caller.settings.getUser();
    expect(settings).toEqual(USER_DEFAULTS);
  });

  it('updateUser writes and returns updated settings', async () => {
    const updated = await caller.settings.updateUser({
      displayName: 'Jane Doe',
      themeOverride: 'dark',
      tableDensity: 'compact',
      mutedCategories: ['promotional'],
    });

    expect(updated).toMatchObject({
      ...USER_DEFAULTS,
      displayName: 'Jane Doe',
      themeOverride: 'dark',
      tableDensity: 'compact',
      mutedCategories: ['promotional'],
    });

    // Rows are scoped to the acting user.
    const rows = await prisma.setting.findMany({ where: { scope: 'USER', userId: actorUserId } });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.userId).toBe(actorUserId);
    }
    expect(new Map(rows.map((r) => [r.key, r.value])).get('user.displayName')).toBe('Jane Doe');

    // A subsequent read reflects the write.
    const reread = await caller.settings.getUser();
    expect(reread.displayName).toBe('Jane Doe');
    expect(reread.themeOverride).toBe('dark');

    // The mutation writes an activity log scoped to the user.
    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'settings', resourceId: `user:${actorUserId}`, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();
  });

  it('updateUser is per-user isolated', async () => {
    const role = await seedRoleWithPermissions([...APP_PERMISSIONS]);
    createdRoleIds.push(role.id);
    const other = await seedTestUser({
      roleId: role.id,
      email: `settings-kv-other-${randomUUID()}@example.com`,
      name: 'Other User',
    });
    createdUserIds.push(other.id);
    const otherCaller = createCaller({ userId: other.id, email: other.email, name: other.name });

    // The other user sees defaults, not the actor's values.
    const otherSettings = await otherCaller.settings.getUser();
    expect(otherSettings.displayName).toBe('');
    expect(otherSettings.themeOverride).toBeNull();
  });
});

describe('settings key-value permission enforcement (Task 12: user.* open without permission)', () => {
  it('denies app.* without permission but allows own user.* with NO permission', async () => {
    const role = await seedRoleWithPermissions(['region@read']);
    createdRoleIds.push(role.id);
    const plain = await seedTestUser({
      roleId: role.id,
      email: `settings-kv-open-${randomUUID()}@example.com`,
      name: 'Open User',
    });
    createdUserIds.push(plain.id);
    const plainCaller = createCaller({ userId: plain.id, email: plain.email, name: plain.name });

    // app.* stays gated — no settings permission => FORBIDDEN.
    await expect(plainCaller.settings.getApp()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(plainCaller.settings.updateApp({ companyName: 'Nope' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    // user.* is open — authenticated only, no permission required.
    await expect(plainCaller.settings.getUser()).resolves.toEqual(USER_DEFAULTS);
    const updated = await plainCaller.settings.updateUser({ displayName: 'Open User' });
    expect(updated.displayName).toBe('Open User');

    // Server-side scoping: rows are keyed to the caller only.
    const rows = await prisma.setting.findMany({ where: { scope: 'USER', userId: plain.id } });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.userId).toBe(plain.id);
    }
    expect(new Map(rows.map((r) => [r.key, r.value])).get('user.displayName')).toBe('Open User');

    // A subsequent read reflects the write.
    const reread = await plainCaller.settings.getUser();
    expect(reread.displayName).toBe('Open User');
  });

  it('keeps app.* read/write split for app-scoped roles while user.* stays open', async () => {
    const role = await seedRoleWithPermissions(['settings@app@read']);
    createdRoleIds.push(role.id);
    const readOnly = await seedTestUser({
      roleId: role.id,
      email: `settings-kv-appro-${randomUUID()}@example.com`,
      name: 'App Read Only User',
    });
    createdUserIds.push(readOnly.id);
    const readOnlyCaller = createCaller({
      userId: readOnly.id,
      email: readOnly.email,
      name: readOnly.name,
    });

    // app.* gates intact: read allowed, write denied.
    await expect(readOnlyCaller.settings.getApp()).resolves.toBeTruthy();
    await expect(readOnlyCaller.settings.updateApp({ companyName: 'Nope' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    // user.* open regardless of app.* grants.
    await expect(readOnlyCaller.settings.getUser()).resolves.toBeTruthy();
    const updated = await readOnlyCaller.settings.updateUser({ displayName: 'Still Open' });
    expect(updated.displayName).toBe('Still Open');
  });

  it('rejects unauthenticated callers', async () => {
    const anonCaller = createCaller(null);
    await expect(anonCaller.settings.getApp()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anonCaller.settings.updateApp({ companyName: 'Nope' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    await expect(anonCaller.settings.getUser()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anonCaller.settings.updateUser({ displayName: 'Nope' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

describe('sys-admin wildcard bypass (Task 13: "*" passes all settings@* gates)', () => {
  let adminCaller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    // Sys admin = has-all-permissions via the seed's "*" pattern, with NO
    // explicit settings@* strings. Previously FORBIDDEN on every gate below.
    const role = await seedRoleWithPermissions(['*']);
    createdRoleIds.push(role.id);
    const admin = await seedTestUser({
      roleId: role.id,
      email: `settings-sysadmin-${randomUUID()}@example.com`,
      name: 'Sys Admin',
    });
    createdUserIds.push(admin.id);
    adminCaller = createCaller({ userId: admin.id, email: admin.email, name: admin.name });
  });

  it('passes settings.get/getApp reads with "*" and no explicit settings@*', async () => {
    await expect(adminCaller.settings.get()).resolves.toBeTruthy();
    await expect(adminCaller.settings.getApp()).resolves.toBeTruthy();
  });

  it('passes settings.update/updateApp writes with "*" and no explicit settings@*', async () => {
    // Legacy nested update writes appSetting rows — snapshot company.name so
    // the shared dev DB is unaffected, then restore.
    const prior = await prisma.appSetting.findUnique({ where: { key: 'company.name' } });
    try {
      await expect(
        adminCaller.settings.update({
          ai: {},
          smtp: {},
          emailAgent: {},
          system: {},
          company: { name: 'SysAdmin Co' },
          general: {},
        }),
      ).resolves.toEqual({ success: true });
      expect(await prisma.appSetting.findUnique({ where: { key: 'company.name' } })).toMatchObject({
        key: 'company.name',
      });
    } finally {
      if (prior) {
        await prisma.appSetting.upsert({
          where: { key: 'company.name' },
          create: { key: 'company.name', value: prior.value as object, updatedBy: 'settings.test' },
          update: { value: prior.value as object, updatedBy: 'settings.test' },
        });
      } else {
        await prisma.appSetting.deleteMany({ where: { key: 'company.name' } });
      }
    }

    const updated = await adminCaller.settings.updateApp({ companyName: 'SysAdmin Co' });
    expect(updated.companyName).toBe('SysAdmin Co');
  });
});

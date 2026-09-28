import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  deleteTestRole,
  deleteTestUser,
  seedRoleWithPermissions,
  seedTestUser,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';
import { getAppSettings, getSettingValue, setAppSettings } from '../../lib/settings-service.js';
import type { AppSettings } from '@repo/schemas/settings';

// appSettingsSchema requires every top-level group to be present (only inner
// fields are optional), so build a full patch and override the fields under test.
const fullAppPatch = (overrides: Partial<AppSettings> = {}): AppSettings => ({
  ai: {},
  smtp: {},
  emailAgent: {},
  system: {},
  company: {},
  general: {},
  ...overrides,
});

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;

// Rows created during tests, cleaned up in afterAll (app_settings is snapshot-restored).
const createdUserSettingUserIds: string[] = [];
const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];

// These tests write the developer's real `app_settings` (company name, SMTP
// host, AI keys). Deleting the keys by name afterwards destroyed real
// configuration, so snapshot the whole table and put it back exactly.
let priorAppSettings: Array<{ key: string; value: unknown; updatedBy: string | null }> = [];

// Env vars mutated by env-fallback tests, restored in afterAll.
const envBackup = new Map<string, string | undefined>();
const setEnv = (key: string, value: string) => {
  if (!envBackup.has(key)) envBackup.set(key, process.env[key]);
  process.env[key] = value;
};

beforeAll(async () => {
  const role = await seedRoleWithPermissions(['settings@read', 'settings@update']);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `settings-actor-${randomUUID()}@example.com`,
    name: 'Settings Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  priorAppSettings = (await prisma.appSetting.findMany()).map((r) => ({
    key: r.key,
    value: r.value,
    updatedBy: r.updatedBy,
  }));
});

afterAll(async () => {
  // Restore env vars mutated by env-fallback tests.
  for (const [key, value] of envBackup) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  // Put app_settings back exactly as it was: drop the keys these tests added,
  // restore the ones they overwrote. Deleting by key name is what destroyed
  // real company/SMTP/AI configuration on the developer's database.
  const priorKeys = new Set(priorAppSettings.map((r) => r.key));
  await prisma.appSetting.deleteMany({ where: { key: { notIn: [...priorKeys] } } });
  for (const row of priorAppSettings) {
    await prisma.appSetting.upsert({
      where: { key: row.key },
      create: { key: row.key, value: row.value as object, updatedBy: row.updatedBy },
      update: { value: row.value as object, updatedBy: row.updatedBy },
    });
  }

  // Clean up user_settings rows created by tests.
  if (createdUserSettingUserIds.length > 0) {
    await prisma.userSetting.deleteMany({ where: { userId: { in: createdUserSettingUserIds } } });
  }

  // Clean up activity logs created by settings.update.
  await prisma.activityLog.deleteMany({ where: { resource: 'settings', resourceId: 'app' } });

  // Clean up extra users/roles created by tests.
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  if (createdRoleIds.length > 0) {
    await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
  }

  // Clean up the actor.
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('userSettings router (personal settings)', () => {
  it('returns defaults when nothing is set', async () => {
    const settings = await caller.userSettings.get();
    expect(settings).toEqual({
      locale: 'en',
      theme: 'light',
      defaultPageSize: 10,
      timezone: '',
      emailSignature: '',
      notifications: { inApp: true, emailDigest: false },
      defaultRegionId: '',
      defaultAreaId: '',
    });
  });

  it('persists updates and returns updated values', async () => {
    await caller.userSettings.update({
      locale: 'id',
      theme: 'dark',
      defaultPageSize: 25,
      emailSignature: 'Best regards',
      notifications: { inApp: false, emailDigest: true },
    });
    createdUserSettingUserIds.push(actorUserId);

    const settings = await caller.userSettings.get();
    expect(settings.locale).toBe('id');
    expect(settings.theme).toBe('dark');
    expect(settings.defaultPageSize).toBe(25);
    expect(settings.emailSignature).toBe('Best regards');
    expect(settings.notifications).toEqual({ inApp: false, emailDigest: true });
  });

  it('is self-scoped — a user cannot read or write another user\'s settings', async () => {
    // Second user with no special permissions.
    const role = await seedRoleWithPermissions(['settings@read']);
    createdRoleIds.push(role.id);
    const other = await seedTestUser({
      roleId: role.id,
      email: `settings-other-${randomUUID()}@example.com`,
      name: 'Other User',
    });
    createdUserIds.push(other.id);
    const otherCaller = createCaller({ userId: other.id, email: other.email, name: other.name });

    // Actor updates their own settings.
    await caller.userSettings.update({ locale: 'id', theme: 'dark' });

    // The DB rows must be keyed to the actor, not the other user.
    const actorRows = await prisma.userSetting.findMany({ where: { userId: actorUserId } });
    expect(actorRows.length).toBeGreaterThan(0);
    for (const row of actorRows) {
      expect(row.userId).toBe(actorUserId);
    }

    // The other user sees defaults, not the actor's values.
    const otherSettings = await otherCaller.userSettings.get();
    expect(otherSettings.locale).toBe('en');
    expect(otherSettings.theme).toBe('light');

    // The other user's update only affects their own rows.
    await otherCaller.userSettings.update({ locale: 'id' });
    const otherRows = await prisma.userSetting.findMany({ where: { userId: other.id } });
    expect(otherRows.length).toBeGreaterThan(0);
    for (const row of otherRows) {
      expect(row.userId).toBe(other.id);
    }
    createdUserSettingUserIds.push(other.id);
  });
});

describe('settings router (app settings)', () => {
  it('requires settings@read', async () => {
    const role = await seedRoleWithPermissions(['region@read']);
    createdRoleIds.push(role.id);
    const denied = await seedTestUser({
      roleId: role.id,
      email: `settings-denied-${randomUUID()}@example.com`,
      name: 'Denied User',
    });
    createdUserIds.push(denied.id);
    const deniedCaller = createCaller({ userId: denied.id, email: denied.email, name: denied.name });

    await expect(deniedCaller.settings.get()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('returns masked secrets, never plaintext', async () => {
    // Seed secrets via env fallback so no DB row is needed.
    setEnv('AI_API_KEY', 'super-secret-key');

    const settings = await caller.settings.get();
    expect(settings.ai.apiKey).toEqual({ hasValue: true });
    expect(settings.smtp.pass).toMatchObject({ hasValue: expect.any(Boolean) });
    expect(JSON.stringify(settings)).not.toContain('super-secret-key');
  });

  it('requires settings@update for writes', async () => {
    const role = await seedRoleWithPermissions(['settings@read']);
    createdRoleIds.push(role.id);
    const readOnly = await seedTestUser({
      roleId: role.id,
      email: `settings-readonly-${randomUUID()}@example.com`,
      name: 'Read Only User',
    });
    createdUserIds.push(readOnly.id);
    const readOnlyCaller = createCaller({ userId: readOnly.id, email: readOnly.email, name: readOnly.name });

    await expect(
      readOnlyCaller.settings.update(fullAppPatch({ company: { name: 'Nope' } })),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('persists non-secret values', async () => {
    await caller.settings.update(
      fullAppPatch({
        company: { name: 'TestCo', tagline: 'Testing' },
        general: { defaultPageSize: 25 },
      }),
    );

    const settings = await caller.settings.get();
    expect(settings.company.name).toBe('TestCo');
    expect(settings.company.tagline).toBe('Testing');
    expect(settings.general.defaultPageSize).toBe(25);
  });

  it('secret write-only semantics: empty keeps existing, non-empty overwrites', async () => {
    await caller.settings.update(fullAppPatch({ ai: { apiKey: 'first-secret' } }));

    expect(await getSettingValue(prisma, 'ai.apiKey')).toBe('first-secret');

    // Empty string keeps the existing value.
    await caller.settings.update(fullAppPatch({ ai: { apiKey: '' } }));
    expect(await getSettingValue(prisma, 'ai.apiKey')).toBe('first-secret');

    // Non-empty overwrites.
    await caller.settings.update(fullAppPatch({ ai: { apiKey: 'second-secret' } }));
    expect(await getSettingValue(prisma, 'ai.apiKey')).toBe('second-secret');
  });

  it('persists ai embedding baseUrl/model and returns them', async () => {
    await caller.settings.update(
      fullAppPatch({
        ai: {
          embeddingBaseUrl: 'https://embedding.example.com/v1',
          embeddingModel: 'embed-test-model',
        },
      }),
    );

    const settings = await caller.settings.get();
    expect(settings.ai.embeddingBaseUrl).toBe('https://embedding.example.com/v1');
    expect(settings.ai.embeddingModel).toBe('embed-test-model');
  });

  it('masks ai.embeddingApiKey and keeps existing on empty write', async () => {
    await caller.settings.update(fullAppPatch({ ai: { embeddingApiKey: 'embed-secret' } }));

    expect(await getSettingValue(prisma, 'ai.embeddingApiKey')).toBe('embed-secret');

    const settings = await caller.settings.get();
    expect(settings.ai.embeddingApiKey).toEqual({ hasValue: true });
    expect(JSON.stringify(settings)).not.toContain('embed-secret');

    // Empty string keeps the existing value.
    await caller.settings.update(fullAppPatch({ ai: { embeddingApiKey: '' } }));
    expect(await getSettingValue(prisma, 'ai.embeddingApiKey')).toBe('embed-secret');
  });
});

describe('env fallback', () => {
  it('returns env values when no DB row exists', async () => {
    // Establish the precondition: the shared dev DB may carry persisted
    // settings rows — remove the two keys under test, then verify the
    // env fallback wins.
    const removed = await prisma.appSetting.findMany({
      where: { key: { in: ['ai.model', 'smtp.host'] } },
      select: { key: true, value: true },
    });
    await prisma.appSetting.deleteMany({ where: { key: { in: ['ai.model', 'smtp.host'] } } });

    setEnv('AI_MODEL', 'test-model');
    setEnv('SMTP_HOST', 'smtp.test.example');

    expect(await getSettingValue(prisma, 'ai.model')).toBe('test-model');
    expect(await getSettingValue(prisma, 'smtp.host')).toBe('smtp.test.example');

    const settings = await getAppSettings(prisma);
    expect(settings.ai.model).toBe('test-model');
    expect(settings.smtp.host).toBe('smtp.test.example');

    // Restore whatever the DB had so other suites are unaffected.
    for (const row of removed) {
      await prisma.appSetting.upsert({
        where: { key: row.key },
        create: { key: row.key, value: row.value as object, updatedBy: 'settings.test' },
        update: { value: row.value as object, updatedBy: 'settings.test' },
      });
    }
  });
});

describe('cache invalidation', () => {
  it('reflects new values after setAppSettings (not stale cache)', async () => {
    // Seed a DB value and warm the per-key cache.
    await setAppSettings(prisma, fullAppPatch({ company: { name: 'CacheCo' } }), actorUserId);
    expect(await getSettingValue(prisma, 'company.name')).toBe('CacheCo'); // warms cache

    // Update via setAppSettings — must invalidate the cache.
    await setAppSettings(prisma, fullAppPatch({ company: { name: 'CacheCo2' } }), actorUserId);
    expect(await getSettingValue(prisma, 'company.name')).toBe('CacheCo2');

    // getAppSettings also reflects the new value.
    const settings = await getAppSettings(prisma);
    expect(settings.company.name).toBe('CacheCo2');
  });
});

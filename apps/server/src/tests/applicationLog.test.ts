import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  applicationLogIdSchema,
  applicationLogLevelSchema,
  applicationLogSchema,
  listApplicationLogSchema,
} from '@repo/schemas/applicationLog';
import { createCaller } from './helpers/caller.js';
import { deleteTestRole, deleteTestUser, seedRoleWithPermissions, seedTestUser } from './helpers/seed.js';
import { prisma } from '../lib/prisma.js';

// Task 2: applicationLog router (list/detail, gated by applicationLog@read)
// reads the existing app_logs table. Writes stay system-internal (logApp).

describe('applicationLog schemas', () => {
  it('accepts empty/undefined list input (optional schema)', () => {
    expect(listApplicationLogSchema.parse(undefined)).toBeUndefined();
    expect(listApplicationLogSchema.parse({})).toEqual({ page: 1, limit: 10 });
  });

  it('accepts level filter + pagination + search', () => {
    expect(
      listApplicationLogSchema.parse({ level: 'error', page: 2, limit: 5, search: 'smtp' }),
    ).toEqual({ level: 'error', page: 2, limit: 5, search: 'smtp' });
  });

  it('rejects unknown level', () => {
    expect(() => listApplicationLogSchema.parse({ level: 'verbose' })).toThrow();
  });

  it('exposes exactly the contract levels', () => {
    expect(applicationLogLevelSchema.options).toEqual(['info', 'warn', 'error', 'debug']);
  });

  it('requires id for detail input', () => {
    expect(applicationLogIdSchema.parse({ id: 'abc' })).toEqual({ id: 'abc' });
    expect(() => applicationLogIdSchema.parse({})).toThrow();
  });

  it('read model carries the contract shape', () => {
    const parsed = applicationLogSchema.parse({
      id: '01JTEST1234567890ABCDEF',
      level: 'warn',
      message: 'SMTP slow',
      meta: { retry: 1 },
      source: 'email-smtp',
      createdAt: new Date(),
    });
    expect(parsed.source).toBe('email-smtp');
    expect(parsed.meta).toEqual({ retry: 1 });
  });
});

let caller: ReturnType<typeof createCaller>;
let plainCaller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let plainUserId: string;
let plainRoleId: string;
const createdLogIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions(['applicationLog@read']);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `applog-actor-${randomUUID()}@example.com`,
    name: 'AppLog Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  const plainRole = await seedRoleWithPermissions(['region@read']);
  plainRoleId = plainRole.id;
  const plain = await seedTestUser({
    roleId: plainRoleId,
    email: `applog-plain-${randomUUID()}@example.com`,
    name: 'AppLog Plain',
  });
  plainUserId = plain.id;
  plainCaller = createCaller({ userId: plain.id, email: plain.email, name: plain.name });

  const tag = randomUUID().slice(0, 8);
  const rows = await Promise.all([
    prisma.appLog.create({
      data: { level: 'INFO', module: `test-${tag}`, message: `info-${tag}`, detail: { attempt: 1 } },
    }),
    prisma.appLog.create({
      data: { level: 'ERROR', module: `test-${tag}`, message: `error-${tag}` },
    }),
  ]);
  createdLogIds.push(...rows.map((r) => r.id));
});

afterAll(async () => {
  await prisma.appLog.deleteMany({ where: { id: { in: createdLogIds } } }).catch(() => {});
  await deleteTestUser(actorUserId).catch(() => {});
  await deleteTestUser(plainUserId).catch(() => {});
  await deleteTestRole(actorRoleId).catch(() => {});
  await deleteTestRole(plainRoleId).catch(() => {});
});

describe('applicationLog.list (permission-gated)', () => {
  it('authorized caller sees rows in contract shape', async () => {
    const result = await caller.applicationLog.list({ search: createdLogIds[0]!.slice(0, 8) });
    expect(result.meta).toMatchObject({ page: 1 });
    expect(result.meta.total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('maps module/detail/level to source/meta/lowercase level', async () => {
    const result = await caller.applicationLog.list({ limit: 100 });
    const seeded = result.data.filter((row) => createdLogIds.includes(row.id));
    expect(seeded).toHaveLength(2);
    const info = seeded.find((row) => row.level === 'info');
    expect(info).toMatchObject({ source: expect.stringContaining('test-') });
    expect(info?.meta).toEqual({ attempt: 1 });
    expect(seeded.find((row) => row.level === 'error')?.meta).toBeUndefined();
  });

  it('level filter narrows to matching rows only', async () => {
    const result = await caller.applicationLog.list({ level: 'error', limit: 100 });
    const seeded = result.data.filter((row) => createdLogIds.includes(row.id));
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.level).toBe('error');
  });

  it('denies callers without applicationLog@read', async () => {
    await expect(plainCaller.applicationLog.list({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('denies unauthenticated callers', async () => {
    const anonCaller = createCaller(null);
    await expect(anonCaller.applicationLog.list({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('applicationLog.detail (permission-gated)', () => {
  it('authorized caller reads a row by id', async () => {
    const row = await caller.applicationLog.detail({ id: createdLogIds[0]! });
    expect(row.id).toBe(createdLogIds[0]!);
    expect(row.level).toBe('info');
    expect(row.source).toEqual(expect.stringContaining('test-'));
    expect(row.meta).toEqual({ attempt: 1 });
  });

  it('returns NOT_FOUND for unknown id', async () => {
    await expect(caller.applicationLog.detail({ id: `01J${randomUUID().replace(/-/g, '').slice(0, 23).toUpperCase()}` })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('denies callers without applicationLog@read', async () => {
    await expect(plainCaller.applicationLog.detail({ id: createdLogIds[0]! })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('denies unauthenticated callers', async () => {
    const anonCaller = createCaller(null);
    await expect(anonCaller.applicationLog.detail({ id: createdLogIds[0]! })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createCaller } from './helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser } from './helpers/seed.js';
import { prisma } from '../lib/prisma.js';
import { SYSTEM_EXCLUDED_EMAILS } from '../routers/auth.js';

// Valid ULID (spec example) guaranteed not to exist in the DB — avoids depending
// on a ulid generator package for the NOT_FOUND case.
const MISSING_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

const PREV_FLAG = process.env.DEMO_LOGIN_ENABLED;
const enableDemo = () => {
  process.env.DEMO_LOGIN_ENABLED = 'true';
};
const disableDemo = () => {
  process.env.DEMO_LOGIN_ENABLED = 'false';
};

describe('auth demo login (passwordless Option A)', () => {
  const createdUserIds: string[] = [];
  const createdRoleIds: string[] = [];
  let demoUserId: string;
  let demoEmail: string;
  let demoName: string;
  let demoRoleName: string;
  let demoDescription: string;
  let noDescUserId: string;
  const excludedUserIds: string[] = [];

  // Both procedures are public — no authenticated user needed.
  const caller = createCaller(null);

  beforeAll(async () => {
    enableDemo();
    const role = await seedRoleWithPermissions(['region@read']);
    createdRoleIds.push(role.id);
    demoRoleName = role.name;
    demoDescription = 'Test demo account: reviews, validates, and approves team orders.';
    const user = await seedTestUser({
      roleId: role.id,
      email: `demo-${randomUUID()}@example.com`,
      name: 'Demo User',
      description: demoDescription,
    });
    createdUserIds.push(user.id);
    demoUserId = user.id;
    demoEmail = user.email;
    demoName = user.name ?? user.email;
    // A second demo user WITHOUT a description — exercises the nullable path.
    const noDescUser = await seedTestUser({
      roleId: role.id,
      email: `demo-node-${randomUUID()}@example.com`,
      name: 'Demo No Description',
    });
    createdUserIds.push(noDescUser.id);
    noDescUserId = noDescUser.id;
    // Seed one user per excluded service email so list/reject paths are exercised verbatim.
    for (const email of SYSTEM_EXCLUDED_EMAILS) {
      await prisma.user.deleteMany({ where: { email } }).catch(() => {});
      const excluded = await seedTestUser({ roleId: role.id, email, name: 'Excluded Service Account' });
      createdUserIds.push(excluded.id);
      excludedUserIds.push(excluded.id);
    }
  });

  afterAll(async () => {
    if (PREV_FLAG === undefined) delete process.env.DEMO_LOGIN_ENABLED;
    else process.env.DEMO_LOGIN_ENABLED = PREV_FLAG;
    for (const id of createdUserIds) await prisma.user.delete({ where: { id } }).catch(() => {});
    for (const id of createdRoleIds) await prisma.role.delete({ where: { id } }).catch(() => {});
  });

  it('listDemoUsers returns users with id/email/name/role/description/capabilities', async () => {
    enableDemo();
    const users = await caller.auth.listDemoUsers();
    expect(users.length).toBeGreaterThan(0);
    const me = users.find((u) => u.id === demoUserId);
    expect(me).toMatchObject({
      id: demoUserId,
      email: demoEmail,
      name: demoName,
      role: demoRoleName,
      description: demoDescription,
    });
    expect(me?.capabilities).toContain('region@read');
  });

  it('listDemoUsers returns null description for users without one', async () => {
    enableDemo();
    const users = await caller.auth.listDemoUsers();
    const noDesc = users.find((u) => u.id === noDescUserId);
    expect(noDesc?.description).toBeNull();
  });

  it('demoLogin returns the same shape as login and writes a LOGIN activity log', async () => {
    enableDemo();
    const result = await caller.auth.demoLogin({ userId: demoUserId });
    expect(result.user).toMatchObject({ id: demoUserId, email: demoEmail, name: demoName });
    expect(result.user.roles).toHaveLength(1);
    expect(result.user.roles[0]).toMatchObject({ name: demoRoleName, permissions: ['region@read'] });
    expect(typeof result.tokenExpiresAt).toBe('number');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'user', resourceId: demoUserId, action: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity?.message).toContain('demo');
  });

  it('demoLogin rejects an unknown userId with NOT_FOUND', async () => {
    enableDemo();
    await expect(caller.auth.demoLogin({ userId: MISSING_ULID })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('listDemoUsers excludes both service accounts', async () => {
    enableDemo();
    const users = await caller.auth.listDemoUsers();
    const emails = users.map((u) => u.email);
    for (const excluded of SYSTEM_EXCLUDED_EMAILS) {
      expect(emails).not.toContain(excluded);
    }
    // Sanity: the regular demo user is still listed.
    expect(emails).toContain(demoEmail);
  });

  it('demoLogin rejects excluded service accounts with FORBIDDEN', async () => {
    enableDemo();
    expect(excludedUserIds.length).toBe(SYSTEM_EXCLUDED_EMAILS.length);
    for (const userId of excludedUserIds) {
      await expect(caller.auth.demoLogin({ userId })).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Demo login is disabled.',
      });
    }
  });

  it('flag-off gates both procedures with FORBIDDEN', async () => {
    disableDemo();
    await expect(caller.auth.listDemoUsers()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(caller.auth.demoLogin({ userId: demoUserId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    enableDemo();
  });
});

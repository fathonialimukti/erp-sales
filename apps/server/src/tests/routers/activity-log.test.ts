import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser } from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let logId: string;

let otherUserId: string;
let otherRoleId: string;
let otherLogId: string;

let adminCaller: ReturnType<typeof createCaller>;
let adminUserId: string;
let adminRoleId: string;

beforeAll(async () => {
  const role = await seedRoleWithPermissions([]);
  const actor = await seedTestUser({
    roleId: role.id,
    email: `actor-${randomUUID()}@example.com`,
    name: 'Activity Log Test Actor',
  });

  actorRoleId = role.id;
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  const log = await prisma.activityLog.create({
    data: {
      action: 'CREATE',
      userId: actor.id,
      resource: 'activity_log_test',
      resourceId: `log-${randomUUID()}`,
      message: 'Activity log route test',
      detail: { reason: 'seed' },
    },
  });

  logId = log.id;

  // Second user (no permissions) owning a separate log
  const otherRole = await seedRoleWithPermissions([]);
  const otherUser = await seedTestUser({
    roleId: otherRole.id,
    email: `other-${randomUUID()}@example.com`,
    name: 'Activity Log Test Other',
  });

  otherRoleId = otherRole.id;
  otherUserId = otherUser.id;

  const otherLog = await prisma.activityLog.create({
    data: {
      action: 'CREATE',
      userId: otherUser.id,
      resource: 'activity_log_test',
      resourceId: `log-${randomUUID()}`,
      message: 'Activity log other user test',
      detail: { reason: 'seed-other' },
    },
  });

  otherLogId = otherLog.id;

  // Admin user with activity_log@read
  const adminRole = await seedRoleWithPermissions(['activity_log@read']);
  const adminUser = await seedTestUser({
    roleId: adminRole.id,
    email: `admin-${randomUUID()}@example.com`,
    name: 'Activity Log Test Admin',
  });

  adminRoleId = adminRole.id;
  adminUserId = adminUser.id;
  adminCaller = createCaller({ userId: adminUser.id, email: adminUser.email, name: adminUser.name });
});

afterAll(async () => {
  await prisma.activityLog.deleteMany({ where: { id: { in: [logId, otherLogId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [actorUserId, otherUserId, adminUserId] } } });
  await prisma.role.deleteMany({ where: { id: { in: [actorRoleId, otherRoleId, adminRoleId] } } });
});

describe('activity log router', () => {
  it('lists activity logs', async () => {
    const result = await caller.activityLog.list({ search: 'Activity log route test', page: 1, limit: 10 });

    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.some((item) => item.id === logId)).toBe(true);
  });

  it('returns activity log detail', async () => {
    const item = await caller.activityLog.detail({ id: logId });

    expect(item.id).toBe(logId);
    expect(item.resource).toBe('activity_log_test');
    expect(item.user).toBeTruthy();
    expect(item.user.id).toBe(actorUserId);
  });

  it('scopes list to the caller user for non-admins', async () => {
    const result = await caller.activityLog.list({ page: 1, limit: 10 });

    expect(result.data.some((item) => item.id === logId)).toBe(true);
    expect(result.data.some((item) => item.id === otherLogId)).toBe(false);
  });

  it('allows non-admin detail on own log', async () => {
    const item = await caller.activityLog.detail({ id: logId });

    expect(item.id).toBe(logId);
    expect(item.user.id).toBe(actorUserId);
  });

  it('forbids non-admin detail on another user log', async () => {
    await expect(caller.activityLog.detail({ id: otherLogId })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('forbids non-admin adminList', async () => {
    await expect(caller.activityLog.adminList({ page: 1, limit: 10 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('admin adminList sees all logs', async () => {
    const result = await adminCaller.activityLog.adminList({ page: 1, limit: 10 });

    expect(result.data.some((item) => item.id === logId)).toBe(true);
    expect(result.data.some((item) => item.id === otherLogId)).toBe(true);
  });

  it('admin adminList filters by userId', async () => {
    const result = await adminCaller.activityLog.adminList({ userId: otherUserId, page: 1, limit: 10 });

    expect(result.data.some((item) => item.id === otherLogId)).toBe(true);
    expect(result.data.some((item) => item.id === logId)).toBe(false);
  });
});

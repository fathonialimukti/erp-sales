import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestRole, deleteTestUser } from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

// T2: notification authz — user-scoped reads, ownership-scoped mutations,
// admin procedures gated by notification@delete, every mutation logs activity.
let ownerCaller: ReturnType<typeof createCaller>;
let ownerUserId: string;
let ownerRoleId: string;
let otherCaller: ReturnType<typeof createCaller>;
let otherUserId: string;
let otherRoleId: string;
let adminCaller: ReturnType<typeof createCaller>;
let adminUserId: string;
let adminRoleId: string;
let plainCaller: ReturnType<typeof createCaller>;
let plainUserId: string;
let plainRoleId: string;
let notificationId: string;
let otherNotificationId: string;

beforeAll(async () => {
  const ownerRole = await seedRoleWithPermissions(['notification@read']);
  ownerRoleId = ownerRole.id;
  const owner = await seedTestUser({
    roleId: ownerRoleId,
    email: `notif-owner-${randomUUID()}@example.com`,
    name: 'Notification Owner',
  });
  ownerUserId = owner.id;
  ownerCaller = createCaller({ userId: owner.id, email: owner.email, name: owner.name });

  const otherRole = await seedRoleWithPermissions(['notification@read']);
  otherRoleId = otherRole.id;
  const other = await seedTestUser({
    roleId: otherRoleId,
    email: `notif-other-${randomUUID()}@example.com`,
    name: 'Notification Other',
  });
  otherUserId = other.id;
  otherCaller = createCaller({ userId: other.id, email: other.email, name: other.name });

  const adminRole = await seedRoleWithPermissions(['notification@delete']);
  adminRoleId = adminRole.id;
  const admin = await seedTestUser({
    roleId: adminRoleId,
    email: `notif-admin-${randomUUID()}@example.com`,
    name: 'Notification Admin',
  });
  adminUserId = admin.id;
  adminCaller = createCaller({ userId: admin.id, email: admin.email, name: admin.name });

  const plainRole = await seedRoleWithPermissions(['region@read']);
  plainRoleId = plainRole.id;
  const plain = await seedTestUser({
    roleId: plainRoleId,
    email: `notif-plain-${randomUUID()}@example.com`,
    name: 'Notification Plain',
  });
  plainUserId = plain.id;
  plainCaller = createCaller({ userId: plain.id, email: plain.email, name: plain.name });

  const notification = await prisma.notification.create({
    data: {
      userId: ownerUserId,
      createdById: ownerUserId,
      title: 'T2 Authz Notification',
      message: 'Integration test notification (owner)',
      type: 'INFO',
      targetType: 'SYSTEM',
    },
  });
  notificationId = notification.id;

  const otherNotification = await prisma.notification.create({
    data: {
      userId: otherUserId,
      createdById: otherUserId,
      title: 'T2 Authz Other Notification',
      message: 'Integration test notification (other)',
      type: 'INFO',
      targetType: 'SYSTEM',
    },
  });
  otherNotificationId = otherNotification.id;
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { id: { in: [notificationId, otherNotificationId] } } }).catch(() => {});
  for (const id of [ownerUserId, otherUserId, adminUserId, plainUserId]) {
    await deleteTestUser(id).catch(() => {});
  }
  for (const id of [ownerRoleId, otherRoleId, adminRoleId, plainRoleId]) {
    await deleteTestRole(id).catch(() => {});
  }
});

describe('notification authorization (T2)', () => {
  it('scopes list to the caller’s own rows', async () => {
    const result = await ownerCaller.notification.list({});
    expect(result.data.every((n) => n.userId === ownerUserId)).toBe(true);
    expect(result.data.some((n) => n.id === notificationId)).toBe(true);
    expect(result.data.some((n) => n.id === otherNotificationId)).toBe(false);
  });

  it('denies list without notification@read', async () => {
    await expect(plainCaller.notification.list({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('denies unauthenticated list', async () => {
    await expect(createCaller(null).notification.list({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('marks own notification as read and logs activity', async () => {
    const updated = await ownerCaller.notification.markAsRead({ id: notificationId });
    expect(updated.isRead).toBe(true);
    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'notification', resourceId: notificationId, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();
  });

  it('forbids marking another user’s notification as read', async () => {
    await expect(otherCaller.notification.markAsRead({ id: notificationId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('denies markAsRead without notification@read/@update', async () => {
    await expect(plainCaller.notification.markAsRead({ id: otherNotificationId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('gates adminList/adminDelete behind notification@delete', async () => {
    await expect(ownerCaller.notification.adminList({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const result = await adminCaller.notification.adminList({ userId: ownerUserId });
    expect(result.data.every((n) => n.userId === ownerUserId)).toBe(true);
    await expect(ownerCaller.notification.adminDelete({ id: notificationId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('adminDelete removes the row and logs activity', async () => {
    const target = await prisma.notification.create({
      data: {
        userId: ownerUserId,
        createdById: ownerUserId,
        title: 'T2 Admin Delete Target',
        message: 'Deleted by admin in test',
        type: 'INFO',
        targetType: 'SYSTEM',
      },
    });
    const response = await adminCaller.notification.adminDelete({ id: target.id });
    expect(response.success).toBe(true);
    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'notification', resourceId: target.id, action: 'DELETE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();
  });
});

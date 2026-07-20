import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  deleteTestArea,
  deleteTestCustomer,
  deleteTestOutlet,
  deleteTestRegion,
  deleteTestRole,
  deleteTestSku,
  deleteTestUser,
  seedRoleWithPermissions,
  seedTestArea,
  seedTestCustomer,
  seedTestOutlet,
  seedTestRegion,
  seedTestSku,
  seedTestUser,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let customerId: string;
let regionId: string;
let areaId: string;
let outletId: string;
let skuId: string;
const createdConversationIds: string[] = [];
const createdOrderIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'email-crm@read',
    'email-crm@create',
    'email-crm@update',
    'email-crm@delete',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `email-crm-actor-${randomUUID()}@example.com`,
    name: 'Email CRM Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  const customer = await seedTestCustomer();
  customerId = customer.id;
  const region = await seedTestRegion();
  regionId = region.id;
  const area = await seedTestArea(regionId);
  areaId = area.id;
  const outlet = await seedTestOutlet(customerId, areaId);
  outletId = outlet.id;
  const sku = await seedTestSku();
  skuId = sku.id;
});

afterAll(async () => {
  for (const id of createdOrderIds) {
    await prisma.salesOrder.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdConversationIds) {
    await prisma.emailConversation.delete({ where: { id } }).catch(() => {});
  }
  if (skuId) await deleteTestSku(skuId).catch(() => {});
  if (outletId) await deleteTestOutlet(outletId);
  if (areaId) await deleteTestArea(areaId);
  if (regionId) await deleteTestRegion(regionId);
  if (customerId) await deleteTestCustomer(customerId);
  if (actorUserId) await deleteTestUser(actorUserId);
  if (actorRoleId) await deleteTestRole(actorRoleId);
});

describe('emailCrm router', () => {
  it('lists conversations', async () => {
    const result = await caller.emailCrm.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, messages, draft order, and deletes', async () => {
    const email = `thread-${randomUUID()}@example.com`;
    const created = await caller.emailCrm.create({
      email,
      subject: 'Initial subject',
      customerId,
    });
    expect(created.id).toBeTruthy();
    expect(created.email).toBe(email.toLowerCase());
    createdConversationIds.push(created.id);

    const detail = await caller.emailCrm.detail({ id: created.id });
    expect(detail.id).toBe(created.id);
    expect(detail.customer?.id).toBe(customerId);

    const updated = await caller.emailCrm.update({
      currentId: created.id,
      status: 'PENDING',
      priority: 'HIGH',
      subject: 'Updated subject',
    });
    expect(updated.status).toBe('PENDING');
    expect(updated.priority).toBe('HIGH');
    expect(updated.subject).toBe('Updated subject');

    const message = await caller.emailCrm.createMessage({
      conversationId: created.id,
      body: 'Thanks for your email — we will follow up.',
      direction: 'OUTBOUND',
    });
    expect(message.direction).toBe('OUTBOUND');

    const afterMessage = await prisma.emailConversation.findUnique({
      where: { id: created.id },
    });
    expect(afterMessage?.lastMessageAt).toBeTruthy();

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'email-crm', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const order = await caller.emailCrm.createDraftOrder({
      conversationId: created.id,
      outletId,
      items: [{ skuId, quantity: 2, unitPrice: 15000 }],
      notes: 'From email CRM test',
    });
    expect(order.source).toBe('EMAIL_CRM');
    expect(order.emailConversationId).toBe(created.id);
    expect(order.approvalStatus).toBe('DRAFT');
    expect(order.customerId).toBe(customerId);
    createdOrderIds.push(order.id);

    const del = await caller.emailCrm.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdConversationIds.splice(createdConversationIds.indexOf(created.id), 1);
  });

  it('rejects draft order when conversation has no customer', async () => {
    const created = await caller.emailCrm.create({
      email: `nocust-${randomUUID()}@example.com`,
      subject: 'No customer',
    });
    createdConversationIds.push(created.id);

    await expect(
      caller.emailCrm.createDraftOrder({
        conversationId: created.id,
        outletId,
        items: [{ skuId, quantity: 1, unitPrice: 1000 }],
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('denies access without permission', async () => {
    const role = await seedRoleWithPermissions(['region@read']);
    const user = await seedTestUser({
      roleId: role.id,
      email: `email-crm-denied-${randomUUID()}@example.com`,
    });
    const denied = createCaller({ userId: user.id, email: user.email, name: user.name });

    await expect(denied.emailCrm.list({ page: 1, limit: 5 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    await deleteTestUser(user.id);
    await deleteTestRole(role.id);
  });
});

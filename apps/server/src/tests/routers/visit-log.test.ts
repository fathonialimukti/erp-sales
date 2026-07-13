import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole,
  seedTestRegion, deleteTestRegion, seedTestArea, deleteTestArea,
  seedTestCustomer, deleteTestCustomer, seedTestOutlet, deleteTestOutlet,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let regionId: string;
let areaId: string;
let customerId: string;
let outletId: string;
const createdVisitIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'visit-log@read', 'visit-log@create', 'visit-log@update', 'visit-log@delete',
    'region@read', 'region@create', 'area@read', 'area@create',
    'customer@read', 'customer@create', 'outlet@read', 'outlet@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `visit-actor-${randomUUID()}@example.com`,
    name: 'Visit Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
  regionId = (await caller.region.create({ name: `Visit Test Region ${randomUUID()}` })).id;
  areaId = (await caller.area.create({ name: `Visit Test Area ${randomUUID()}`, regionId })).id;
  customerId = (await caller.customer.create({ name: `Visit Test Customer ${randomUUID()}` })).id;
  outletId = (await caller.outlet.create({ name: `Visit Test Outlet ${randomUUID()}`, customerId, areaId })).id;
});

afterAll(async () => {
  for (const id of createdVisitIds) {
    await prisma.visitLog.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestOutlet(outletId);
  await deleteTestCustomer(customerId);
  await deleteTestArea(areaId);
  await deleteTestRegion(regionId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('visit-log router', () => {
  it('lists visit logs', async () => {
    const result = await caller.visitLog.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, and deletes a visit log', async () => {
    const created = await caller.visitLog.create({
      salesmanId: actorUserId,
      outletId,
      date: new Date().toISOString(),
    });
    expect(created.id).toBeTruthy();
    createdVisitIds.push(created.id);

    const detail = await caller.visitLog.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.visitLog.update({
      currentId: created.id,
      salesmanId: actorUserId,
      outletId,
      date: new Date().toISOString(),
      notes: 'Updated notes',
    });
    expect(updated.notes).toBe('Updated notes');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'visit_log', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.visitLog.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdVisitIds.splice(createdVisitIds.indexOf(created.id), 1);
  });
});

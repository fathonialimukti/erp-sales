import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole,
  seedTestRegion, deleteTestRegion, seedTestArea, deleteTestArea,
  seedTestCustomer, deleteTestCustomer,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let regionId: string;
let areaId: string;
let customerId: string;
const createdOutletIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'outlet@read', 'outlet@create', 'outlet@update', 'outlet@delete',
    'region@read', 'region@create', 'area@read', 'area@create', 'customer@read', 'customer@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `outlet-actor-${randomUUID()}@example.com`,
    name: 'Outlet Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
  regionId = (await caller.region.create({ name: `Outlet Test Region ${randomUUID()}` })).id;
  areaId = (await caller.area.create({ name: `Outlet Test Area ${randomUUID()}`, regionId })).id;
  customerId = (await caller.customer.create({ name: `Outlet Test Customer ${randomUUID()}` })).id;
});

afterAll(async () => {
  for (const id of createdOutletIds) {
    await prisma.outlet.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestCustomer(customerId);
  await deleteTestArea(areaId);
  await deleteTestRegion(regionId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('outlet router', () => {
  it('lists outlets', async () => {
    const result = await caller.outlet.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, and deletes an outlet', async () => {
    const created = await caller.outlet.create({
      name: `Test Outlet ${randomUUID()}`,
      customerId,
      areaId,
    });
    expect(created.id).toBeTruthy();
    createdOutletIds.push(created.id);

    const detail = await caller.outlet.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.outlet.update({
      currentId: created.id,
      name: `Updated ${created.name}`,
      customerId,
      areaId,
    });
    expect(updated.name).toContain('Updated');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'outlet', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.outlet.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdOutletIds.splice(createdOutletIds.indexOf(created.id), 1);
  });
});

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
let picUserId: string;
let picRoleId: string;
let regionId: string;
let areaId: string;
let customerId: string;
let outletId: string;
let actionTypeId: string;
const createdProgramIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'action-program@read', 'action-program@create', 'action-program@update', 'action-program@delete',
    'region@read', 'region@create', 'area@read', 'area@create',
    'customer@read', 'customer@create', 'outlet@read', 'outlet@create',
    'action-type@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `ap-actor-${randomUUID()}@example.com`,
    name: 'Action Program Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  // PIC user (referenced by action-program.picId)
  const picRole = await seedRoleWithPermissions(['region@read']);
  picRoleId = picRole.id;
  const pic = await seedTestUser({
    roleId: picRoleId,
    email: `ap-pic-${randomUUID()}@example.com`,
    name: 'Action Program PIC',
  });
  picUserId = pic.id;

  regionId = (await caller.region.create({ name: `AP Test Region ${randomUUID()}` })).id;
  areaId = (await caller.area.create({ name: `AP Test Area ${randomUUID()}`, regionId })).id;
  customerId = (await caller.customer.create({ name: `AP Test Customer ${randomUUID()}` })).id;
  outletId = (await caller.outlet.create({ name: `AP Test Outlet ${randomUUID()}`, customerId, areaId })).id;
  // Reuse a seeded DISCOUNT action type when present (unique code)
  const existingType = await prisma.actionType.findUnique({ where: { code: 'DISCOUNT' } });
  actionTypeId = existingType?.id ?? (await caller.actionType.create({ code: 'DISCOUNT', name: 'Test Discount' })).id;
});

afterAll(async () => {
  for (const id of createdProgramIds) {
    await prisma.actionProgram.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestOutlet(outletId);
  await deleteTestCustomer(customerId);
  await deleteTestArea(areaId);
  await deleteTestRegion(regionId);
  await deleteTestUser(picUserId);
  await deleteTestRole(picRoleId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('action-program router', () => {
  it('lists action programs', async () => {
    const result = await caller.actionProgram.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, and deletes an action program', async () => {
    const created = await caller.actionProgram.create({
      name: `Test Program ${randomUUID()}`,
      actionTypeId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86_400_000).toISOString(),
      areaId,
      picId: picUserId,
      outlets: [{ outletId, cost: 0 }],
      skus: [],
      items: [],
      payments: [],
    });
    expect(created.id).toBeTruthy();
    createdProgramIds.push(created.id);

    const detail = await caller.actionProgram.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'action_program', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.actionProgram.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdProgramIds.splice(createdProgramIds.indexOf(created.id), 1);
  });
});

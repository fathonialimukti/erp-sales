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
const createdProposalIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'event-proposal@read', 'event-proposal@create', 'event-proposal@update', 'event-proposal@delete',
    'region@read', 'region@create', 'area@read', 'area@create',
    'customer@read', 'customer@create', 'outlet@read', 'outlet@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `ep-actor-${randomUUID()}@example.com`,
    name: 'Event Proposal Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
  regionId = (await caller.region.create({ name: `EP Test Region ${randomUUID()}` })).id;
  areaId = (await caller.area.create({ name: `EP Test Area ${randomUUID()}`, regionId })).id;
  customerId = (await caller.customer.create({ name: `EP Test Customer ${randomUUID()}` })).id;
  outletId = (await caller.outlet.create({ name: `EP Test Outlet ${randomUUID()}`, customerId, areaId })).id;
});

afterAll(async () => {
  for (const id of createdProposalIds) {
    await prisma.eventProposal.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestOutlet(outletId);
  await deleteTestCustomer(customerId);
  await deleteTestArea(areaId);
  await deleteTestRegion(regionId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('event-proposal router', () => {
  it('lists event proposals', async () => {
    const result = await caller.eventProposal.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, and deletes an event proposal', async () => {
    const created = await caller.eventProposal.create({
      name: `Test Proposal ${randomUUID()}`,
      eventType: 'ROADSHOW',
      eventDate: new Date().toISOString(),
      areaId,
      skus: [],
      payments: [],
    });
    expect(created.id).toBeTruthy();
    createdProposalIds.push(created.id);

    const detail = await caller.eventProposal.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'event_proposal', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.eventProposal.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdProposalIds.splice(createdProposalIds.indexOf(created.id), 1);
  });
});

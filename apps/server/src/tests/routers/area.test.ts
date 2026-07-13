import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole, seedTestRegion, deleteTestRegion } from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let regionId: string;
const createdAreaIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'area@read', 'area@create', 'area@update', 'area@delete',
    'region@read', 'region@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `area-actor-${randomUUID()}@example.com`,
    name: 'Area Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
  regionId = (await caller.region.create({ name: `Area Test Region ${randomUUID()}` })).id;
});

afterAll(async () => {
  for (const id of createdAreaIds) {
    await prisma.area.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestRegion(regionId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('area router', () => {
  it('lists areas', async () => {
    const result = await caller.area.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, and deletes an area', async () => {
    const created = await caller.area.create({ name: `Test Area ${randomUUID()}`, regionId });
    expect(created.id).toBeTruthy();
    createdAreaIds.push(created.id);

    const detail = await caller.area.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.area.update({ currentId: created.id, name: `Updated ${created.name}`, regionId });
    expect(updated.name).toContain('Updated');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'area', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.area.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdAreaIds.splice(createdAreaIds.indexOf(created.id), 1);
  });

  it('rejects area creation without a region', async () => {
    await expect(caller.area.create({ name: `Orphan ${randomUUID()}`, regionId: 'nonexistent-region' }))
      .rejects.toThrow();
  });
});

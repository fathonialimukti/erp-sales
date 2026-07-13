import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole } from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
const createdIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'region@read', 'region@create', 'region@update', 'region@delete',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `region-actor-${randomUUID()}@example.com`,
    name: 'Region Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  for (const id of createdIds) {
    await prisma.region.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('region router', () => {
  it('lists regions', async () => {
    const result = await caller.region.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, and deletes a region', async () => {
    const created = await caller.region.create({ name: `Test Region ${randomUUID()}` });
    expect(created.id).toBeTruthy();
    createdIds.push(created.id);

    const detail = await caller.region.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.region.update({ currentId: created.id, name: `Updated ${created.name}` });
    expect(updated.name).toContain('Updated');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'region', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.region.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdIds.splice(createdIds.indexOf(created.id), 1);
  });
});

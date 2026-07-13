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
    'sku@read', 'sku@create', 'sku@update', 'sku@delete',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `sku-actor-${randomUUID()}@example.com`,
    name: 'SKU Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  for (const id of createdIds) {
    await prisma.sku.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('sku router', () => {
  it('lists products', async () => {
    const result = await caller.sku.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, and deletes a product', async () => {
    const created = await caller.sku.create({ name: `Test Product ${randomUUID()}`, baseUnit: 'pcs' });
    expect(created.id).toBeTruthy();
    createdIds.push(created.id);

    const detail = await caller.sku.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.sku.update({ currentId: created.id, name: `Updated ${created.name}`, baseUnit: 'pcs', status: 'ACTIVE' });
    expect(updated.name).toContain('Updated');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'sku', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.sku.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdIds.splice(createdIds.indexOf(created.id), 1);
  });
});

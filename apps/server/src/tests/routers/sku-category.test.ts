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
    email: `skucat-actor-${randomUUID()}@example.com`,
    name: 'SKU Category Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  for (const id of createdIds) {
    await prisma.skuCategory.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('sku-category router', () => {
  it('lists categories', async () => {
    const result = await caller.skuCategory.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, and deletes a category', async () => {
    const created = await caller.skuCategory.create({ name: `Test Category ${randomUUID()}` });
    expect(created.id).toBeTruthy();
    createdIds.push(created.id);

    const detail = await caller.skuCategory.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.skuCategory.update({ currentId: created.id, name: `Updated ${created.name}` });
    expect(updated.name).toContain('Updated');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'sku_category', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.skuCategory.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdIds.splice(createdIds.indexOf(created.id), 1);
  });
});

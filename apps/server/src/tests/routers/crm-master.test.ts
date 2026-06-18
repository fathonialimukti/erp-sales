import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestRole, deleteTestUser, seedTestRegion, deleteTestRegion, seedTestArea, deleteTestArea } from '../helpers/seed.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let regionId: string;
let areaId: string;

beforeAll(async () => {
  const role = await seedRoleWithPermissions(['region@read', 'region@create', 'region@update', 'region@delete']);
  actorRoleId = role.id;
  const actor = await seedTestUser({ roleId: actorRoleId, email: `crm-actor-${randomUUID()}@example.com`, name: 'CRM Actor' });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  await deleteTestRegion(regionId);
  await deleteTestArea(areaId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('region CRUD', () => {
  it('lists regions (empty)', async () => {
    const result = await caller.region.list({ page: 1, limit: 10 });
    expect(result.meta).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('creates a region', async () => {
    const created = await caller.region.create({ name: 'Test Region', code: 'TR' });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Test Region');
    regionId = created.id;
  });

  it('gets region detail', async () => {
    const detail = await caller.region.detail({ id: regionId });
    expect(detail.name).toBe('Test Region');
  });

  it('updates a region', async () => {
    const updated = await caller.region.update({ currentId: regionId, name: 'Updated Region', code: 'UR' });
    expect(updated.name).toBe('Updated Region');
  });

  it('creates an area under region', async () => {
    const area = await caller.area.create({ name: 'Test Area', regionId });
    expect(area.id).toBeDefined();
    areaId = area.id;
  });

  it('deletes region (cascades area)', async () => {
    await caller.region.delete({ id: regionId });
    // should not throw
  });
});
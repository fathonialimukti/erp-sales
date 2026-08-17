import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { prisma } from '../../lib/prisma.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestRole, deleteTestUser, seedTestCustomer, deleteTestCustomer, seedTestArea, deleteTestArea, seedTestRegion, deleteTestRegion, seedTestSku, deleteTestSku } from '../helpers/seed.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let customerId: string;
let regionId: string;
let areaId: string;
let skuId: string;

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'sales-order@read', 'sales-order@create', 'sales-order@update', 'sales-order@delete', 'sales-order@propose', 'sales-order@approve',
    'customer@read', 'customer@create', 'customer@delete',
    'area@read', 'region@read', 'region@create', 'region@delete', 'area@create', 'area@delete',
    'outlet@read', 'outlet@create', 'outlet@delete',
    'sku@read', 'sku@create', 'sku@delete',
    'invoice@read', 'invoice@create', 'invoice@delete',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({ roleId: actorRoleId, email: `sales-actor-${randomUUID()}@example.com`, name: 'Sales Actor' });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  // Setup dependencies
  regionId = (await caller.region.create({ name: 'Sales Test Region' })).id;
  areaId = (await caller.area.create({ name: 'Sales Test Area', regionId })).id;
  customerId = (await caller.customer.create({ name: 'Sales Test Customer' })).id;
  skuId = (await caller.sku.create({ name: 'Test Product', basePrice: 10000, baseUnit: 'pcs' })).id;
});

afterAll(async () => {
  deleteTestCustomer(customerId);
  deleteTestSku(skuId);
  deleteTestArea(areaId);
  deleteTestRegion(regionId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('sales order CRUD + approval', () => {
  let orderId: string;
  let outletId: string;

  beforeAll(async () => {
    // Create an outlet for the customer
    const outlet = await caller.outlet.create({
      customerId,
      areaId,
      name: 'Test Outlet',
    });
    outletId = outlet.id;
  });

  it('creates a sales order', async () => {
    const created = await caller.salesOrder.create({
      outletId,
      items: [{ skuId, quantity: 2, unitPrice: 10000, lineTotal: 20000, discountPercent: 0, taxPercent: 0 }],
      currency: 'USD',
      subtotal: 20000, grandTotal: 20000, discountTotal: 0, taxTotal: 0,
    });
    expect(created.id).toBeDefined();
    expect(created.approvalStatus).toBe('DRAFT');
    orderId = created.id;
  });

  it('gets sales order detail', async () => {
    const detail = await caller.salesOrder.detail({ id: orderId });
    expect(detail.items.length).toBe(1);
    expect(String(detail.items[0]!.quantity)).toBe('2');
  });

  it('proposes sales order', async () => {
    const result = await caller.salesOrder.propose({ id: orderId });
    expect(result.approvalStatus).toBe('VALIDATING');
  });

  it('approves sales order', async () => {
    // propose() moves the order to VALIDATING; the async AI-validation job later
    // transitions it to PROPOSED. Mirror that post-validation state for the approve test.
    await prisma.salesOrder.update({ where: { id: orderId }, data: { approvalStatus: 'PROPOSED' } });
    const result = await caller.salesOrder.approve({ id: orderId, message: 'Looks good' });
    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.approvalHistory).toBeDefined();
  });

  it('deletes sales order', async () => {
    await caller.salesOrder.delete({ id: orderId });
    // should not throw
  });
});
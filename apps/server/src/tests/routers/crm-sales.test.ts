import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
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

  it('creates a sales order', async () => {
    const created = await caller.salesOrder.create({
      customerId, areaId,
      items: [{ skuId, quantity: 2, unitPrice: 10000, lineTotal: 20000, discountPercent: 0, taxPercent: 0 }],
      currency: 'IDR',
      subtotal: 20000, grandTotal: 20000, discountTotal: 0, taxTotal: 0,
    });
    expect(created.id).toBeDefined();
    expect(created.approvalStatus).toBe('DRAFT');
    orderId = created.id;
  });

  it('gets sales order detail', async () => {
    const detail = await caller.salesOrder.detail({ id: orderId });
    expect(detail.items.length).toBe(1);
    expect(detail.items[0]!.quantity).toBe(2);
  });

  it('proposes sales order', async () => {
    const result = await caller.salesOrder.propose({ id: orderId });
    expect(result.approvalStatus).toBe('PROPOSED');
  });

  it('approves sales order', async () => {
    const result = await caller.salesOrder.approve({ id: orderId, message: 'Looks good' });
    expect(result.approvalStatus).toBe('APPROVED');
    expect(result.approvalHistory).toBeDefined();
  });

  it('deletes sales order', async () => {
    await caller.salesOrder.delete({ id: orderId });
    // should not throw
  });
});

describe('invoice CRUD', () => {
  let invoiceId: string;
  let orderId: string;

  beforeAll(async () => {
    // Create an approved order for invoicing
    const order = await caller.salesOrder.create({
      customerId, areaId,
      items: [{ skuId, quantity: 1, unitPrice: 50000, lineTotal: 50000, discountPercent: 0, taxPercent: 0 }],
      currency: 'IDR',
      subtotal: 50000, grandTotal: 50000, discountTotal: 0, taxTotal: 0,
    });
    orderId = order.id;
    await caller.salesOrder.propose({ id: orderId });
    await caller.salesOrder.approve({ id: orderId });
  });

  afterAll(async () => {
    if (invoiceId) await caller.invoice.delete({ id: invoiceId }).catch(() => {});
    if (orderId) await caller.salesOrder.delete({ id: orderId }).catch(() => {});
  });

  it('creates invoice from sales order', async () => {
    const created = await caller.invoice.create({
      salesOrderId: orderId,
      customerId,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      subtotal: 50000, taxTotal: 0, grandTotal: 50000, balanceDue: 50000,
      currency: 'IDR',
    });
    expect(created.id).toBeDefined();
    expect(created.balanceDue).toBe(50000);
    invoiceId = created.id;
  });
});
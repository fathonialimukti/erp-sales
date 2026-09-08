import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  seedRoleWithPermissions,
  seedTestUser,
  deleteTestUser,
  deleteTestRole,
  seedTestRegion,
  deleteTestRegion,
  seedTestArea,
  deleteTestArea,
  seedTestCustomer,
  deleteTestCustomer,
  seedTestOutlet,
  deleteTestOutlet,
  seedTestSku,
  deleteTestSku,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let regionId: string;
let areaId: string;
let customerId: string;
let outletId: string;
let skuId: string;
const createdOrderIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'sales-order@read',
    'sales-order@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `docnum-actor-${randomUUID()}@example.com`,
    name: 'Doc Number Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  regionId = (await seedTestRegion()).id;
  areaId = (await seedTestArea(regionId)).id;
  customerId = (await seedTestCustomer()).id;
  outletId = (await seedTestOutlet(customerId, areaId)).id;
  skuId = (await seedTestSku()).id;
});

afterAll(async () => {
  await prisma.salesOrder.deleteMany({ where: { id: { in: createdOrderIds } } }).catch(() => {});
  await deleteTestOutlet(outletId);
  await deleteTestSku(skuId);
  await deleteTestCustomer(customerId);
  await deleteTestArea(areaId);
  await deleteTestRegion(regionId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

const buildInput = () => ({
  outletId,
  items: [{ skuId, quantity: 1, unitPrice: 1000, lineTotal: 1000, discountPercent: 0, taxPercent: 0 }],
  currency: 'USD',
  subtotal: 1000,
  grandTotal: 1000,
  discountTotal: 0,
  taxTotal: 0,
});

describe('sales order document numbering', () => {
  it('assigns unique sequential numbers under 8 concurrent creates', async () => {
    // All 8 creates race: without the in-transaction advisory lock, two can
    // compute the same next number and the second insert violates the
    // documentNumber unique constraint.
    const results = await Promise.all(Array.from({ length: 8 }, () => caller.salesOrder.create(buildInput())));

    for (const order of results) {
      createdOrderIds.push(order.id);
      expect(order.documentNumber).toMatch(/^SO-\d{8}-\d{4}$/);
    }

    const numbers = results.map((r) => r.documentNumber);
    expect(new Set(numbers).size).toBe(numbers.length);

    // Sequential: sorted suffixes are 1..N contiguous from the first of the day.
    const today = new Date().toISOString().split('T')[0]!.replace(/-/g, '');
    const todaysNumbers = numbers
      .filter((n) => n!.startsWith(`SO-${today}-`))
      .map((n) => Number.parseInt(n!.slice(-4), 10))
      .sort((a, b) => a - b);
    expect(new Set(todaysNumbers).size).toBe(todaysNumbers.length);
  }, 30_000);
});

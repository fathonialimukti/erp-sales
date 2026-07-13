import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole } from '../helpers/seed.js';

let actorRoleId: string;
let actorUserId: string;
let caller: ReturnType<typeof createCaller>;

beforeAll(async () => {
  const role = await seedRoleWithPermissions(['report@read']);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `report-actor-${randomUUID()}@example.com`,
    name: 'Report Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('reporting router', () => {
  it('salesSummary returns numeric KPIs', async () => {
    const r = await caller.reporting.salesSummary();
    expect(typeof r.revenue).toBe('number');
    expect(typeof r.orderCount).toBe('number');
    expect(typeof r.aov).toBe('number');
    expect(typeof r.quantity).toBe('number');
    expect(r.deltaPercent === null || typeof r.deltaPercent === 'number').toBe(true);
  });

  it('salesByDimension works for area/outlet/customer/sku', async () => {
    for (const dimension of ['area', 'outlet', 'customer', 'sku'] as const) {
      const rows = await caller.reporting.salesByDimension({ dimension });
      expect(Array.isArray(rows)).toBe(true);
    }
  });

  it('salesByDimension region resolves through area.regionId (not SalesOrder.regionId)', async () => {
    // SalesOrder has no regionId column; region must be reached via area.regionId.
    // This must NOT throw a Prisma groupBy error.
    const rows = await caller.reporting.salesByDimension({ dimension: 'region' });
    expect(Array.isArray(rows)).toBe(true);
  });

  it('salesTrend returns gap-filled buckets', async () => {
    const rows = await caller.reporting.salesTrend({ period: 'day' });
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(typeof row.date).toBe('string');
      expect(typeof row.total).toBe('number');
      expect(typeof row.count).toBe('number');
    }
  });

  it('fieldActivity returns coverage/conversion percentages', async () => {
    const r = await caller.reporting.fieldActivity();
    expect(typeof r.totalVisits).toBe('number');
    expect(typeof r.coveragePercent).toBe('number');
    expect(typeof r.conversionPercent).toBe('number');
    expect(Array.isArray(r.perSalesman)).toBe(true);
  });

  it('collection returns aging buckets and collection rate', async () => {
    const r = await caller.reporting.collection();
    expect(typeof r.outstandingTotal).toBe('number');
    expect(typeof r.collectedTotal).toBe('number');
    expect(typeof r.collectionRatePercent).toBe('number');
    expect(Array.isArray(r.aging)).toBe(true);
    expect(r.aging).toHaveLength(4);
  });

  it('promoRoi returns program/proposal rows', async () => {
    const r = await caller.reporting.promoRoi();
    expect(Array.isArray(r.items)).toBe(true);
  });

  it('pipelineFunnel returns status counts', async () => {
    const r = await caller.reporting.pipelineFunnel();
    expect(typeof r.visits).toBe('number');
    expect(typeof r.ordersTotal).toBe('number');
    expect(typeof r.approved).toBe('number');
    expect(typeof r.avgApprovalDays).toBe('number');
  });
});

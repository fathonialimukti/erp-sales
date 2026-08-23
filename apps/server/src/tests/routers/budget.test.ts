import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole,
  deleteTestRegion, deleteTestArea, deleteTestCustomer, deleteTestOutlet, deleteTestSku,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let picUserId: string;
let picRoleId: string;
let regionId: string;
let areaId: string;
let regionBId: string;
let areaBId: string;
let customerId: string;
let outletId: string;
let outletTwoId: string;
let outletBId: string;
let skuId: string;
let actionTypeId: string;
let eventTypeId: string;
let vendorId: string;
let budgetTypeId: string;

const createdOrderIds: string[] = [];
const createdProgramIds: string[] = [];
const createdProposalIds: string[] = [];
const createdLineIds: string[] = [];
const createdPeriodIds: string[] = [];

const uid = () => randomUUID().slice(0, 8);
const now = new Date();
const startDate = new Date(now.getTime() - 86_400_000).toISOString();
const endDate = new Date(now.getTime() + 86_400_000).toISOString();

type LineTarget = { scope: 'AREA'; areaId: string } | { scope: 'REGION'; regionId: string };

const createPeriod = async () => {
  const period = await caller.budgetPeriod.create({
    code: `BP-${uid()}`,
    name: `Budget Test Period ${uid()}`,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'OPEN',
  });
  createdPeriodIds.push(period.id);
  return period.id;
};

/** Registers the created id for cleanup even when the caller expects a rejection. */
const createLineOn = async (periodId: string, amount: number, target: LineTarget) => {
  const line = await caller.budgetLine.create({ budgetTypeId, periodId, amount, ...target });
  createdLineIds.push(line.id);
  return line;
};

/** Fresh period per line — keeps every budget line unique on [type, period, scope, region, area]. */
const createLine = async (amount: number, target: LineTarget) =>
  (await createLineOn(await createPeriod(), amount, target)).id;

type ProgramOpts = {
  budgetLineId?: string;
  areaId?: string;
  outlets: Array<{ outletId: string; cost: number }>;
  items?: Array<{ name: string; quantity: number; price: number; cost: number }>;
  skus?: Array<{
    skuId: string; quantity: number; price: number; discount: number;
    priceAfterDiscount: number; cost: number; tax: number; total: number;
  }>;
  payments?: Array<{ amount: number; paymentDate: string }>;
};

const createProgram = async (opts: ProgramOpts) => {
  const program = await caller.actionProgram.create({
    name: `Budget Test Program ${uid()}`,
    actionTypeId,
    startDate,
    endDate,
    areaId: opts.areaId ?? areaId,
    picId: picUserId,
    outlets: opts.outlets,
    skus: opts.skus ?? [],
    items: opts.items ?? [],
    payments: opts.payments ?? [],
    ...(opts.budgetLineId ? { budgetLineId: opts.budgetLineId } : {}),
  });
  createdProgramIds.push(program.id);
  return program;
};

const approve = (programId: string) =>
  prisma.actionProgram.update({ where: { id: programId }, data: { approvalStatus: 'APPROVED' } });

type ProposalOpts = {
  budgetLineId?: string;
  areaId?: string;
  miscItems?: Array<{ name: string; quantity: number; price: number; total: number }>;
  vendors?: Array<{
    vendorId: string; amount: number;
    payments?: Array<{ amount: number; paymentDate: string }>;
  }>;
  payments?: Array<{ amount: number; paymentDate: string }>;
};

const createProposal = async (opts: ProposalOpts) => {
  const proposal = await caller.eventProposal.create({
    name: `Budget Test Event ${uid()}`,
    eventTypeId,
    eventDate: now.toISOString(),
    areaId: opts.areaId ?? areaId,
    skus: [],
    miscItems: opts.miscItems ?? [],
    vendors: (opts.vendors ?? []).map((v) => ({ ...v, payments: v.payments ?? [] })),
    payments: opts.payments ?? [],
    ...(opts.budgetLineId ? { budgetLineId: opts.budgetLineId } : {}),
  });
  createdProposalIds.push(proposal.id);
  return proposal;
};

const summaryOf = async (lineId: string) => (await caller.budgetLine.detail({ id: lineId })).summary;

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'budget-type@read', 'budget-type@create', 'budget-type@update', 'budget-type@delete',
    'budget-period@read', 'budget-period@create', 'budget-period@update', 'budget-period@delete',
    'budget-line@read', 'budget-line@create', 'budget-line@update', 'budget-line@delete',
    'action-type@read', 'action-type@create', 'action-type@update', 'action-type@delete',
    'event-type@read', 'event-type@create', 'event-type@update', 'event-type@delete',
    'vendor@read', 'vendor@create', 'vendor@update', 'vendor@delete',
    'action-program@read', 'action-program@create', 'action-program@update', 'action-program@delete',
    'event-proposal@read', 'event-proposal@create', 'event-proposal@update', 'event-proposal@delete',
    'sales-order@read', 'sales-order@create', 'sales-order@update', 'sales-order@delete',
    'region@read', 'region@create', 'area@read', 'area@create',
    'customer@read', 'customer@create', 'outlet@read', 'outlet@create',
    'sku@read', 'sku@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `budget-actor-${randomUUID()}@example.com`,
    name: 'Budget Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });

  const picRole = await seedRoleWithPermissions(['region@read']);
  picRoleId = picRole.id;
  const pic = await seedTestUser({
    roleId: picRoleId,
    email: `budget-pic-${randomUUID()}@example.com`,
    name: 'Budget PIC',
  });
  picUserId = pic.id;

  regionId = (await caller.region.create({ name: `Budget Test Region ${uid()}` })).id;
  areaId = (await caller.area.create({ name: `Budget Test Area ${uid()}`, regionId })).id;
  regionBId = (await caller.region.create({ name: `Budget Test Region B ${uid()}` })).id;
  areaBId = (await caller.area.create({ name: `Budget Test Area B ${uid()}`, regionId: regionBId })).id;

  customerId = (await caller.customer.create({ name: `Budget Test Customer ${uid()}` })).id;
  outletId = (await caller.outlet.create({ name: `Budget Test Outlet 1 ${uid()}`, customerId, areaId })).id;
  outletTwoId = (await caller.outlet.create({ name: `Budget Test Outlet 2 ${uid()}`, customerId, areaId })).id;
  outletBId = (await caller.outlet.create({ name: `Budget Test Outlet B ${uid()}`, customerId, areaId: areaBId })).id;

  skuId = (await caller.sku.create({ name: `Budget Test SKU ${uid()}`, basePrice: 10_000, baseUnit: 'pcs' })).id;

  actionTypeId = (await caller.actionType.create({ code: `AT-${uid()}`, name: 'Budget Test Discount' })).id;
  eventTypeId = (await caller.eventType.create({ code: `ET-${uid()}`, name: 'Budget Test Exhibition' })).id;
  vendorId = (await caller.vendor.create({ name: `Budget Test Vendor ${uid()}`, status: 'ACTIVE' })).id;
  budgetTypeId = (await caller.budgetType.create({ code: `BT-${uid()}`, name: 'Budget Test Trade Promo' })).id;
});

afterAll(async () => {
  for (const id of createdOrderIds) await prisma.salesOrder.delete({ where: { id } }).catch(() => {});
  for (const id of createdProgramIds) await prisma.actionProgram.delete({ where: { id } }).catch(() => {});
  for (const id of createdProposalIds) await prisma.eventProposal.delete({ where: { id } }).catch(() => {});
  for (const id of createdLineIds) await prisma.budgetLine.delete({ where: { id } }).catch(() => {});
  for (const id of createdPeriodIds) await prisma.budgetPeriod.delete({ where: { id } }).catch(() => {});
  await prisma.budgetType.delete({ where: { id: budgetTypeId } }).catch(() => {});
  await prisma.vendor.delete({ where: { id: vendorId } }).catch(() => {});
  await prisma.eventType.delete({ where: { id: eventTypeId } }).catch(() => {});
  await prisma.actionType.delete({ where: { id: actionTypeId } }).catch(() => {});
  await deleteTestOutlet(outletBId);
  await deleteTestOutlet(outletTwoId);
  await deleteTestOutlet(outletId);
  await deleteTestSku(skuId);
  await deleteTestCustomer(customerId);
  await deleteTestArea(areaBId);
  await deleteTestArea(areaId);
  await deleteTestRegion(regionBId);
  await deleteTestRegion(regionId);
  await deleteTestUser(picUserId);
  await deleteTestRole(picRoleId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('budget master modules', () => {
  it('budgetType: create → list → detail → update → delete', async () => {
    const name = `Type ${uid()}`;
    const created = await caller.budgetType.create({ code: `BT-${uid()}`, name });
    expect(created.id).toBeTruthy();

    const list = await caller.budgetType.list({ page: 1, limit: 10, search: name });
    expect(list.data.some((row) => row.id === created.id)).toBe(true);

    const detail = await caller.budgetType.detail({ id: created.id });
    expect(detail.name).toBe(name);

    const updated = await caller.budgetType.update({ currentId: created.id, code: created.code, name: `${name} v2` });
    expect(updated.name).toBe(`${name} v2`);

    expect((await caller.budgetType.delete({ id: created.id })).success).toBe(true);
  });

  it('budgetPeriod: create with date strings → detail returns dates', async () => {
    const created = await caller.budgetPeriod.create({
      code: `BP-${uid()}`,
      name: `Period ${uid()}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'OPEN',
    });

    const detail = await caller.budgetPeriod.detail({ id: created.id });
    expect(detail.startDate.toISOString()).toContain('2026-01-01');
    expect(detail.endDate.toISOString()).toContain('2026-12-31');

    const updated = await caller.budgetPeriod.update({
      currentId: created.id,
      code: created.code,
      name: 'Period Renamed',
      startDate: '2026-02-01',
      endDate: '2026-11-30',
      status: 'CLOSED',
    });
    expect(updated.status).toBe('CLOSED');

    expect((await caller.budgetPeriod.delete({ id: created.id })).success).toBe(true);
  });

  it('actionType: create → detail → update → delete', async () => {
    const created = await caller.actionType.create({ code: `AT-${uid()}`, name: 'Cashier Program' });
    expect((await caller.actionType.detail({ id: created.id })).name).toBe('Cashier Program');

    const updated = await caller.actionType.update({ currentId: created.id, code: created.code, name: 'End Gondola' });
    expect(updated.name).toBe('End Gondola');

    expect((await caller.actionType.delete({ id: created.id })).success).toBe(true);
  });

  it('eventType: create → detail → update → delete', async () => {
    const created = await caller.eventType.create({ code: `ET-${uid()}`, name: 'Bazaar' });
    expect((await caller.eventType.detail({ id: created.id })).name).toBe('Bazaar');

    const updated = await caller.eventType.update({ currentId: created.id, code: created.code, name: 'Roadshow' });
    expect(updated.name).toBe('Roadshow');

    expect((await caller.eventType.delete({ id: created.id })).success).toBe(true);
  });

  it('vendor: create → list filtered by status → update → delete', async () => {
    const name = `Vendor ${uid()}`;
    const created = await caller.vendor.create({ name, status: 'ACTIVE', category: 'PRODUCTION' });

    const active = await caller.vendor.list({ page: 1, limit: 10, search: name, status: 'ACTIVE' });
    expect(active.data.some((row) => row.id === created.id)).toBe(true);

    const inactive = await caller.vendor.list({ page: 1, limit: 10, search: name, status: 'INACTIVE' });
    expect(inactive.data.some((row) => row.id === created.id)).toBe(false);

    const updated = await caller.vendor.update({ currentId: created.id, name, status: 'INACTIVE' });
    expect(updated.status).toBe('INACTIVE');

    expect((await caller.vendor.delete({ id: created.id })).success).toBe(true);
  });

  it('budgetLine: AREA + REGION scopes are stored, scope violation is rejected', async () => {
    const areaLineId = await createLine(500_000, { scope: 'AREA', areaId });
    expect((await caller.budgetLine.detail({ id: areaLineId })).areaId).toBe(areaId);

    const regionLineId = await createLine(750_000, { scope: 'REGION', regionId });
    expect((await caller.budgetLine.detail({ id: regionLineId })).regionId).toBe(regionId);

    // scope violation: REGION scope without regionId
    await expect(
      caller.budgetLine.create({ budgetTypeId, periodId: await createPeriod(), scope: 'REGION', amount: 100_000 }),
    ).rejects.toThrow(/regionId is required/i);
  });

  // KNOWN GAP — the @@unique([budgetTypeId, periodId, scope, regionId, areaId]) index is
  // NULLS DISTINCT in Postgres (verified: pg_index.indnullsnotdistinct = false). Every row
  // NULLs one of regionId/areaId, so the constraint never fires and budget-line.ts's
  // isUniqueViolation branch is unreachable. Flip to `it` once production dedupes
  // (partial unique indexes per scope, or an explicit pre-insert findFirst check).
  it('budgetLine: rejects a duplicate type/period/scope/region line', async () => {
    const periodId = await createPeriod();
    await createLineOn(periodId, 100_000, { scope: 'REGION', regionId });

    await expect(
      caller.budgetLine.create({ budgetTypeId, periodId, scope: 'REGION', regionId, amount: 100_000 }),
    ).rejects.toThrow(/already exists/i);
  });

  it('budget router: rejects a duplicate type/period/scope/area line', async () => {
    const periodId = await createPeriod();
    const line = await caller.budget.create({ budgetTypeId, periodId, scope: 'AREA', areaId, amount: 100_000 });
    createdLineIds.push(line.id);

    await expect(
      caller.budget.create({ budgetTypeId, periodId, scope: 'AREA', areaId, amount: 100_000 }),
    ).rejects.toThrow(/already exists/i);
  });

  it('budget router: rejects REGION scope without regionId', async () => {
    const periodId = await createPeriod();
    await expect(
      caller.budget.create({ budgetTypeId, periodId, scope: 'REGION', amount: 100_000 }),
    ).rejects.toThrow(/regionId is required/i);
  });
});

describe('budget line summary + hard block', () => {
  it('reports allocated/committed/spent/remaining for an empty line', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    expect(await summaryOf(lineId)).toEqual({
      allocated: 1_000_000, committed: 0, spent: 0, remaining: 1_000_000,
    });
  });

  it('counts an APPROVED program plannedCost as committed', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const program = await createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 400_000 }] });
    expect(Number(program.plannedCost)).toBe(400_000);

    expect((await summaryOf(lineId)).committed).toBe(0); // DRAFT is not committed
    await approve(program.id);

    expect(await summaryOf(lineId)).toEqual({
      allocated: 1_000_000, committed: 400_000, spent: 0, remaining: 600_000,
    });
  });

  it('blocks create when committed + plannedCost exceeds allocated', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const first = await createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 400_000 }] });
    await approve(first.id);

    await expect(
      createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 700_000 }] }),
    ).rejects.toThrow(/over-allocated/i);
  });

  it('blocks update over allocated but allows an update that fits', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const approved = await createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 400_000 }] });
    await approve(approved.id);

    const draft = await createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 300_000 }] });
    const payload = {
      currentId: draft.id,
      name: draft.name,
      actionTypeId,
      startDate,
      endDate,
      budgetCurrency: 'IDR',
      budgetLineId: lineId,
      areaId,
      picId: picUserId,
      skus: [],
      items: [],
      payments: [],
    };

    await expect(
      caller.actionProgram.update({ ...payload, outlets: [{ outletId, cost: 900_000 }] }),
    ).rejects.toThrow(/over-allocated/i);

    const updated = await caller.actionProgram.update({ ...payload, outlets: [{ outletId, cost: 500_000 }] });
    expect(Number(updated.plannedCost)).toBe(500_000);
  });

  it('rejects a program whose area does not match the line scope', async () => {
    const areaLineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    await expect(
      createProgram({ budgetLineId: areaLineId, areaId: areaBId, outlets: [{ outletId: outletBId, cost: 10_000 }] }),
    ).rejects.toThrow(/scope does not match/i);

    const regionLineId = await createLine(1_000_000, { scope: 'REGION', regionId });
    await expect(
      createProgram({ budgetLineId: regionLineId, areaId: areaBId, outlets: [{ outletId: outletBId, cost: 10_000 }] }),
    ).rejects.toThrow(/scope does not match/i);
  });

  it('counts a program payment that fits as spent', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const approved = await createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 400_000 }] });
    await approve(approved.id);

    // remaining = 1,000,000 − 400,000 = 600,000 → a 500,000 payment fits
    await createProgram({
      budgetLineId: lineId,
      outlets: [{ outletId, cost: 0 }],
      payments: [{ amount: 500_000, paymentDate: now.toISOString() }],
    });

    expect(await summaryOf(lineId)).toEqual({
      allocated: 1_000_000, committed: 400_000, spent: 500_000, remaining: 100_000,
    });
  });

  // KNOWN GAP — assertPaymentWithinBudget() exists in lib/budget-calc.ts but is called by
  // zero routers (verified by grep). action-program create/update only run
  // assertBudgetCapacity() on plannedCost, so nested payments bypass the hard block
  // entirely. Flip to `it` once action-program.ts calls assertPaymentWithinBudget.
  it('blocks a program payment that pushes spend past remaining', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const approved = await createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 400_000 }] });
    await approve(approved.id);

    // remaining = 1,000,000 − 400,000 − 0 = 600,000 → a 700,000 payment must be rejected
    await expect(
      createProgram({
        budgetLineId: lineId,
        outlets: [{ outletId, cost: 0 }],
        payments: [{ amount: 700_000, paymentDate: now.toISOString() }],
      }),
    ).rejects.toThrow(/over-allocated/i);
  });
});

describe('event proposal budget integration', () => {
  it('counts an APPROVED proposal plannedCost as committed', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const proposal = await createProposal({
      budgetLineId: lineId,
      miscItems: [{ name: 'Booth', quantity: 1, price: 600_000, total: 600_000 }],
    });
    expect(Number(proposal.plannedCost)).toBe(600_000);

    await prisma.eventProposal.update({ where: { id: proposal.id }, data: { approvalStatus: 'APPROVED' } });

    expect(await summaryOf(lineId)).toEqual({
      allocated: 1_000_000, committed: 600_000, spent: 0, remaining: 400_000,
    });
  });

  it('sums misc items + vendor amounts into plannedCost and counts vendor payments as spent', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const proposal = await createProposal({
      budgetLineId: lineId,
      miscItems: [{ name: 'Banner', quantity: 2, price: 50_000, total: 100_000 }],
      vendors: [{
        vendorId,
        amount: 300_000,
        payments: [{ amount: 100_000, paymentDate: now.toISOString() }],
      }],
    });
    expect(Number(proposal.plannedCost)).toBe(400_000);

    const detail = await caller.eventProposal.detail({ id: proposal.id });
    expect(detail.miscItems).toHaveLength(1);
    expect(Number(detail.miscItems[0]!.total)).toBe(100_000);
    expect(Number(detail.vendors[0]!.payments[0]!.amount)).toBe(100_000);

    expect((await summaryOf(lineId)).spent).toBe(100_000);
  });

  // KNOWN GAP — same missing assertPaymentWithinBudget() call: event-proposal create/update
  // validate plannedCost capacity only, so nested vendor payments never hit the hard block.
  // Flip to `it` once event-proposal.ts calls assertPaymentWithinBudget.
  it('blocks a vendor payment that pushes spend past remaining', async () => {
    const lineId = await createLine(1_000_000, { scope: 'AREA', areaId });
    const approved = await createProgram({ budgetLineId: lineId, outlets: [{ outletId, cost: 600_000 }] });
    await approve(approved.id);

    // remaining = 1,000,000 − 600,000 = 400,000 → a 500,000 vendor payment must be rejected
    await expect(
      createProposal({
        budgetLineId: lineId,
        vendors: [{ vendorId, amount: 0, payments: [{ amount: 500_000, paymentDate: now.toISOString() }] }],
      }),
    ).rejects.toThrow(/over-allocated/i);
  });
});

describe('sales order ↔ action program link', () => {
  it('links an approved program and rejects an outlet outside the program', async () => {
    const program = await createProgram({ outlets: [{ outletId, cost: 0 }] });
    await approve(program.id);

    const order = await caller.salesOrder.create({
      outletId,
      actionProgramId: program.id,
      date: now.toISOString(),
      currency: 'IDR',
      items: [{ skuId, quantity: 1, unitPrice: 10_000, lineTotal: 10_000, discountPercent: 0, taxPercent: 0 }],
      subtotal: 10_000, discountTotal: 0, taxTotal: 0, grandTotal: 10_000,
    });
    createdOrderIds.push(order.id);
    expect(order.actionProgramId).toBe(program.id);

    await expect(
      caller.salesOrder.create({
        outletId: outletBId,
        actionProgramId: program.id,
        date: now.toISOString(),
        currency: 'IDR',
        items: [{ skuId, quantity: 1, unitPrice: 10_000, lineTotal: 10_000, discountPercent: 0, taxPercent: 0 }],
        subtotal: 10_000, discountTotal: 0, taxTotal: 0, grandTotal: 10_000,
      }),
    ).rejects.toThrow(/not part of the action program/i);
  });

  it('suggestDiscounts returns the approved program discount percent', async () => {
    const program = await createProgram({
      outlets: [{ outletId, cost: 0 }],
      skus: [{
        skuId, quantity: 1, price: 10_000, discount: 2_000,
        priceAfterDiscount: 8_000, cost: 0, tax: 0, total: 8_000,
      }],
    });
    await approve(program.id);

    const suggestions = await caller.salesOrder.suggestDiscounts({
      outletId,
      date: now.toISOString(),
      skuIds: [skuId],
    });
    expect(suggestions[skuId]?.discountPercent).toBe(20);
    expect(suggestions[skuId]?.actionProgramId).toBe(program.id);
  });
});

describe('planned cost computation', () => {
  it('sums outlet + item + sku costs into plannedCost', async () => {
    const program = await createProgram({
      outlets: [{ outletId, cost: 100_000 }, { outletId: outletTwoId, cost: 50_000 }],
      items: [{ name: 'Banner', quantity: 1, price: 25_000, cost: 25_000 }],
      skus: [{
        skuId, quantity: 1, price: 10_000, discount: 0,
        priceAfterDiscount: 10_000, cost: 10_000, tax: 0, total: 10_000,
      }],
    });

    const detail = await caller.actionProgram.detail({ id: program.id });
    expect(Number(detail.plannedCost)).toBe(185_000);
  });
});

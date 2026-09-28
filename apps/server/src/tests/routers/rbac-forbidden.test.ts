import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole } from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

// Permission-denial coverage for the high-value routers that only had happy-path
// tests. The rule under test: a caller lacking a specific `resource@action` gets
// FORBIDDEN — not a silent success, not a 500. Each test proves the gate by
// putting the fixture in the state where the mutation *would* have succeeded,
// then re-reading the row to show nothing moved.

const ADMIN_PERMISSIONS = [
  'sales-order@read', 'sales-order@create', 'sales-order@update', 'sales-order@delete',
  'sales-order@propose', 'sales-order@approve',
  'budget-line@read', 'budget-line@create', 'budget-line@update', 'budget-line@delete',
  'budget-type@read', 'budget-type@create', 'budget-period@read', 'budget-period@create',
  'event-proposal@read', 'event-proposal@create', 'event-proposal@delete', 'event-proposal@validate',
  'user@read', 'user@create', 'user@update', 'user@delete',
  'role@read', 'role@create', 'role@update', 'role@delete',
  'permission@read', 'permission@create', 'permission@update', 'permission@delete',
  'region@read', 'region@create', 'area@read', 'area@create',
  'customer@read', 'customer@create', 'outlet@read', 'outlet@create',
  'sku@read', 'sku@create',
];

type Caller = ReturnType<typeof createCaller>;

let admin: Caller;
let adminRoleId: string;
/** Role holding zero permissions. */
let emptyCaller: Caller;
let emptyRoleId: string;
/** Role holding one unrelated permission — catches an "any role is enough" bug. */
let unrelatedCaller: Caller;
/** Holds exactly one approval tier, to prove tiers do not widen into each other. */
let areaOnlyCaller: Caller;

let regionId: string;
let areaId: string;
let customerId: string;
let outletId: string;
let skuId: string;
let budgetTypeId: string;

const actors: Array<{ userId: string; roleId: string }> = [];
const createdOrderIds: string[] = [];
const createdProposalIds: string[] = [];
const createdLineIds: string[] = [];
const createdPeriodIds: string[] = [];
const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];
const createdPermissionNames: string[] = [];

const uid = () => randomUUID().slice(0, 8);

const makeActor = async (tag: string, name: string, permissions: string[]) => {
  const role = await seedRoleWithPermissions(permissions);
  const user = await seedTestUser({
    roleId: role.id,
    email: `rbac-${tag}-${randomUUID()}@example.com`,
    name,
  });
  actors.push({ userId: user.id, roleId: role.id });
  return createCaller({ userId: user.id, email: user.email, name: user.name });
};

const newPeriod = async () => {
  const period = await admin.budgetPeriod.create({
    code: `BP-${uid()}`,
    name: `RBAC Period ${uid()}`,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'OPEN',
  });
  createdPeriodIds.push(period.id);
  return period.id;
};

const newBudgetLine = async () => {
  const line = await admin.budgetLine.create({
    budgetTypeId,
    periodId: await newPeriod(),
    scope: 'AREA',
    areaId,
    amount: 1_000_000,
  });
  createdLineIds.push(line.id);
  return line;
};

const newOrder = async () => {
  const order = await admin.salesOrder.create({
    outletId,
    items: [{ skuId, quantity: 2, unitPrice: 10_000, lineTotal: 20_000, discountPercent: 0, taxPercent: 0 }],
    currency: 'USD',
    subtotal: 20_000, grandTotal: 20_000, discountTotal: 0, taxTotal: 0,
  });
  createdOrderIds.push(order.id);
  return order.id;
};

/** A proposal in VALIDATING — the one state where approveArea would really mutate. */
const newValidatingProposal = async () => {
  const proposal = await admin.eventProposal.create({
    name: `RBAC Proposal ${uid()}`,
    eventDate: new Date().toISOString(),
    areaId,
    skus: [{ skuId, quantity: 2, price: 50_000, tax: 0, total: 100_000 }],
    miscItems: [],
    vendors: [],
    payments: [],
  });
  createdProposalIds.push(proposal.id);
  const validated = await admin.eventProposal.validate({ id: proposal.id });
  expect(validated.approvalStatus).toBe('VALIDATING');
  return proposal.id;
};

beforeAll(async () => {
  admin = await makeActor('admin', 'RBAC Admin', ADMIN_PERMISSIONS);
  emptyCaller = await makeActor('empty', 'RBAC No Permissions', []);
  unrelatedCaller = await makeActor('unrelated', 'RBAC Unrelated', ['region@read']);
  areaOnlyCaller = await makeActor('area', 'RBAC Area Only', ['event-proposal@read', 'event-proposal@approve-area']);
  adminRoleId = actors[0]!.roleId;
  emptyRoleId = actors[1]!.roleId;

  regionId = (await admin.region.create({ name: `RBAC Region ${uid()}` })).id;
  areaId = (await admin.area.create({ name: `RBAC Area ${uid()}`, regionId })).id;
  customerId = (await admin.customer.create({ name: `RBAC Customer ${uid()}` })).id;
  outletId = (await admin.outlet.create({ name: `RBAC Outlet ${uid()}`, customerId, areaId })).id;
  skuId = (await admin.sku.create({ name: `RBAC SKU ${uid()}`, basePrice: 10_000, baseUnit: 'pcs' })).id;
  budgetTypeId = (await admin.budgetType.create({ code: `BT-${uid()}`, name: 'RBAC Trade Promo' })).id;
});

afterAll(async () => {
  // No blanket .catch(): a delete that cannot run is a real leak and must fail
  // the file loudly rather than quietly polluting the dev database. Child → parent.
  // Notification.createdById has no cascade and notifications are children of
  // nobody, so sweep them first.
  if (createdOrderIds.length > 0) {
    await prisma.notification.deleteMany({ where: { targetType: 'SALES_ORDER', targetId: { in: createdOrderIds } } });
  }
  if (createdProposalIds.length > 0) {
    await prisma.notification.deleteMany({ where: { targetType: 'EVENT_PROPOSAL', targetId: { in: createdProposalIds } } });
  }
  for (const id of createdOrderIds) await prisma.salesOrder.delete({ where: { id } });
  for (const id of createdProposalIds) await prisma.eventProposal.delete({ where: { id } });
  for (const id of createdLineIds) await prisma.budgetLine.delete({ where: { id } });
  for (const id of createdPeriodIds) await prisma.budgetPeriod.delete({ where: { id } });
  if (createdUserIds.length > 0) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  if (createdRoleIds.length > 0) await prisma.role.deleteMany({ where: { id: { in: createdRoleIds } } });
  if (createdPermissionNames.length > 0) {
    await prisma.permission.deleteMany({ where: { name: { in: createdPermissionNames } } });
  }
  await prisma.budgetType.delete({ where: { id: budgetTypeId } });
  await prisma.sku.delete({ where: { id: skuId } });
  await prisma.outlet.delete({ where: { id: outletId } });
  await prisma.customer.delete({ where: { id: customerId } });
  await prisma.area.delete({ where: { id: areaId } });
  await prisma.region.delete({ where: { id: regionId } });
  // ActivityLog.userId and Notification.userId both cascade from the user.
  for (const actor of actors) await deleteTestUser(actor.userId);
  for (const actor of actors) await deleteTestRole(actor.roleId);
});

describe('sales-order permission denial', () => {
  it('denies create to a user with no permissions, writing nothing', async () => {
    const before = await prisma.salesOrder.count({ where: { outletId } });
    const input = {
      outletId,
      items: [{ skuId, quantity: 2, unitPrice: 10_000, lineTotal: 20_000, discountPercent: 0, taxPercent: 0 }],
      currency: 'USD',
      subtotal: 20_000, grandTotal: 20_000, discountTotal: 0, taxTotal: 0,
    };

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.salesOrder.create(input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.salesOrder.count({ where: { outletId } })).toBe(before);
  });

  it('denies propose, leaving the order DRAFT with no proposedAt', async () => {
    const id = await newOrder();
    expect((await prisma.salesOrder.findUniqueOrThrow({ where: { id } })).approvalStatus).toBe('DRAFT');

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.salesOrder.propose({ id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await prisma.salesOrder.findUniqueOrThrow({ where: { id } });
    expect(after.approvalStatus).toBe('DRAFT');
    expect(after.proposedAt).toBeNull();
  });

  it('denies approve, leaving the order PROPOSED and unapproved', async () => {
    const id = await newOrder();
    await prisma.salesOrder.update({ where: { id }, data: { approvalStatus: 'PROPOSED' } });

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.salesOrder.approve({ id, message: 'sneaky' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await prisma.salesOrder.findUniqueOrThrow({ where: { id } });
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.approvedById).toBeNull();
    expect(after.approvedAt).toBeNull();
  });

  it('denies delete, leaving the order in place', async () => {
    const id = await newOrder();
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.salesOrder.delete({ id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.salesOrder.findUnique({ where: { id } })).not.toBeNull();
  });

  it('denies list and detail', async () => {
    const id = await newOrder();
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.salesOrder.list({ page: 1, limit: 10 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.salesOrder.detail({ id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
  });
});

describe('budget permission denial', () => {
  it('denies budgetLine.create, writing no row', async () => {
    const before = await prisma.budgetLine.count({ where: { areaId } });
    const input = { budgetTypeId, periodId: await newPeriod(), scope: 'AREA' as const, areaId, amount: 500_000 };

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.budgetLine.create(input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.budgetLine.count({ where: { areaId } })).toBe(before);
  });

  it('denies budgetLine.update and keeps the amount intact', async () => {
    const line = await newBudgetLine();
    const patch = { currentId: line.id, budgetTypeId, periodId: line.periodId, scope: 'AREA' as const, areaId, amount: 1 };

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.budgetLine.update(patch)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(Number((await prisma.budgetLine.findUniqueOrThrow({ where: { id: line.id } })).amount)).toBe(1_000_000);
  });

  it('denies budgetLine.delete and leaves the line in place', async () => {
    const line = await newBudgetLine();
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.budgetLine.delete({ id: line.id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.budgetLine.findUnique({ where: { id: line.id } })).not.toBeNull();
  });

  it('gates the /budget/* alias router on the same budget-line@* permissions', async () => {
    const line = await newBudgetLine();
    const before = await prisma.budgetLine.count({ where: { areaId } });

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.budget.create({
        budgetTypeId, periodId: await newPeriod(), scope: 'AREA', areaId, amount: 500_000,
      })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.budget.update({
        currentId: line.id, budgetTypeId, periodId: line.periodId, scope: 'AREA', areaId, amount: 1,
      })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.budget.delete({ id: line.id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    expect(await prisma.budgetLine.count({ where: { areaId } })).toBe(before);
    expect(Number((await prisma.budgetLine.findUniqueOrThrow({ where: { id: line.id } })).amount)).toBe(1_000_000);
  });

  it('denies budgetType and budgetPeriod creation', async () => {
    const types = await prisma.budgetType.count();
    const periods = await prisma.budgetPeriod.count();

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.budgetType.create({ code: `BT-${uid()}`, name: 'Nope' }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.budgetPeriod.create({
        code: `BP-${uid()}`, name: 'Nope', startDate: '2026-01-01', endDate: '2026-12-31', status: 'OPEN',
      })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    expect(await prisma.budgetType.count()).toBe(types);
    expect(await prisma.budgetPeriod.count()).toBe(periods);
  });
});

describe('event-proposal permission denial', () => {
  it('denies create, writing no row', async () => {
    const before = await prisma.eventProposal.count({ where: { areaId } });
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.eventProposal.create({
        name: `RBAC Nope ${uid()}`,
        eventDate: new Date().toISOString(),
        areaId,
        skus: [],
        miscItems: [],
        vendors: [],
        payments: [],
      })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.eventProposal.count({ where: { areaId } })).toBe(before);
  });

  it('denies delete, leaving the proposal in place', async () => {
    const id = await newValidatingProposal();
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.eventProposal.delete({ id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.eventProposal.findUnique({ where: { id } })).not.toBeNull();
  });

  it('denies approveArea, leaving the ladder untouched', async () => {
    const id = await newValidatingProposal();
    const before = await prisma.eventProposal.findUniqueOrThrow({ where: { id } });

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.eventProposal.approveArea({ id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await prisma.eventProposal.findUniqueOrThrow({ where: { id } });
    expect(after.approvalStatus).toBe('VALIDATING');
    expect(after.areaManagerApprovedAt).toBeNull();
    expect(after.areaManagerApprovedById).toBeNull();
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it('does not let one tier permission reach the rungs above it', async () => {
    const id = await newValidatingProposal();

    // approve-area is the only gate this caller owns, and it only opens rung 1.
    expect((await areaOnlyCaller.eventProposal.approveArea({ id })).approvalStatus).toBe('PROPOSED');

    for (const call of [
      () => areaOnlyCaller.eventProposal.approveRegion({ id }),
      () => areaOnlyCaller.eventProposal.approveFinance({ id }),
      () => areaOnlyCaller.eventProposal.approveDirector({ id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await prisma.eventProposal.findUniqueOrThrow({ where: { id } });
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.regionManagerApprovedById).toBeNull();
    expect(after.financeManagerApprovedById).toBeNull();
    expect(after.directorApprovedById).toBeNull();
  });

  it('denies update', async () => {
    const id = await newValidatingProposal();
    const name = await prisma.eventProposal.findUniqueOrThrow({ where: { id } }).then((row) => row.name);

    await expect(emptyCaller.eventProposal.update({
      currentId: id,
      name: 'Hijacked',
      eventDate: new Date().toISOString(),
      areaId,
      currency: 'USD',
      skus: [],
      miscItems: [],
      vendors: [],
      payments: [],
    })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect((await prisma.eventProposal.findUniqueOrThrow({ where: { id } })).name).toBe(name);
  });
});

describe('user, role and access-control permission denial', () => {
  it('denies user.create — the privilege-escalation vector', async () => {
    const email = `rbac-escalate-${randomUUID()}@example.com`;
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.user.create({ name: 'Backdoor', email, password: 'Test1234!', roleId: adminRoleId }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('denies user.update, leaving the target untouched', async () => {
    const target = await admin.user.create({
      name: 'RBAC Update Target',
      email: `rbac-target-${randomUUID()}@example.com`,
      password: 'Test1234!',
      roleId: adminRoleId,
    });
    createdUserIds.push(target.id);

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.user.update({ currentId: target.id, name: 'Hijacked', roleId: emptyRoleId }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.name).toBe('RBAC Update Target');
    expect(after.roleId).toBe(adminRoleId);
  });

  it('denies user.delete, leaving the account in place', async () => {
    const target = await admin.user.create({
      name: 'RBAC Delete Target',
      email: `rbac-delete-${randomUUID()}@example.com`,
      password: 'Test1234!',
      roleId: adminRoleId,
    });
    createdUserIds.push(target.id);

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.user.delete({ id: target.id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });

  it('denies role.create with permissionIds — the second escalation vector', async () => {
    const name = `RBAC_ROLE_${randomUUID()}`;
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.accessControl.role.create({ name, permissionIds: [adminRoleId] }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.role.findFirst({ where: { name } })).toBeNull();
  });

  it('denies role.update, so permissions cannot be granted sideways', async () => {
    const role = await admin.accessControl.role.create({ name: `RBAC_ROLE_UPDATE_${randomUUID()}` });
    createdRoleIds.push(role.id);

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.accessControl.role.update({ currentId: role.id, permissionIds: [adminRoleId] }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.roleHasPermission.count({ where: { roleId: role.id } })).toBe(0);
  });

  it('denies role.delete and leaves the role in place', async () => {
    const role = await admin.accessControl.role.create({ name: `RBAC_ROLE_DELETE_${randomUUID()}` });
    createdRoleIds.push(role.id);
    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.accessControl.role.delete({ id: role.id })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.role.findUnique({ where: { id: role.id } })).not.toBeNull();
  });

  it('gates the nested accessControl.permission router too', async () => {
    const name = `RBAC_PERMISSION_${randomUUID()}`;
    createdPermissionNames.push(name);

    for (const caller of [emptyCaller, unrelatedCaller]) {
      await expect(caller.accessControl.permission.create({ name })).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.accessControl.permission.list({ page: 1, limit: 10 }))
        .rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    expect(await prisma.permission.findUnique({ where: { name } })).toBeNull();
  });

  it('denies every gated mutation to an unauthenticated caller', async () => {
    const anon = createCaller(null);
    const orderId = await newOrder();
    const proposalId = await newValidatingProposal();
    const line = await newBudgetLine();
    const target = await admin.user.create({
      name: 'RBAC Anon Target',
      email: `rbac-anon-${randomUUID()}@example.com`,
      password: 'Test1234!',
      roleId: adminRoleId,
    });
    createdUserIds.push(target.id);

    const calls: Array<[string, () => Promise<unknown>]> = [
      ['salesOrder.create', () => anon.salesOrder.create({
        outletId,
        items: [{ skuId, quantity: 1, unitPrice: 10_000, lineTotal: 10_000, discountPercent: 0, taxPercent: 0 }],
        currency: 'USD', subtotal: 10_000, grandTotal: 10_000, discountTotal: 0, taxTotal: 0,
      })],
      ['salesOrder.propose', () => anon.salesOrder.propose({ id: orderId })],
      ['salesOrder.approve', () => anon.salesOrder.approve({ id: orderId })],
      ['budgetLine.delete', () => anon.budgetLine.delete({ id: line.id })],
      ['eventProposal.approveArea', () => anon.eventProposal.approveArea({ id: proposalId })],
      ['user.delete', () => anon.user.delete({ id: target.id })],
      ['accessControl.role.create', () => anon.accessControl.role.create({ name: `RBAC_ANON_${uid()}` })],
    ];

    for (const [label, call] of calls) {
      await expect(call(), `${label} must be UNAUTHORIZED`).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    }

    expect(await prisma.salesOrder.findUnique({ where: { id: orderId } })).not.toBeNull();
    expect(await prisma.budgetLine.findUnique({ where: { id: line.id } })).not.toBeNull();
    expect((await prisma.eventProposal.findUniqueOrThrow({ where: { id: proposalId } })).approvalStatus)
      .toBe('VALIDATING');
    expect(await prisma.user.findUnique({ where: { id: target.id } })).not.toBeNull();
  });
});

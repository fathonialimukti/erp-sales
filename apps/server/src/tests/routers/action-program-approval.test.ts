import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

// 4-tier approval: Area Manager → Regional Manager → Finance → Director.
// Every tier has its own permission AND its own state guard, so the ladder can
// only be trusted if both are asserted — hence this file asserts the persisted
// approvalStatus + *ApprovedAt/*ApprovedById pair at every rung, the ordering
// that makes tiering worth having, and the per-tier FORBIDDEN denial.

const START = new Date(Date.now() - 86_400_000).toISOString();
const END = new Date(Date.now() + 86_400_000).toISOString();

type Caller = ReturnType<typeof createCaller>;
type Actor = { caller: Caller; userId: string };

let creator: Actor;
let picUserId: string;
let areaApprover: Actor;
let regionApprover: Actor;
let financeApprover: Actor;
let directorApprover: Actor;
/** Role with zero permissions — proves the gate fires on an empty grant set. */
let outsider: Actor;
/** Role holding one unrelated permission — proves the gate is per-permission, not "has any role". */
let unrelated: Actor;

let regionId: string;
let areaId: string;
let customerId: string;
let outletId: string;
let actionTypeId: string;

const createdProgramIds: string[] = [];
const actors: Array<{ userId: string; roleId: string }> = [];

const makeActor = async (tag: string, name: string, permissions: string[]): Promise<Actor> => {
  const role = await seedRoleWithPermissions(permissions);
  const user = await seedTestUser({
    roleId: role.id,
    email: `apap-${tag}-${randomUUID()}@example.com`,
    name,
  });
  actors.push({ userId: user.id, roleId: role.id });
  return { caller: createCaller({ userId: user.id, email: user.email, name: user.name }), userId: user.id };
};

beforeAll(async () => {
  creator = await makeActor('creator', 'AP Creator', [
    'action-program@read', 'action-program@create', 'action-program@validate',
    'region@read', 'region@create', 'area@read', 'area@create',
    'customer@read', 'customer@create', 'outlet@read', 'outlet@create',
    'action-type@create',
  ]);
  const pic = await makeActor('pic', 'AP Pic', ['region@read']);
  picUserId = pic.userId;
  areaApprover = await makeActor('area', 'AP Area Manager', [
    'action-program@read', 'action-program@approve-area',
  ]);
  regionApprover = await makeActor('region', 'AP Regional Manager', [
    'action-program@read', 'action-program@approve-region',
  ]);
  financeApprover = await makeActor('finance', 'AP Finance PIC', [
    'action-program@read', 'action-program@approve-finance',
  ]);
  directorApprover = await makeActor('director', 'AP Director', [
    'action-program@read', 'action-program@approve-director',
  ]);
  outsider = await makeActor('outsider', 'AP Outsider', []);
  unrelated = await makeActor('unrelated', 'AP Unrelated', ['region@read']);

  regionId = (await creator.caller.region.create({ name: `AP Approval Region ${randomUUID()}` })).id;
  areaId = (await creator.caller.area.create({ name: `AP Approval Area ${randomUUID()}`, regionId })).id;
  customerId = (await creator.caller.customer.create({ name: `AP Approval Customer ${randomUUID()}` })).id;
  outletId = (await creator.caller.outlet.create({ name: `AP Approval Outlet ${randomUUID()}`, customerId, areaId })).id;
  actionTypeId = (await creator.caller.actionType.create({
    code: `APAP-${randomUUID().slice(0, 8)}`,
    name: 'AP Approval Action Type',
  })).id;
});

afterAll(async () => {
  // No blanket .catch(): an undeletable row is a real leak and must fail the file
  // loudly rather than quietly polluting the dev database. Child → parent.
  // Notification.createdById has no cascade and notifications are children of
  // nobody, so sweep them first.
  if (createdProgramIds.length > 0) {
    await prisma.notification.deleteMany({
      where: { targetType: 'ACTION_PROGRAM', targetId: { in: createdProgramIds } },
    });
  }
  for (const id of createdProgramIds) {
    await prisma.actionProgram.delete({ where: { id } });
  }
  await prisma.actionType.delete({ where: { id: actionTypeId } });
  await prisma.outlet.delete({ where: { id: outletId } });
  await prisma.customer.delete({ where: { id: customerId } });
  await prisma.area.delete({ where: { id: areaId } });
  await prisma.region.delete({ where: { id: regionId } });
  // ActivityLog.userId and Notification.userId both cascade from the user.
  for (const actor of actors) {
    await deleteTestUser(actor.userId);
  }
  for (const actor of actors) {
    await deleteTestRole(actor.roleId);
  }
});

/** A DRAFT program that satisfies every rule in validateActionProgram. */
const newProgram = async (label: string) => {
  const created = await creator.caller.actionProgram.create({
    name: `AP Approval ${label} ${randomUUID()}`,
    actionTypeId,
    startDate: START,
    endDate: END,
    areaId,
    picId: picUserId,
    outlets: [{ outletId, cost: 50_000 }],
    skus: [],
    items: [{ name: `Banner ${label}`, quantity: 2, price: 25_000, cost: 50_000 }],
    payments: [],
  });
  createdProgramIds.push(created.id);
  return created.id;
};

/** Drives a fresh program through the real DRAFT → VALIDATING transition. */
const toValidating = async (label: string) => {
  const id = await newProgram(label);
  const validated = await creator.caller.actionProgram.validate({ id });
  expect(validated.approvalStatus).toBe('VALIDATING');
  return id;
};

const read = (id: string) => prisma.actionProgram.findUniqueOrThrow({ where: { id } });

const approvals = (row: Awaited<ReturnType<typeof read>>) => ({
  area: row.areaManagerApprovedAt,
  region: row.regionManagerApprovedAt,
  finance: row.financeManagerApprovedAt,
  director: row.directorApprovedAt,
});

const approvalActivity = (id: string) =>
  prisma.activityLog.findMany({
    where: { resource: 'action_program', resourceId: id, action: 'APPROVE' },
    orderBy: { createdAt: 'asc' },
  });

const approvalNotifications = (id: string) =>
  prisma.notification.findMany({
    where: { targetType: 'ACTION_PROGRAM', targetId: id },
    orderBy: { createdAt: 'asc' },
  });

describe('action-program 4-tier approval ladder', () => {
  it('walks VALIDATING → PROPOSED → APPROVED, stamping each tier with its own approver', async () => {
    const id = await toValidating('ladder');

    // Rung 0 — validation opens the ladder and approves nothing itself.
    const opened = await read(id);
    expect(opened.approvalStatus).toBe('VALIDATING');
    expect(approvals(opened)).toEqual({ area: null, region: null, finance: null, director: null });

    // Rung 1 — Area Manager.
    const afterArea = await areaApprover.caller.actionProgram.approveArea({ id, message: 'Area ok' });
    expect(afterArea.approvalStatus).toBe('PROPOSED');
    const areaRow = await read(id);
    expect(areaRow.areaManagerApprovedById).toBe(areaApprover.userId);
    expect(areaRow.areaManagerApprovedAt).not.toBeNull();
    expect(areaRow.regionManagerApprovedAt).toBeNull();
    expect(areaRow.financeManagerApprovedAt).toBeNull();
    expect(areaRow.directorApprovedAt).toBeNull();

    // Rung 2 — Regional Manager. Status stays PROPOSED; only the stamp moves.
    const afterRegion = await regionApprover.caller.actionProgram.approveRegion({ id, message: 'Region ok' });
    expect(afterRegion.approvalStatus).toBe('PROPOSED');
    const regionRow = await read(id);
    expect(regionRow.regionManagerApprovedById).toBe(regionApprover.userId);
    expect(regionRow.regionManagerApprovedAt).not.toBeNull();
    expect(regionRow.financeManagerApprovedAt).toBeNull();
    expect(regionRow.directorApprovedAt).toBeNull();

    // Rung 3 — Finance PIC.
    const afterFinance = await financeApprover.caller.actionProgram.approveFinance({ id, message: 'Budget ok' });
    expect(afterFinance.approvalStatus).toBe('PROPOSED');
    const financeRow = await read(id);
    expect(financeRow.financeManagerApprovedById).toBe(financeApprover.userId);
    expect(financeRow.financeManagerApprovedAt).not.toBeNull();
    expect(financeRow.directorApprovedAt).toBeNull();

    // Rung 4 — Director is the only rung that closes the ladder.
    const afterDirector = await directorApprover.caller.actionProgram.approveDirector({ id, message: 'Signed off' });
    expect(afterDirector.approvalStatus).toBe('APPROVED');
    const finalRow = await read(id);
    expect(finalRow.directorApprovedById).toBe(directorApprover.userId);
    expect(finalRow.directorApprovedAt).not.toBeNull();

    // Timestamps must be monotonic — that ordering IS the tiering.
    const stamps = approvals(finalRow);
    expect(stamps.area!.getTime()).toBeLessThan(stamps.region!.getTime());
    expect(stamps.region!.getTime()).toBeLessThan(stamps.finance!.getTime());
    expect(stamps.finance!.getTime()).toBeLessThan(stamps.director!.getTime());

    const history = finalRow.approvalHistory as Array<{ process: string; name: string }>;
    expect(history.map((entry) => entry.process)).toEqual([
      'AI Validation',
      'Area Manager',
      'Regional Manager',
      'Finance PIC',
      'Director',
    ]);
    expect(history[1]!.name).toBe('AP Area Manager');
  });

  it('writes one APPROVE activity log per tier, attributed to that tier’s approver', async () => {
    const id = await toValidating('activity');
    await areaApprover.caller.actionProgram.approveArea({ id });
    await regionApprover.caller.actionProgram.approveRegion({ id });
    await financeApprover.caller.actionProgram.approveFinance({ id });
    await directorApprover.caller.actionProgram.approveDirector({ id });

    const logs = await approvalActivity(id);
    // Five APPROVE rows: AI validation plus the four approval tiers.
    expect(logs).toHaveLength(5);

    for (const [userId, message] of [
      [areaApprover.userId, 'Area Manager approved'],
      [regionApprover.userId, 'Region Manager approved'],
      [financeApprover.userId, 'Finance approved'],
      [directorApprover.userId, 'Director approved'],
    ] as const) {
      const log = logs.find((row) => row.userId === userId && row.message.includes(message));
      expect(log, `no APPROVE log for "${message}"`).toBeTruthy();
    }

    // One notification per rung, all addressed to the program's creator.
    const notifications = await approvalNotifications(id);
    expect(notifications).toHaveLength(4);
    expect(notifications.every((n) => n.userId === creator.userId)).toBe(true);
    expect(notifications[notifications.length - 1]!.type).toBe('SUCCESS');
  });
});

describe('action-program approval ordering', () => {
  it('refuses approveRegion before approveArea, leaving the row untouched', async () => {
    const id = await toValidating('early-region');
    const before = await read(id);

    await expect(regionApprover.caller.actionProgram.approveRegion({ id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.approvalStatus).toBe('VALIDATING');
    expect(approvals(after)).toEqual({ area: null, region: null, finance: null, director: null });
    // updatedAt is @updatedAt — unchanged means no write was even attempted.
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(await approvalActivity(id)).toHaveLength(1); // validation only
    expect(await approvalNotifications(id)).toHaveLength(0);
  });

  it('refuses approveFinance before approveRegion', async () => {
    const id = await toValidating('early-finance');
    await areaApprover.caller.actionProgram.approveArea({ id });
    const before = await read(id);

    await expect(financeApprover.caller.actionProgram.approveFinance({ id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.financeManagerApprovedAt).toBeNull();
    expect(after.financeManagerApprovedById).toBeNull();
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(await approvalNotifications(id)).toHaveLength(1);
  });

  it('refuses approveDirector before approveFinance', async () => {
    const id = await toValidating('early-director');
    await areaApprover.caller.actionProgram.approveArea({ id });
    await regionApprover.caller.actionProgram.approveRegion({ id });
    const before = await read(id);

    await expect(directorApprover.caller.actionProgram.approveDirector({ id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.directorApprovedAt).toBeNull();
    expect(after.directorApprovedById).toBeNull();
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(await approvalNotifications(id)).toHaveLength(2);
  });

  it('refuses approveArea on a program that never entered VALIDATING', async () => {
    const id = await newProgram('draft-only');
    await expect(areaApprover.caller.actionProgram.approveArea({ id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    const after = await read(id);
    expect(after.approvalStatus).toBe('DRAFT');
    expect(approvals(after)).toEqual({ area: null, region: null, finance: null, director: null });
  });
});

describe('action-program approval is single-shot', () => {
  it('rejects a second approveArea and leaves the first approval byte-identical', async () => {
    const id = await toValidating('double-area');
    await areaApprover.caller.actionProgram.approveArea({ id, message: 'First' });
    const first = await read(id);

    await expect(areaApprover.caller.actionProgram.approveArea({ id, message: 'Second' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.areaManagerApprovedById).toBe(first.areaManagerApprovedById);
    expect(after.areaManagerApprovedAt!.getTime()).toBe(first.areaManagerApprovedAt!.getTime());
    expect(after.updatedAt.getTime()).toBe(first.updatedAt.getTime());
    // The rejected call must not add a history entry, a log row or a notification.
    expect((after.approvalHistory as unknown[]).length).toBe(2);
    expect(await approvalActivity(id)).toHaveLength(2);
    expect(await approvalNotifications(id)).toHaveLength(1);
  });

  it('rejects a second approveRegion via the conditional updateMany guard', async () => {
    const id = await toValidating('double-region');
    await areaApprover.caller.actionProgram.approveArea({ id });
    await regionApprover.caller.actionProgram.approveRegion({ id, message: 'First' });
    const first = await read(id);

    // Status is still PROPOSED, so the pre-check passes and the failure has to
    // come from `regionManagerApprovedAt: null` inside the guarded updateMany.
    expect(first.approvalStatus).toBe('PROPOSED');
    await expect(regionApprover.caller.actionProgram.approveRegion({ id, message: 'Second' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.regionManagerApprovedById).toBe(first.regionManagerApprovedById);
    expect(after.regionManagerApprovedAt!.getTime()).toBe(first.regionManagerApprovedAt!.getTime());
    expect(after.updatedAt.getTime()).toBe(first.updatedAt.getTime());
    expect(await approvalNotifications(id)).toHaveLength(2);
  });

  it('rejects a second approveFinance via the conditional updateMany guard', async () => {
    const id = await toValidating('double-finance');
    await areaApprover.caller.actionProgram.approveArea({ id });
    await regionApprover.caller.actionProgram.approveRegion({ id });
    await financeApprover.caller.actionProgram.approveFinance({ id, message: 'First' });
    const first = await read(id);

    expect(first.approvalStatus).toBe('PROPOSED');
    await expect(financeApprover.caller.actionProgram.approveFinance({ id, message: 'Second' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.financeManagerApprovedById).toBe(first.financeManagerApprovedById);
    expect(after.financeManagerApprovedAt!.getTime()).toBe(first.financeManagerApprovedAt!.getTime());
    expect(after.updatedAt.getTime()).toBe(first.updatedAt.getTime());
  });

  it('rejects a second approveDirector and keeps the program APPROVED by the first one', async () => {
    const id = await toValidating('double-director');
    await areaApprover.caller.actionProgram.approveArea({ id });
    await regionApprover.caller.actionProgram.approveRegion({ id });
    await financeApprover.caller.actionProgram.approveFinance({ id });
    await directorApprover.caller.actionProgram.approveDirector({ id, message: 'First' });
    const first = await read(id);

    await expect(directorApprover.caller.actionProgram.approveDirector({ id, message: 'Second' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.approvalStatus).toBe('APPROVED');
    expect(after.directorApprovedById).toBe(first.directorApprovedById);
    expect(after.directorApprovedAt!.getTime()).toBe(first.directorApprovedAt!.getTime());
    expect(after.updatedAt.getTime()).toBe(first.updatedAt.getTime());
    expect(await approvalNotifications(id)).toHaveLength(4);
  });

  it('holds approveArea back when the row is stale-validating but already stamped', async () => {
    // Simulates a lost update: two requests read VALIDATING, the first commits,
    // the second then writes against a status it no longer owns. Forcing the
    // status back by hand is the only way to reach the
    // `areaManagerApprovedAt: null` term of the updateMany guard — the pre-check
    // on approvalStatus intercepts every double-approve reachable through the API.
    const id = await toValidating('lost-update');
    await areaApprover.caller.actionProgram.approveArea({ id, message: 'Winner' });
    await prisma.actionProgram.update({
      where: { id },
      data: { approvalStatus: 'VALIDATING', approvalHistory: [] },
    });
    const stale = await read(id);
    expect(stale.approvalStatus).toBe('VALIDATING');
    expect(stale.areaManagerApprovedAt).not.toBeNull();

    await expect(areaApprover.caller.actionProgram.approveArea({ id, message: 'Loser' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await read(id);
    expect(after.areaManagerApprovedAt!.getTime()).toBe(stale.areaManagerApprovedAt!.getTime());
    expect(after.areaManagerApprovedById).toBe(stale.areaManagerApprovedById);
    expect(after.updatedAt.getTime()).toBe(stale.updatedAt.getTime());
  });
});

describe('action-program approval permissions are per tier', () => {
  it('denies every rung to a user with no permissions at all', async () => {
    const id = await toValidating('deny-outsider');
    const before = await read(id);

    for (const call of [
      () => outsider.caller.actionProgram.approveArea({ id }),
      () => outsider.caller.actionProgram.approveRegion({ id }),
      () => outsider.caller.actionProgram.approveFinance({ id }),
      () => outsider.caller.actionProgram.approveDirector({ id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await read(id);
    expect(after.approvalStatus).toBe('VALIDATING');
    expect(approvals(after)).toEqual({ area: null, region: null, finance: null, director: null });
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
  });

  it('denies every rung to a user holding only an unrelated permission', async () => {
    const id = await toValidating('deny-unrelated');

    for (const call of [
      () => unrelated.caller.actionProgram.approveArea({ id }),
      () => unrelated.caller.actionProgram.approveRegion({ id }),
      () => unrelated.caller.actionProgram.approveFinance({ id }),
      () => unrelated.caller.actionProgram.approveDirector({ id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await read(id);
    expect(after.approvalStatus).toBe('VALIDATING');
    expect(approvals(after)).toEqual({ area: null, region: null, finance: null, director: null });
  });

  it('does not let the Area Manager self-promote through the rungs above', async () => {
    const id = await toValidating('deny-self-promote');
    await areaApprover.caller.actionProgram.approveArea({ id });

    // approve-area grants nothing at rungs 2-4.
    for (const call of [
      () => areaApprover.caller.actionProgram.approveRegion({ id }),
      () => areaApprover.caller.actionProgram.approveFinance({ id }),
      () => areaApprover.caller.actionProgram.approveDirector({ id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await read(id);
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.regionManagerApprovedById).toBeNull();
    expect(after.financeManagerApprovedById).toBeNull();
    expect(after.directorApprovedById).toBeNull();
  });

  it('keeps each rung exclusive to its own permission', async () => {
    const id = await toValidating('deny-per-rung');
    await areaApprover.caller.actionProgram.approveArea({ id });
    await regionApprover.caller.actionProgram.approveRegion({ id });
    await financeApprover.caller.actionProgram.approveFinance({ id });

    // Every approver, on every rung they do not own.
    const denials: Array<[string, () => Promise<unknown>]> = [
      ['area→region', () => areaApprover.caller.actionProgram.approveRegion({ id })],
      ['area→finance', () => areaApprover.caller.actionProgram.approveFinance({ id })],
      ['area→director', () => areaApprover.caller.actionProgram.approveDirector({ id })],
      ['region→area', () => regionApprover.caller.actionProgram.approveArea({ id })],
      ['region→finance', () => regionApprover.caller.actionProgram.approveFinance({ id })],
      ['region→director', () => regionApprover.caller.actionProgram.approveDirector({ id })],
      ['finance→area', () => financeApprover.caller.actionProgram.approveArea({ id })],
      ['finance→region', () => financeApprover.caller.actionProgram.approveRegion({ id })],
      ['finance→director', () => financeApprover.caller.actionProgram.approveDirector({ id })],
      ['director→area', () => directorApprover.caller.actionProgram.approveArea({ id })],
      ['director→region', () => directorApprover.caller.actionProgram.approveRegion({ id })],
      ['director→finance', () => directorApprover.caller.actionProgram.approveFinance({ id })],
    ];

    for (const [label, call] of denials) {
      await expect(call(), `${label} must be FORBIDDEN`).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const after = await read(id);
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.areaManagerApprovedById).toBe(areaApprover.userId);
    expect(after.regionManagerApprovedById).toBe(regionApprover.userId);
    expect(after.financeManagerApprovedById).toBe(financeApprover.userId);
    expect(after.directorApprovedById).toBeNull();
  });

  it('denies unauthenticated approval before the permission gate', async () => {
    const id = await toValidating('deny-anon');
    for (const call of [
      () => createCaller(null).actionProgram.approveArea({ id }),
      () => createCaller(null).actionProgram.approveDirector({ id }),
    ]) {
      await expect(call()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    }
    const after = await read(id);
    expect(after.approvalStatus).toBe('VALIDATING');
    expect(approvals(after)).toEqual({ area: null, region: null, finance: null, director: null });
  });
});

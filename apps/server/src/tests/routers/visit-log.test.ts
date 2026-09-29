import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { createCaller } from '../helpers/caller.js';
import {
  seedRoleWithPermissions, seedTestUser, deleteTestUser, deleteTestRole,
  seedTestRegion, deleteTestRegion, seedTestArea, deleteTestArea,
  seedTestCustomer, deleteTestCustomer, seedTestOutlet, deleteTestOutlet,
} from '../helpers/seed.js';
import { prisma } from '../../lib/prisma.js';

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorRoleId: string;
let regionId: string;
let areaId: string;
let customerId: string;
let outletId: string;
const createdVisitIds: string[] = [];

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'visit-log@read', 'visit-log@create', 'visit-log@update', 'visit-log@delete',
    // submit/approve/reject sit behind these; validate is the only way into
    // VALIDATING, so the approval flow cannot be driven without it.
    'visit-log@validate',
    'region@read', 'region@create', 'area@read', 'area@create',
    'customer@read', 'customer@create', 'outlet@read', 'outlet@create',
  ]);
  actorRoleId = role.id;
  const actor = await seedTestUser({
    roleId: actorRoleId,
    email: `visit-actor-${randomUUID()}@example.com`,
    name: 'Visit Actor',
  });
  actorUserId = actor.id;
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
  regionId = (await caller.region.create({ name: `Visit Test Region ${randomUUID()}` })).id;
  areaId = (await caller.area.create({ name: `Visit Test Area ${randomUUID()}`, regionId })).id;
  customerId = (await caller.customer.create({ name: `Visit Test Customer ${randomUUID()}` })).id;
  outletId = (await caller.outlet.create({ name: `Visit Test Outlet ${randomUUID()}`, customerId, areaId })).id;
});

afterAll(async () => {
  // Notification has no FK onto a visit log (targetId is a bare string) and is a
  // child of nobody, so sweep it by targetId before the rows it describes go —
  // same ordering rule as action-program-approval.test.ts.
  if (createdVisitIds.length > 0) {
    await prisma.notification.deleteMany({
      where: { targetType: 'VISIT_LOG', targetId: { in: createdVisitIds } },
    });
  }
  for (const id of createdVisitIds) {
    await prisma.visitLog.delete({ where: { id } }).catch(() => {});
  }
  await deleteTestOutlet(outletId);
  await deleteTestCustomer(customerId);
  await deleteTestArea(areaId);
  await deleteTestRegion(regionId);
  await deleteTestUser(actorUserId);
  await deleteTestRole(actorRoleId);
});

describe('visit-log router', () => {
  it('lists visit logs', async () => {
    const result = await caller.visitLog.list({ page: 1, limit: 10 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toBeDefined();
  });

  it('creates, reads, updates, and deletes a visit log', async () => {
    const created = await caller.visitLog.create({
      salesmanId: actorUserId,
      outletId,
      date: new Date().toISOString(),
    });
    expect(created.id).toBeTruthy();
    createdVisitIds.push(created.id);

    const detail = await caller.visitLog.detail({ id: created.id });
    expect(detail.id).toBe(created.id);

    const updated = await caller.visitLog.update({
      currentId: created.id,
      salesmanId: actorUserId,
      outletId,
      date: new Date().toISOString(),
      notes: 'Updated notes',
    });
    expect(updated.notes).toBe('Updated notes');

    const activity = await prisma.activityLog.findFirst({
      where: { resource: 'visit_log', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(activity).toBeTruthy();

    const del = await caller.visitLog.delete({ id: created.id });
    expect(del.success).toBe(true);
    createdVisitIds.splice(createdVisitIds.indexOf(created.id), 1);
  });
});

// --- Approval flow ---------------------------------------------------------
// DRAFT → validate → VALIDATING → submit → PROPOSED → approve / reject.
// This block exists because none of it was ever covered: visit-log wrote an
// `approvalHistory` field the VisitLog model did not have, `as any` hid that
// from check-types, and every submit/approve/reject call 500'd at runtime with
// a PrismaClientValidationError. Only a real round-trip can prove the JSONB
// column is now written and read back, so each case re-reads the row from the
// database rather than trusting the procedure's return value.

type HistoryEntry = { process: string; name: string; dateTime: string; message: string };

const historyOf = (row: { approvalHistory: unknown }): HistoryEntry[] =>
  (Array.isArray(row.approvalHistory) ? row.approvalHistory : []) as HistoryEntry[];

const read = (id: string) => prisma.visitLog.findUniqueOrThrow({ where: { id } });

const approvalActivity = (id: string) =>
  prisma.activityLog.findMany({
    where: { resource: 'visit_log', resourceId: id, action: 'APPROVE' },
  });

const approvalNotifications = (id: string) =>
  prisma.notification.findMany({ where: { targetType: 'VISIT_LOG', targetId: id } });

/** A DRAFT visit log that satisfies every rule in validateVisitLog. */
const newVisit = async (label: string) => {
  const created = await caller.visitLog.create({
    salesmanId: actorUserId,
    outletId,
    date: new Date().toISOString(),
    purpose: `Visit approval ${label}`,
  });
  createdVisitIds.push(created.id);
  return created.id;
};

/** Drives a fresh visit log through the real DRAFT → VALIDATING transition. */
const toValidating = async (label: string) => {
  const id = await newVisit(label);
  const validated = await caller.visitLog.validate({ id });
  expect(validated.approvalStatus).toBe('VALIDATING');
  return id;
};

describe('visit-log approval flow', () => {
  it('submits a VALIDATING log: PROPOSED, submittedAt stamped, Submit entry persisted', async () => {
    const id = await toValidating('submit');
    // validate() moves the status but opens no history — the array is still absent.
    expect(historyOf(await read(id))).toHaveLength(0);

    const submitted = await caller.visitLog.submit({ id });
    expect(submitted.approvalStatus).toBe('PROPOSED');

    const row = await read(id);
    expect(row.approvalStatus).toBe('PROPOSED');
    expect(row.submittedAt).not.toBeNull();
    const history = historyOf(row);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      process: 'Submit',
      name: 'Visit Actor',
      message: 'Visit log submitted for approval',
    });
    expect(history[0]!.dateTime).toBeTruthy();
    // validate logs APPROVE too, so two rows: validation + submission.
    expect((await approvalActivity(id)).map((r) => r.message)).toEqual(
      expect.arrayContaining(['Validated visit log', 'Submitted visit log for approval']),
    );
  });

  it('approves a PROPOSED log: APPROVED, approver stamped, second history entry, notification', async () => {
    const id = await toValidating('approve');
    await caller.visitLog.submit({ id });

    const approved = await caller.visitLog.approve({ id, message: 'Looks good' });
    expect(approved.approvalStatus).toBe('APPROVED');

    const row = await read(id);
    expect(row.approvalStatus).toBe('APPROVED');
    expect(row.approvedById).toBe(actorUserId);
    expect(row.approvedAt).not.toBeNull();
    expect(row.submittedAt).not.toBeNull();
    const history = historyOf(row);
    expect(history.map((h) => h.process)).toEqual(['Submit', 'Approve']);
    expect(history[1]).toMatchObject({ process: 'Approve', name: 'Visit Actor', message: 'Looks good' });

    // The notification is written inside the same transaction as the transition.
    const notifications = await approvalNotifications(id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ userId: actorUserId, targetType: 'VISIT_LOG', targetId: id });
  });

  it('rejects a PROPOSED log: REJECTED with the Reject entry appended', async () => {
    const id = await toValidating('reject');
    await caller.visitLog.submit({ id });

    const rejected = await caller.visitLog.reject({ id, message: 'Photos missing' });
    expect(rejected.approvalStatus).toBe('REJECTED');

    const row = await read(id);
    const history = historyOf(row);
    expect(history.map((h) => h.process)).toEqual(['Submit', 'Reject']);
    expect(history[1]!.message).toBe('Photos missing');

    const notifications = await approvalNotifications(id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.type).toBe('WARNING');
    expect(notifications[0]!.message).toContain('Photos missing');
  });

  it('refuses a second approve with the guarded message and changes nothing', async () => {
    const id = await toValidating('double-approve');
    await caller.visitLog.submit({ id });
    await caller.visitLog.approve({ id, message: 'First' });
    const first = await read(id);

    await expect(caller.visitLog.approve({ id, message: 'Second' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Only PROPOSED visit logs can be approved.',
    });

    const after = await read(id);
    expect(after.approvalStatus).toBe('APPROVED');
    expect(after.approvedById).toBe(first.approvedById);
    expect(after.approvedAt!.getTime()).toBe(first.approvedAt!.getTime());
    // @updatedAt frozen means the rejected call wrote nothing at all.
    expect(after.updatedAt.getTime()).toBe(first.updatedAt.getTime());
    expect(historyOf(after)).toHaveLength(2);
    expect(await approvalNotifications(id)).toHaveLength(1);
  });

  it('lets two concurrent approves race and commits exactly one transition', async () => {
    // The guarded `updateMany({ where: { id, approvalStatus: 'PROPOSED' } })`
    // only earns its keep under real concurrency: both callers pass the
    // pre-check, Postgres serialises the row lock, and the loser re-reads a
    // status it no longer owns so `count === 0` fires. Whichever branch the
    // loser exits through (pre-check or guard) the observable outcome is
    // identical, which is what makes this assertion race-proof.
    const id = await toValidating('race-approve');
    await caller.visitLog.submit({ id });

    const results = await Promise.allSettled([
      caller.visitLog.approve({ id, message: 'Racer A' }),
      caller.visitLog.approve({ id, message: 'Racer B' }),
    ]);
    const wins = results.filter((r) => r.status === 'fulfilled');
    const losses = results.filter((r) => r.status === 'rejected');
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(1);
    expect((losses[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Only PROPOSED visit logs can be approved.',
    });

    const row = await read(id);
    expect(row.approvalStatus).toBe('APPROVED');
    expect(row.approvedById).toBe(actorUserId);
    // The loser must leave no history entry and no notification behind — the
    // in-transaction writes roll back with its failed guard.
    expect(historyOf(row).map((h) => h.process)).toEqual(['Submit', 'Approve']);
    expect(await approvalNotifications(id)).toHaveLength(1);
  });

  it('refuses to submit a log that is already PROPOSED', async () => {
    const id = await toValidating('double-submit');
    await caller.visitLog.submit({ id });
    const before = await read(id);

    await expect(caller.visitLog.submit({ id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'Only VALIDATING visit logs can be submitted.',
    });

    const after = await read(id);
    expect(after.approvalStatus).toBe('PROPOSED');
    expect(after.submittedAt!.getTime()).toBe(before.submittedAt!.getTime());
    expect(after.updatedAt.getTime()).toBe(before.updatedAt.getTime());
    expect(historyOf(after)).toHaveLength(1);
  });

  it('still rejects an already-APPROVED log — the reject guard is existence-only by design', async () => {
    // visit-log.ts documents this deviation from submit/approve: reject carries
    // no status precondition, so tightening it later would be a state change.
    // Asserted here so the looseness stays a deliberate, visible contract.
    const id = await toValidating('reject-approved');
    await caller.visitLog.submit({ id });
    await caller.visitLog.approve({ id });

    const rejected = await caller.visitLog.reject({ id, message: 'Revoked' });
    expect(rejected.approvalStatus).toBe('REJECTED');

    const row = await read(id);
    expect(historyOf(row).map((h) => h.process)).toEqual(['Submit', 'Approve', 'Reject']);
    // Reject does not unwind the approval stamps.
    expect(row.approvedById).toBe(actorUserId);
    expect(row.approvedAt).not.toBeNull();
  });
});

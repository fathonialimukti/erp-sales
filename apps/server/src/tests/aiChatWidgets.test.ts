import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { ChatActionResult } from '@repo/schemas/chatWidget';
import { createCaller } from './helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser } from './helpers/seed.js';
import { prisma } from '../lib/prisma.js';

/**
 * Task 3 — AI chat router mutations + SQL execution gate (SPEC §5–§6, §10–§11).
 *
 * NOTE: chat messages persist client-side (useChat + localStorage); there is no
 * server-side chat-message model, so the widget JSON status flip ("flip the
 * widget JSON status") is owned by the client from the mutation return values.
 * What the server enforces — and what these tests cover — is the gate state
 * machine on AiActionConfirmation (the safety core) + validation + activity logs.
 */

const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];
const createdRegionIds: string[] = [];
const createdGateIds: string[] = [];

let caller: ReturnType<typeof createCaller>;
let deniedCaller: ReturnType<typeof createCaller>;
let actorUserId: string;

const seedGate = async (overrides: {
  sqlText: string;
  readOnly: boolean;
  status?: string;
  backupAck?: boolean;
  widgetId?: string;
}) => {
  const gate = await prisma.aiActionConfirmation.create({
    data: {
      widgetId: overrides.widgetId ?? `widget-${randomUUID()}`,
      sqlText: overrides.sqlText,
      readOnly: overrides.readOnly,
      backupAck: overrides.backupAck ?? false,
      status: overrides.status ?? 'pending',
      chatId: 'test-chat-1',
      createdBy: actorUserId,
    },
  });
  createdGateIds.push(gate.id);
  return gate;
};

const gateLog = async (gateId: string) =>
  prisma.activityLog.findMany({
    where: { resource: 'ai_action_confirmation', resourceId: gateId },
    orderBy: { createdAt: 'asc' },
  });

beforeAll(async () => {
  const adminRole = await seedRoleWithPermissions(['ai-admin@access']);
  createdRoleIds.push(adminRole.id);
  const admin = await seedTestUser({
    roleId: adminRole.id,
    email: `ai-chat-admin-${randomUUID()}@example.com`,
    name: 'AI Chat Admin',
  });
  createdUserIds.push(admin.id);
  actorUserId = admin.id;

  const noPermRole = await seedRoleWithPermissions([]);
  createdRoleIds.push(noPermRole.id);
  const noPermUser = await seedTestUser({
    roleId: noPermRole.id,
    email: `ai-chat-denied-${randomUUID()}@example.com`,
    name: 'AI Chat Denied',
  });
  createdUserIds.push(noPermUser.id);

  caller = createCaller({ userId: admin.id, email: admin.email, name: admin.name });
  deniedCaller = createCaller({ userId: noPermUser.id, email: noPermUser.email, name: noPermUser.name });
});

afterAll(async () => {
  for (const id of createdGateIds) {
    await prisma.aiActionConfirmation.delete({ where: { id } }).catch(() => {});
  }
  for (const id of createdRegionIds) await prisma.region.delete({ where: { id } }).catch(() => {});
  // Activity logs cascade on user delete; delete users/roles last.
  for (const id of createdUserIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  for (const id of createdRoleIds) await prisma.role.delete({ where: { id } }).catch(() => {});
});

describe('aiChat.submitFormResponse', () => {
  it('returns the structured form_response payload and writes an activity log entry', async () => {
    const widgetId = `form-widget-${randomUUID()}`;
    const values = { outletName: 'Outlet A', target: 42, active: true };

    const result = await caller.aiChat.submitFormResponse({ widgetId, values });

    expect(result).toEqual({ widgetId, values });

    const log = await prisma.activityLog.findFirst({
      where: { resource: 'ai_chat_widget', resourceId: widgetId },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(actorUserId);
  });

  it('is available to any authenticated user (no permission gate — forms appear in all chatboxes)', async () => {
    const result = await deniedCaller.aiChat.submitFormResponse({
      widgetId: `form-widget-${randomUUID()}`,
      values: { name: 'x' },
    });
    expect(result.widgetId).toBeDefined();
  });
});

describe('aiChat.confirmAction', () => {
  it('refuses a write SQL without backupAck and leaves the gate pending', async () => {
    const gate = await seedGate({
      sqlText: `UPDATE crm_regions SET name = 'never-ran' WHERE id = 'none'`,
      readOnly: false,
    });

    await expect(caller.aiChat.confirmAction({ confirmationId: gate.id, backupAck: false })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const after = await prisma.aiActionConfirmation.findUnique({ where: { id: gate.id } });
    expect(after?.status).toBe('pending');
    expect(after?.backupAck).toBe(false);
  });

  it('confirms a write SQL with backupAck, stores the ack, and logs', async () => {
    const gate = await seedGate({ sqlText: `UPDATE crm_regions SET name = 'x' WHERE id = 'y'`, readOnly: false });

    const confirmed = await caller.aiChat.confirmAction({ confirmationId: gate.id, backupAck: true });

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.backupAck).toBe(true);

    const logs = await gateLog(gate.id);
    expect(logs.length).toBe(1);
    expect(logs[0]?.action).toBe('UPDATE');
  });

  it('confirms a read-only SQL without any backup ack', async () => {
    const gate = await seedGate({ sqlText: `SELECT 1`, readOnly: true });

    const confirmed = await caller.aiChat.confirmAction({ confirmationId: gate.id, backupAck: false });

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.backupAck).toBe(false);
  });

  it('refuses double-confirm (replay) with a typed BAD_REQUEST', async () => {
    const gate = await seedGate({ sqlText: `SELECT 1`, readOnly: true, status: 'confirmed' });

    await expect(caller.aiChat.confirmAction({ confirmationId: gate.id, backupAck: false })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('refuses an unknown confirmationId with NOT_FOUND', async () => {
    await expect(caller.aiChat.confirmAction({ confirmationId: '01J00000000000000000000000', backupAck: true })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('refuses callers without ai-admin@access with FORBIDDEN', async () => {
    const gate = await seedGate({ sqlText: `SELECT 1`, readOnly: true });

    await expect(deniedCaller.aiChat.confirmAction({ confirmationId: gate.id, backupAck: false })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('aiChat.rejectAction', () => {
  it('rejects a pending gate (terminal) and logs a REJECT entry', async () => {
    const gate = await seedGate({ sqlText: `UPDATE crm_regions SET name = 'x' WHERE id = 'y'`, readOnly: false });

    const rejected = await caller.aiChat.rejectAction({ confirmationId: gate.id });

    expect(rejected.status).toBe('rejected');

    const logs = await gateLog(gate.id);
    expect(logs[0]?.action).toBe('REJECT');
  });

  it('refuses to execute a rejected confirmation (replay/terminal)', async () => {
    const gate = await seedGate({ sqlText: `SELECT 1`, readOnly: true, status: 'rejected' });

    await expect(caller.aiChat.executeConfirmedAction({ confirmationId: gate.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('refuses double-reject and denies callers without ai-admin@access', async () => {
    const gate = await seedGate({ sqlText: `SELECT 1`, readOnly: true, status: 'rejected' });
    await expect(caller.aiChat.rejectAction({ confirmationId: gate.id })).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const pendingGate = await seedGate({ sqlText: `SELECT 1`, readOnly: true });
    await expect(deniedCaller.aiChat.rejectAction({ confirmationId: pendingGate.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });
});

describe('aiChat.executeConfirmedAction — the SQL gate', () => {
  it('refuses to execute unless status is confirmed (pending / replay)', async () => {
    const pending = await seedGate({ sqlText: `SELECT 1`, readOnly: true, status: 'pending' });
    await expect(caller.aiChat.executeConfirmedAction({ confirmationId: pending.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const executed = await seedGate({ sqlText: `SELECT 1`, readOnly: true, status: 'executed' });
    await expect(caller.aiChat.executeConfirmedAction({ confirmationId: executed.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('executes the exact confirmed write SQL once, saves the result, logs, and refuses replay', async () => {
    // Exact-SQL invariant: the effect on the test table must match the confirmed
    // snapshot (gate.sqlText) — never any other SQL.
    const region = await prisma.region.create({ data: { name: 'before-gate', code: `GATE-${randomUUID().slice(0, 6)}` } });
    createdRegionIds.push(region.id);
    const sql = `UPDATE crm_regions SET name = 'after-gate' WHERE id = '${region.id}'`;
    const gate = await seedGate({ sqlText: sql, readOnly: false, status: 'confirmed', backupAck: true });

    const result: ChatActionResult = await caller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

    expect(result.status).toBe('executed');
    expect(result.sql).toBe(sql); // echo of the exact executed SQL
    expect(result.rowCount).toBe(1);
    expect(result.error).toBeUndefined();
    expect(typeof result.durationMs).toBe('number');

    // Effect matches the snapshot SQL exactly.
    const after = await prisma.region.findUnique({ where: { id: region.id } });
    expect(after?.name).toBe('after-gate');

    // Gate is one-time-use now: status executed + result snapshot stored.
    const row = await prisma.aiActionConfirmation.findUnique({ where: { id: gate.id } });
    expect(row?.status).toBe('executed');
    const stored = row?.result as ChatActionResult;
    expect(stored.sql).toBe(sql);
    expect(stored.rowCount).toBe(1);

    // Replay refused (typed BAD_REQUEST per SPEC §11).
    await expect(caller.aiChat.executeConfirmedAction({ confirmationId: gate.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    // Activity log: SQL text + rowCount + durationMs.
    const logs = await gateLog(gate.id);
    const execLog = logs.find((l) => l.message.includes('Executed'));
    expect(execLog).toBeDefined();
    const detail = execLog?.detail as { sql?: string; rowCount?: number; durationMs?: number };
    expect(detail.sql).toBe(sql);
    expect(detail.rowCount).toBe(1);
    expect(typeof detail.durationMs).toBe('number');
  });

  it('executes a confirmed SELECT and returns sanitized rows with rowCount', async () => {
    const region = await prisma.region.create({ data: { name: 'gate-select', code: `SEL-${randomUUID().slice(0, 6)}` } });
    createdRegionIds.push(region.id);
    const sql = `SELECT id, name FROM crm_regions WHERE id = '${region.id}'`;
    const gate = await seedGate({ sqlText: sql, readOnly: true, status: 'confirmed' });

    const result = await caller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

    expect(result.status).toBe('executed');
    expect(result.rowCount).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect((result.rows?.[0] as { name?: string }).name).toBe('gate-select');
  });

  it('sanitizes non-JSON raw values (BigInt → string) in select rows', async () => {
    const sql = `SELECT COUNT(*) AS total FROM crm_regions`;
    const gate = await seedGate({ sqlText: sql, readOnly: true, status: 'confirmed' });

    const result = await caller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

    expect(result.status).toBe('executed');
    // COUNT(*) returns bigint in pg — must be stringified to stay Json-safe.
    expect(typeof (result.rows?.[0] as { total?: unknown }).total).toBe('string');
  });

  it('rolls back a failing write: status failed, rolledBack: true, no partial data, terminal', async () => {
    const region = await prisma.region.create({ data: { name: 'before-fail', code: `FAIL-${randomUUID().slice(0, 6)}` } });
    createdRegionIds.push(region.id);
    const sql = `UPDATE crm_regions SET column_that_does_not_exist = 1 WHERE id = '${region.id}'`;
    const gate = await seedGate({ sqlText: sql, readOnly: false, status: 'confirmed', backupAck: true });

    const result = await caller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

    expect(result.status).toBe('failed');
    expect(result.sql).toBe(sql);
    expect(result.error?.rolledBack).toBe(true);
    expect(result.error?.message.length).toBeGreaterThan(0);

    // No partial data: the region row is untouched.
    const after = await prisma.region.findUnique({ where: { id: region.id } });
    expect(after?.name).toBe('before-fail');

    // Terminal failed state + activity log carries error + rolledBack.
    const row = await prisma.aiActionConfirmation.findUnique({ where: { id: gate.id } });
    expect(row?.status).toBe('failed');
    const logs = await gateLog(gate.id);
    const failLog = logs.find((l) => l.message.includes('failed'));
    expect(failLog).toBeDefined();
    const detail = failLog?.detail as { error?: string; rolledBack?: boolean };
    expect(detail.rolledBack).toBe(true);

    // One-time-use: a failed gate cannot be re-executed.
    await expect(caller.aiChat.executeConfirmedAction({ confirmationId: gate.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('routes a readOnly:false gate row through $executeRawUnsafe (never $queryRawUnsafe)', async () => {
    // I-1 regression: a write gate must hit the affected-count path. The
    // row-capture path ($queryRawUnsafe) would silently EXECUTE the write while
    // misreporting rowCount as 0 — so assert both the routing and the effect.
    const region = await prisma.region.create({ data: { name: 'before-route', code: `ROUTE-${randomUUID().slice(0, 6)}` } });
    createdRegionIds.push(region.id);
    const sql = `UPDATE crm_regions SET name = 'after-route' WHERE id = '${region.id}'`;
    const gate = await seedGate({ sqlText: sql, readOnly: false, status: 'confirmed', backupAck: true });

    // Prisma attaches raw-SQL methods as own props of each interactive-
    // transaction client (no shared prototype), so instrument the tx the
    // router's callback actually receives: wrap ctx.db.$transaction.
    const routed = { executed: [] as string[], queried: [] as string[] };
    const originalTransaction = prisma.$transaction.bind(prisma) as (cb: any, options?: unknown) => Promise<unknown>;
    const transactionSpy = vi.spyOn(prisma, '$transaction').mockImplementation(((callback: any, options?: unknown) =>
      originalTransaction(
        (tx: any) =>
          callback(
            new Proxy(tx, {
              get(target, prop) {
                if (prop === '$executeRawUnsafe') {
                  return (query: string) => {
                    routed.executed.push(query);
                    return target.$executeRawUnsafe(query);
                  };
                }
                if (prop === '$queryRawUnsafe') {
                  return (query: string, ...values: unknown[]) => {
                    routed.queried.push(query);
                    return target.$queryRawUnsafe(query, ...values);
                  };
                }
                const value = Reflect.get(target, prop, target);
                return typeof value === 'function' ? value.bind(target) : value;
              },
            }),
          ),
        options,
      )) as unknown as typeof prisma.$transaction);
    try {
      const result: ChatActionResult = await caller.aiChat.executeConfirmedAction({ confirmationId: gate.id });
      expect(result.status).toBe('executed');
      expect(result.rowCount).toBe(1); // $queryRawUnsafe would misreport 0 here
      expect(routed.executed).toEqual([sql]);
      expect(routed.queried).toEqual([]);
    } finally {
      transactionSpy.mockRestore();
    }

    const after = await prisma.region.findUnique({ where: { id: region.id } });
    expect(after?.name).toBe('after-route');
  });

  it('denies execution to callers without ai-admin@access', async () => {
    const gate = await seedGate({ sqlText: `SELECT 1`, readOnly: true, status: 'confirmed' });

    await expect(deniedCaller.aiChat.executeConfirmedAction({ confirmationId: gate.id })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });

    // The denied call must not have consumed the one-time-use.
    const row = await prisma.aiActionConfirmation.findUnique({ where: { id: gate.id } });
    expect(row?.status).toBe('confirmed');
  });
});

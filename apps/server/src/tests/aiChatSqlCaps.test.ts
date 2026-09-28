import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import type { ChatActionResult } from '@repo/schemas/chatWidget';
import { createCaller } from './helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser } from './helpers/seed.js';
import { MAX_STORED_RESULT_BYTES, capRowsByBytes } from '../lib/ai-db-tools.js';
import { prisma } from '../lib/prisma.js';

/**
 * Task 3 + Task 5 — the admin SQL gate in `routers/ai-chat.ts`, which is where
 * the AI admin's SQL is actually executed (`routes/ai-admin.ts` only mints the
 * confirmation card; the statement runs here).
 *
 * Two controls are under test:
 *  - the same hard caps `/api/ai/query` already applies (applyRowCap +
 *    MAX_RESULT_BYTES), so a model-authored whole-schema SELECT cannot flood the
 *    snapshot that is persisted on the gate row;
 *  - `createdBy` scoping, so one `ai-admin@access` holder cannot confirm, reject
 *    or execute another admin's pending card.
 */

const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];
const createdRegionIds: string[] = [];
const createdGateIds: string[] = [];

let ownerCaller: ReturnType<typeof createCaller>;
let otherAdminCaller: ReturnType<typeof createCaller>;
let ownerId: string;

const seedGate = async (overrides: {
    sqlText: string;
    readOnly: boolean;
    status?: string;
    backupAck?: boolean;
    createdBy?: string;
}) => {
    const gate = await prisma.aiActionConfirmation.create({
        data: {
            widgetId: `widget-${randomUUID()}`,
            sqlText: overrides.sqlText,
            readOnly: overrides.readOnly,
            backupAck: overrides.backupAck ?? false,
            status: overrides.status ?? 'pending',
            chatId: 'test-chat-caps',
            createdBy: overrides.createdBy ?? ownerId,
        },
    });
    createdGateIds.push(gate.id);
    return gate;
};

const makeRegions = async (count: number) => {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
        const region = await prisma.region.create({
            data: { name: `caps-${i}-${randomUUID().slice(0, 6)}`, code: `CAPS-${randomUUID().slice(0, 6)}` },
        });
        createdRegionIds.push(region.id);
        ids.push(region.id);
    }
    return ids;
};

beforeAll(async () => {
    const role = await seedRoleWithPermissions(['ai-admin@access']);
    createdRoleIds.push(role.id);

    const owner = await seedTestUser({ roleId: role.id, email: `ai-cap-owner-${randomUUID()}@example.com`, name: 'Cap Owner' });
    createdUserIds.push(owner.id);
    ownerId = owner.id;

    const other = await seedTestUser({
        roleId: role.id,
        email: `ai-cap-other-${randomUUID()}@example.com`,
        name: 'Cap Other Admin',
    });
    createdUserIds.push(other.id);

    ownerCaller = createCaller({ userId: owner.id, email: owner.email, name: owner.name });
    otherAdminCaller = createCaller({ userId: other.id, email: other.email, name: other.name });
});

afterAll(async () => {
    for (const id of createdGateIds) await prisma.aiActionConfirmation.delete({ where: { id } }).catch(() => {});
    for (const id of createdRegionIds) await prisma.region.delete({ where: { id } }).catch(() => {});
    // Activity logs cascade on user delete; delete users/roles last.
    for (const id of createdUserIds) await prisma.user.delete({ where: { id } }).catch(() => {});
    for (const id of createdRoleIds) await prisma.role.delete({ where: { id } }).catch(() => {});
});

describe('admin SQL gate — row cap', () => {
    it('caps a model-authored whole-schema SELECT at the stored row ceiling', async () => {
        // 200 regions exist by now from other files' rows? No — rely on the cap
        // being appended regardless of how many rows the table really holds:
        // the executed statement must be wrapped, not the returned count.
        const gate = await seedGate({ sqlText: 'SELECT id, name FROM crm_regions', readOnly: true, status: 'confirmed' });

        const result: ChatActionResult = await ownerCaller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

        expect(result.status).toBe('executed');
        expect(result.sql).toMatch(/^SELECT \* FROM \(SELECT id, name FROM crm_regions\) AS __ai_capped LIMIT 200$/);
    });

    it('honours a LIMIT written into the confirmed SQL only as an inner, advisory bound', async () => {
        const ids = await makeRegions(5);
        const gate = await seedGate({
            sqlText: `SELECT id, name FROM crm_regions WHERE id IN (${ids.map((id) => `'${id}'`).join(',')})`,
            readOnly: true,
            status: 'confirmed',
        });

        const result: ChatActionResult = await ownerCaller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

        expect(result.rowCount).toBe(5);
        expect(result.rows).toHaveLength(5);
        // Under the ceiling, so nothing was dropped.
        expect(result.truncated).toBe(false);
    });

    it('reports truncated when the row cap bound', async () => {
        const ids = await makeRegions(205);
        const gate = await seedGate({
            sqlText: `SELECT id FROM crm_regions WHERE id IN (${ids.map((id) => `'${id}'`).join(',')})`,
            readOnly: true,
            status: 'confirmed',
        });

        const result: ChatActionResult = await ownerCaller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

        expect(result.rowCount).toBe(200);
        expect(result.rows).toHaveLength(200);
        expect(result.truncated).toBe(true);
    });

    it('never wraps a write statement', async () => {
        const region = await prisma.region.create({ data: { name: 'caps-write', code: `CW-${randomUUID().slice(0, 6)}` } });
        createdRegionIds.push(region.id);
        const sql = `UPDATE crm_regions SET name = 'caps-written' WHERE id = '${region.id}'`;
        const gate = await seedGate({ sqlText: sql, readOnly: false, status: 'confirmed', backupAck: true });

        const result: ChatActionResult = await ownerCaller.aiChat.executeConfirmedAction({ confirmationId: gate.id });

        expect(result.sql).toBe(sql);
        expect(result.rowCount).toBe(1);
        const after = await prisma.region.findUnique({ where: { id: region.id } });
        expect(after?.name).toBe('caps-written');
    });
});

describe('capRowsByBytes', () => {
    it('keeps a small payload untouched', () => {
        const { rows, truncated } = capRowsByBytes([{ a: 1 }, { a: 2 }]);
        expect(rows).toHaveLength(2);
        expect(truncated).toBe(false);
    });

    it('drops trailing rows until the encoded snapshot fits the ceiling', () => {
        const wide = { blob: 'x'.repeat(4000) };
        const rows = Array.from({ length: 200 }, () => wide);
        expect(Buffer.byteLength(JSON.stringify(rows), 'utf8')).toBeGreaterThan(MAX_STORED_RESULT_BYTES);

        const { rows: kept, truncated } = capRowsByBytes(rows);

        expect(truncated).toBe(true);
        expect(kept.length).toBeLessThan(200);
        expect(kept.length).toBeGreaterThan(0);
        expect(Buffer.byteLength(JSON.stringify(kept), 'utf8')).toBeLessThanOrEqual(MAX_STORED_RESULT_BYTES);
    });

    it('never empties the result to satisfy a size cut', () => {
        // A single row above the ceiling is kept: dropping it would report a
        // successful query as returning nothing, which is a worse lie.
        const { rows, truncated } = capRowsByBytes([{ blob: 'x'.repeat(MAX_STORED_RESULT_BYTES * 2) }]);
        expect(rows).toHaveLength(1);
        expect(truncated).toBe(false);
    });
});

describe('admin SQL gate — caller scoping', () => {
    it('refuses to confirm another admin\'s pending card', async () => {
        const gate = await seedGate({ sqlText: 'SELECT 1', readOnly: true });

        await expect(
            otherAdminCaller.aiChat.confirmAction({ confirmationId: gate.id, backupAck: false }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });

        const after = await prisma.aiActionConfirmation.findUnique({ where: { id: gate.id } });
        expect(after?.status).toBe('pending');
    });

    it('refuses to reject another admin\'s pending card', async () => {
        const gate = await seedGate({ sqlText: 'SELECT 1', readOnly: true });

        await expect(
            otherAdminCaller.aiChat.rejectAction({ confirmationId: gate.id }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });

        const after = await prisma.aiActionConfirmation.findUnique({ where: { id: gate.id } });
        expect(after?.status).toBe('pending');
    });

    it('refuses to execute another admin\'s confirmed write', async () => {
        const region = await prisma.region.create({ data: { name: 'not-mine', code: `NM-${randomUUID().slice(0, 6)}` } });
        createdRegionIds.push(region.id);
        const gate = await seedGate({
            sqlText: `UPDATE crm_regions SET name = 'stolen' WHERE id = '${region.id}'`,
            readOnly: false,
            status: 'confirmed',
            backupAck: true,
        });

        await expect(
            otherAdminCaller.aiChat.executeConfirmedAction({ confirmationId: gate.id }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });

        const after = await prisma.region.findUnique({ where: { id: region.id } });
        expect(after?.name).toBe('not-mine');
        // The one-time-use claim is untouched.
        const row = await prisma.aiActionConfirmation.findUnique({ where: { id: gate.id } });
        expect(row?.status).toBe('confirmed');
    });

    it('still lets the owner act on their own card end to end', async () => {
        const gate = await seedGate({ sqlText: 'SELECT 1 AS one', readOnly: true });

        const confirmed = await ownerCaller.aiChat.confirmAction({ confirmationId: gate.id, backupAck: false });
        expect(confirmed.status).toBe('confirmed');

        const result: ChatActionResult = await ownerCaller.aiChat.executeConfirmedAction({ confirmationId: gate.id });
        expect(result.status).toBe('executed');
        expect(result.rowCount).toBe(1);
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

// JWT_SECRET is read at express-auth module init — must exist before any import runs.
vi.hoisted(() => {
    process.env.JWT_SECRET ??= 'test-ai-query-authz-secret';
});

// routes/ai.js and the auth middleware share one Prisma client module — mock it
// once so the permission gate, the rate-limiter settings read and the query
// execution are all stubbed.
vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        user: { findUnique: vi.fn() },
        revokedToken: { findUnique: vi.fn(async () => null) },
        appSetting: { findUnique: vi.fn(async () => null) },
        $queryRawUnsafe: vi.fn(async () => [{ count: 7 }]),
    },
}));

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { aiQueryDatabaseHandler } from '../../routes/ai.js';
import { prisma } from '../../lib/prisma.js';
import { DEFAULT_QUERY_ROWS, MAX_QUERY_ROWS } from '../../lib/ai-db-tools.js';

const SECRET = process.env.JWT_SECRET as string;
const USER_ID = '01HZX3WKY5Q8T2R4N9MCV6B7AE';
const EMAIL = 'ai-query-user@example.com';

interface Harness {
    res: Response;
    statusCode: number;
    body: Record<string, unknown> | null;
}

function makeJsonRes(): Harness {
    const state: { statusCode: number; body: Record<string, unknown> | null } = {
        statusCode: 200,
        body: null,
    };
    const res = {
        status(code: number) {
            state.statusCode = code;
            return res;
        },
        json(payload: unknown) {
            state.body = payload as Record<string, unknown>;
            return res;
        },
    } as unknown as Response;
    return {
        res,
        get statusCode() {
            return state.statusCode;
        },
        get body() {
            return state.body;
        },
    };
}

async function callHandler(options: { permissions?: string[]; sql?: string; limit?: number } = {}): Promise<Harness> {
    const permissions = options.permissions ?? ['ai@query'];
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_ID,
        email: EMAIL,
        name: 'AI Query User',
        role: { name: 'System Admin', permissions: permissions.map((name) => ({ permission: { name } })) },
    } as never);

    const token = jwt.sign({ userId: USER_ID, email: EMAIL, name: 'AI Query User' }, SECRET, { expiresIn: '1h' });
    const req = {
        body: { sql: options.sql ?? 'SELECT count(*) AS count FROM skus', limit: options.limit },
        headers: { authorization: `Bearer ${token}` },
    } as unknown as Request;

    const harness = makeJsonRes();
    await aiQueryDatabaseHandler(req, harness.res);
    return harness;
}

beforeEach(() => {
    vi.mocked(prisma.$queryRawUnsafe).mockClear();
    vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([{ count: 7 }] as never);
});

describe('POST /api/ai/query authorization', () => {
    it('rejects unauthenticated requests with 401', async () => {
        const req = { body: { sql: 'SELECT 1' }, headers: {} } as unknown as Request;
        const harness = makeJsonRes();
        await aiQueryDatabaseHandler(req, harness.res);
        expect(harness.statusCode).toBe(401);
        expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('rejects an authenticated user without ai@query with 403 and never runs the SQL', async () => {
        const harness = await callHandler({ permissions: ['region@read', 'report@read'] });
        expect(harness.statusCode).toBe(403);
        expect(harness.body).toEqual({ error: 'Insufficient permissions' });
        expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });

    it('runs the query for a holder of ai@query', async () => {
        const harness = await callHandler({ permissions: ['ai@query'] });
        expect(harness.statusCode).toBe(200);
        expect(harness.body).toMatchObject({ success: true, rowCount: 1 });
    });
});

describe('POST /api/ai/query server-side caps', () => {
    // Two levers, two ceilings: DEFAULT_QUERY_ROWS when the caller asks for no
    // size, MAX_QUERY_ROWS as the hard clamp on whatever it does ask for.
    it('caps rows at MAX_QUERY_ROWS when the caller asks for more than the ceiling', async () => {
        await callHandler({ sql: 'SELECT * FROM users LIMIT 10000000', limit: 10000 });
        const sql = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0]?.[0] as string;
        expect(sql).toContain(`LIMIT ${MAX_QUERY_ROWS}`);
        // The untrusted LIMIT survives only inside the subquery; the outer cap governs.
        expect(sql).toMatch(/^SELECT \* FROM \(/);
        expect(sql.endsWith(`LIMIT ${MAX_QUERY_ROWS}`)).toBe(true);
    });

    it('caps rows at MAX_QUERY_ROWS when only the statement carries a huge LIMIT', async () => {
        // No caller limit at all: the default size governs the outer cap, and the
        // statement's own LIMIT stays inside the subquery where it is advisory.
        await callHandler({ sql: 'SELECT * FROM users LIMIT 10000000' });
        const sql = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0]?.[0] as string;
        expect(sql).toContain('LIMIT 10000000');
        expect(sql.endsWith(`LIMIT ${DEFAULT_QUERY_ROWS}`)).toBe(true);
    });

    it('honours a smaller caller-supplied limit', async () => {
        await callHandler({ limit: 10 });
        const sql = vi.mocked(prisma.$queryRawUnsafe).mock.calls[0]?.[0] as string;
        expect(sql.endsWith('LIMIT 10')).toBe(true);
    });

    it('rejects file-read and session-write functions', async () => {
        for (const sql of [
            "SELECT pg_read_file('/etc/passwd')",
            "SELECT set_config('role', 'postgres', false)",
            "SELECT lo_import('/etc/shadow')",
        ]) {
            const harness = await callHandler({ sql });
            expect(harness.statusCode).toBe(200); // envelope, not an HTTP error
            expect(harness.body).toMatchObject({ error: 'Query rejected' });
        }
        expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });
});

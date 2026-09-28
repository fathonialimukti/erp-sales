import { beforeEach, describe, expect, it, vi } from 'vitest';

// JWT_SECRET is read at express-auth module init — must exist before any import runs.
vi.hoisted(() => {
    process.env.JWT_SECRET ??= 'test-express-auth-origin-secret';
});

vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        user: { findUnique: vi.fn() },
        revokedToken: { findUnique: vi.fn(async () => null) },
        // withAuth's rejection path writes a security event to app_logs.
        appLog: { create: vi.fn(async () => {}) },
    },
}));

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { withAuth } from '../../lib/express-auth.js';
import { prisma } from '../../lib/prisma.js';

/**
 * Task 1 — the cross-origin gate on `withAuth`, which is the single place every
 * cookie-authenticated non-tRPC route passes through: the 14 `POST /api/ai/*`
 * handlers and `POST /api/backups/upload` (100 MB body, writes to disk, creates
 * a restorable Backup row). None of them are inside the tRPC CSRF envelope.
 *
 * The global `cors` layer already aborts a disallowed `Origin` before the route
 * runs (verified with curl against the dev server — see
 * docs/security-testing-report.md §9.4), so this is defence in depth. What it
 * buys: the decision is made at the point of authentication instead of relying
 * on middleware ordering that is not a security property.
 */

const SECRET = process.env.JWT_SECRET as string;
const USER_ID = '01HZX3WKY5Q8T2R4N9MCV6B7AE';
const ALLOWED_ORIGIN = 'https://erp-sales.aetherglo.com';

interface Harness {
    statusCode: number;
    body: Record<string, unknown> | null;
    ran: boolean;
}

let ran = false;
const guarded = withAuth({ permission: 'backup@restore' }, (_req: Request, res: Response) => {
    ran = true;
    res.status(200).json({ ok: true });
});

function makeRes(harness: Harness): Response {
    const res = {
        status(code: number) {
            harness.statusCode = code;
            return res;
        },
        json(payload: unknown) {
            harness.body = payload as Record<string, unknown>;
            return res;
        },
    } as unknown as Response;
    return res;
}

/** `viaCookie: false` sends a Bearer token instead — the CSRF vector is the cookie. */
async function call(
    method: string,
    headers: Record<string, string>,
    { viaCookie = true }: { viaCookie?: boolean } = {},
): Promise<Harness> {
    const harness: Harness = { statusCode: 200, body: null, ran: false };
    const token = jwt.sign({ userId: USER_ID, email: 'a@b.com', name: 'A' }, SECRET, { expiresIn: '1h' });
    const req = {
        method,
        path: '/api/backups/upload',
        headers: {
            ...headers,
            ...(viaCookie ? { cookie: `access_token=${token}` } : { authorization: `Bearer ${token}` }),
        },
    } as unknown as Request;

    await guarded(req, makeRes(harness));
    return { ...harness, ran };
}

beforeEach(() => {
    process.env.CORS_ORIGIN = ALLOWED_ORIGIN;
    ran = false;
    vi.mocked(prisma.user.findUnique).mockReset();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: USER_ID,
        email: 'a@b.com',
        name: 'A',
        role: { name: 'System Admin', permissions: [{ permission: { name: 'backup@restore' } }] },
    } as never);
});

describe('withAuth cross-origin gate', () => {
    it('refuses a cookie-authenticated POST from a disallowed origin and never authenticates', async () => {
        const harness = await call('POST', { origin: 'https://evil.example.com' });

        expect(harness.statusCode).toBe(403);
        expect(harness.body).toEqual({ error: 'Cross-origin request not allowed' });
        expect(harness.ran).toBe(false);
        // Refused before any credential work — not merely before the handler.
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('refuses the same request authenticated by Bearer too (no special case for the header)', async () => {
        const harness = await call('POST', { origin: 'https://evil.example.com' }, { viaCookie: false });

        expect(harness.statusCode).toBe(403);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('allows a POST from an allow-listed origin', async () => {
        const harness = await call('POST', { origin: ALLOWED_ORIGIN });

        expect(harness.statusCode).toBe(200);
        expect(harness.ran).toBe(true);
    });

    it('refuses a POST with no Origin but a disallowed Referer', async () => {
        const harness = await call('POST', { referer: 'https://evil.example.com/form' });

        expect(harness.statusCode).toBe(403);
        expect(harness.ran).toBe(false);
    });

    it('allows a POST with no Origin but an allow-listed Referer', async () => {
        // strict-origin-when-cross-origin means the browser sends the bare origin.
        const harness = await call('POST', { referer: `${ALLOWED_ORIGIN}/backups` });

        expect(harness.statusCode).toBe(200);
        expect(harness.ran).toBe(true);
    });

    it('fails closed on an unparseable Referer', async () => {
        const harness = await call('POST', { referer: 'not-a-url' });

        expect(harness.statusCode).toBe(403);
        expect(harness.ran).toBe(false);
    });

    it('allows a request with neither Origin nor Referer', async () => {
        // curl, server-to-server, and the Tauri webview send no Origin. A missing
        // Origin is not a browser cross-site request, so gating on it would break
        // every non-browser caller for no security gain.
        const harness = await call('POST', {});

        expect(harness.statusCode).toBe(200);
        expect(harness.ran).toBe(true);
    });

    it('allows any dev origin in development, matching the CORS layer', async () => {
        process.env.CORS_ORIGIN = '';

        const harness = await call('POST', { origin: 'http://localhost:5173' });

        expect(harness.statusCode).toBe(200);
        expect(harness.ran).toBe(true);
    });

    it('leaves safe methods to the CORS layer', async () => {
        // GET cannot change state; the CORS layer already governs what a
        // cross-origin GET can read back.
        const harness = await call('GET', { origin: 'https://evil.example.com' });

        expect(harness.statusCode).toBe(200);
        expect(harness.ran).toBe(true);
    });

    it('still refuses an unauthenticated request from an allowed origin with 401', async () => {
        const req = {
            method: 'POST',
            path: '/api/backups/upload',
            headers: { origin: ALLOWED_ORIGIN },
        } as unknown as Request;
        const harness: Harness = { statusCode: 200, body: null, ran: false };

        await guarded(req, makeRes(harness));

        expect(harness.statusCode).toBe(401);
        expect(harness.body).toEqual({ error: 'Unauthorized' });
    });
});

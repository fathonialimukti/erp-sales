/**
 * Shared Express authentication / authorization middleware.
 *
 * Every non-tRPC route (AI endpoints, PDF streaming) previously re-implemented
 * cookie/Bearer parsing + jwt.verify inline. This module is the single
 * implementation:
 *  - extractRequestToken: cookie `access_token` or Authorization Bearer
 *  - authenticateRequest: verify + revocation check (jti) + user/role load
 *  - withAuth: cross-origin + 401/403/429 gates + AI rate-limit queue + error
 *    containment
 */

import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { logApp } from './app-log.js';
import { isOriginAllowed, parseAllowedOrigins } from './cors-origin.js';
import { getJwtSecret } from './jwt-secret.js';
import { isBlacklisted } from './token-blacklist.js';
import { prisma } from './prisma.js';
import { acquireAiSlot } from './rate-limiter.js';

const JWT_SECRET = getJwtSecret();

export interface AuthedUser {
    userId: string;
    email: string;
    name: string | null;
    exp: number;
    jti: string | null;
    roleName: string | null;
    permissions: string[];
}

export function extractRequestToken(req: Request): string | null {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) return cookies.access_token;
    }

    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length);

    return null;
}

/** Verify + revocation-check the request token and load the current user/role. */
export async function authenticateRequest(req: Request): Promise<AuthedUser | null> {
    const token = extractRequestToken(req);
    if (!token) return null;

    let payload: jwt.JwtPayload;
    try {
        payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
        return null;
    }
    if (!payload?.userId) return null;

    const jti = typeof payload.jti === 'string' ? payload.jti : null;
    if (await isBlacklisted(token, jti)) return null;

    const user = await prisma.user.findUnique({
        where: { id: String(payload.userId) },
        include: {
            role: {
                include: {
                    permissions: { include: { permission: { select: { name: true } } } },
                },
            },
        },
    });
    if (!user) return null;

    return {
        userId: user.id,
        email: user.email,
        name: user.name,
        exp: typeof payload.exp === 'number' ? payload.exp : 0,
        jti,
        roleName: user.role?.name ?? null,
        permissions: user.role?.permissions.map((rp) => rp.permission.name) ?? [],
    };
}

export function userHasPermission(user: AuthedUser, required: string | string[]): boolean {
    const requiredList = Array.isArray(required) ? required : [required];
    return requiredList.some((r) => user.permissions.includes(r));
}

type AuthedHandler = (req: Request, res: Response, user: AuthedUser) => Promise<void> | void;

interface AuthOptions {
    /** Required `resource@action` permission(s) — any-of. 403 when missing. */
    permission?: string | string[];
    /** Queue for an AI slot (global API-key quota) before running. */
    aiRateLimit?: boolean;
}

// Safe methods: CSRF is a state-changing-request problem, and the CORS layer
// already governs what a cross-origin GET can read back. Leave them alone.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Origin/Referer allow-list for cookie-authenticated unsafe requests — the
 * cheap half of defence in depth for the non-tRPC routes (the 14 `POST /api/ai/*`
 * handlers + `POST /api/backups/upload`), which sit outside the tRPC CSRF
 * envelope and authenticate off the same `httpOnly` `access_token` cookie.
 *
 * What it does and does not add, stated precisely:
 *
 *  - The global `cors` middleware in `index.ts` already ABORTS a request whose
 *    `Origin` is off the allow-list (`callback(new Error('Not allowed by CORS'))`
 *    → `next(err)`), so the handler never runs for a disallowed browser origin.
 *    Verified: see docs/security-testing-report.md §9.4. That is what stops
 *    browser CSRF here — CORS withholding a response would not have, but this
 *    app's CORS config aborts, so it does.
 *  - This check makes the same decision at the point of authentication instead
 *    of relying on a global middleware ordering that is not a security property:
 *    a route that is ever mounted before `cors`, or a CORS config loosened from
 *    "abort" to "omit header", fails closed here.
 *  - It does NOT close a request from an origin that is itself allow-listed.
 *    That is a trust decision in `CORS_ORIGIN`, by construction: adding an
 *    origin to the list is the same act as trusting it.
 *
 * A missing `Origin` is not treated as a rejection: browsers always send
 * `Origin` on a cross-origin unsafe request, so "no Origin" means curl, a
 * server-to-server call, or the Tauri webview — never a browser CSRF attempt.
 * It is exactly the exemption `isOriginAllowed` already gives the CORS layer.
 */
function isRequestOriginAllowed(req: Request): boolean {
    if (SAFE_METHODS.has(req.method)) return true;
    // Read the env per request so a test or an operator cannot desync the two
    // call sites by mutating CORS_ORIGIN after this module loaded.
    const allowed = parseAllowedOrigins(process.env.CORS_ORIGIN);

    const origin = req.headers.origin;
    if (origin) return isOriginAllowed(origin, allowed);

    // No Origin: fall back to Referer. The app sends
    // `Referrer-Policy: strict-origin-when-cross-origin`, so cross-origin
    // requests carry the bare origin there. Unparseable ⇒ fail closed.
    const referer = req.headers.referer;
    if (!referer) return true;
    try {
        return isOriginAllowed(new URL(referer).origin, allowed);
    } catch {
        return false;
    }
}

/** Wrap an Express handler with auth, optional permission gate and AI slot queue. */
export function withAuth(options: AuthOptions, handler: AuthedHandler) {
    return async (req: Request, res: Response): Promise<void> => {
        // Before any credential work: a cross-origin unsafe request is refused
        // whether or not it would have authenticated.
        if (!isRequestOriginAllowed(req)) {
            logApp({
                level: 'ERROR',
                module: 'api',
                message: `Cross-origin request refused on ${req.method} ${req.path}`,
                detail: { origin: req.headers.origin ?? null, referer: req.headers.referer ?? null },
            });
            res.status(403).json({ error: 'Cross-origin request not allowed' });
            return;
        }

        const user = await authenticateRequest(req);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        if (options.permission && !userHasPermission(user, options.permission)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        if (options.aiRateLimit) {
            const slot = await acquireAiSlot();
            if (!slot.ok) {
                res.status(429).json({ error: 'AI service is busy, please try again shortly', retryAfter: slot.retryAfter });
                return;
            }
        }

        try {
            await handler(req, res, user);
        } catch (error) {
            // logApp writes stdout AND the app_logs table (System Logs viewer).
            logApp({
                level: 'ERROR',
                module: 'api',
                message: `Unhandled error in API route ${req.method} ${req.path}: ${
                    (error instanceof Error ? error.message : String(error)).slice(0, 500)
                }`,
                detail: { stack: error instanceof Error ? error.stack : String(error) },
                requestId: (req as any).requestId,
                userId: user.userId,
            });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    };
}

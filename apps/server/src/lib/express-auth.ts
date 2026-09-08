/**
 * Shared Express authentication / authorization middleware.
 *
 * Every non-tRPC route (AI endpoints, PDF streaming) previously re-implemented
 * cookie/Bearer parsing + jwt.verify inline. This module is the single
 * implementation:
 *  - extractRequestToken: cookie `access_token` or Authorization Bearer
 *  - authenticateRequest: verify + revocation check (jti) + user/role load
 *  - withAuth: 401/403/429 gates + AI rate-limit queue + error containment
 */

import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwt-secret.js';
import { isBlacklisted } from './token-blacklist.js';
import { prisma } from './prisma.js';
import { acquireAiSlot } from './rate-limiter.js';
import { logger } from './logger.js';

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
    /** Queue for an AI slot (global provider quota + per-user cap) before running. */
    aiRateLimit?: boolean;
}

/** Wrap an Express handler with auth, optional permission gate and AI slot queue. */
export function withAuth(options: AuthOptions, handler: AuthedHandler) {
    return async (req: Request, res: Response): Promise<void> => {
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
            const slot = await acquireAiSlot(user.userId);
            if (!slot.ok) {
                res.status(429).json({ error: 'AI service is busy, please try again shortly', retryAfter: slot.retryAfter });
                return;
            }
        }

        try {
            await handler(req, res, user);
        } catch (error) {
            logger.error('Unhandled error in API route', {
                error: error instanceof Error ? error.message : String(error),
                path: req.path,
            });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    };
}

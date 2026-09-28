import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { parseCookie, stringifySetCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { prisma, type DbClient } from './lib/prisma.js';
import { appendSetCookie } from './lib/cookies.js';
import { parseLocaleCookie, ServerLocale, DEFAULT_LOCALE } from './lib/locale.js';
import { getJwtSecret } from './lib/jwt-secret.js';
import { isBlacklisted } from './lib/token-blacklist.js';
import { generateCsrfToken, isValidCsrfToken, CSRF_COOKIE_NAME } from './lib/csrf.js';

const JWT_SECRET = getJwtSecret();

export type AuthUser = {
    userId: string;
    email: string;
    name: string | null;
    exp: number;
    jti?: string | null;
};

export type RequestContext = {
    req: CreateExpressContextOptions['req'];
    res: CreateExpressContextOptions['res'];
    user: AuthUser | null;
    token: string | null;
    db: DbClient;
    locale: ServerLocale;
    csrfToken: string;
};

const getTokenFromRequest = (req: CreateExpressContextOptions['req']) => {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) return cookies.access_token;
    }

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice('Bearer '.length);

    return null;
};

const getUserFromToken = async (token: string): Promise<AuthUser | null> => {
    try {
        const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        if (!payload?.userId || !payload?.email || typeof payload.exp !== 'number') {
            return null;
        }
        const jti = typeof payload.jti === 'string' ? payload.jti : null;

        if (await isBlacklisted(token, jti)) return null;

        return {
            userId: String(payload.userId),
            email: String(payload.email),
            name: payload.name ? String(payload.name) : null,
            exp: payload.exp,
            jti,
        };
    } catch {
        return null;
    }
};

export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
    const token = getTokenFromRequest(req);
    const user = token ? await getUserFromToken(token) : null;
    const locale = parseLocaleCookie(req.headers.cookie ?? undefined) ?? DEFAULT_LOCALE;

    const cookieHeader = req.headers.cookie;
    const cookies = cookieHeader ? parseCookie(cookieHeader) : {};
    // Re-mint on a missing, forged or expired cookie — reusing an expired one
    // would wedge the caller, whose echo would never match the Set-Cookie value.
    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const csrfToken = cookieToken && isValidCsrfToken(cookieToken) ? cookieToken : generateCsrfToken();

    // Appended, not set: a resolver that mints its own cookie (auth.login /
    // auth.logout) must not clobber this mint. See lib/cookies.ts.
    appendSetCookie(
        res,
        stringifySetCookie({
            name: CSRF_COOKIE_NAME,
            value: csrfToken,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        }),
    );

    return { req, res, user, token, db: prisma, locale, csrfToken } satisfies RequestContext;
};

export type Context = Awaited<ReturnType<typeof createContext>>;

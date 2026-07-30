import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { parse, serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import { prisma, type DbClient } from './lib/prisma.js';
import { parseLocaleCookie, ServerLocale, DEFAULT_LOCALE } from './lib/locale.js';
import { getJwtSecret } from './lib/jwt-secret.js';
import { isBlacklisted } from './lib/token-blacklist.js';
import { generateCsrfToken, CSRF_COOKIE_NAME } from './lib/csrf.js';

const JWT_SECRET = getJwtSecret();

export type AuthUser = {
    userId: string;
    email: string;
    name: string | null;
    exp: number;
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
        const cookies = parse(cookieHeader);
        if (cookies.access_token) return cookies.access_token;
    }

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice('Bearer '.length);

    return null;
};

const getUserFromToken = (token: string): AuthUser | null => {
    if (isBlacklisted(token)) return null;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        if (!payload?.userId || !payload?.email || typeof payload.exp !== 'number') {
            return null;
        }

        return {
            userId: String(payload.userId),
            email: String(payload.email),
            name: payload.name ? String(payload.name) : null,
            exp: payload.exp,
        };
    } catch {
        return null;
    }
};

export const createContext = ({ req, res }: CreateExpressContextOptions) => {
    const token = getTokenFromRequest(req);
    const user = token ? getUserFromToken(token) : null;
    const locale = parseLocaleCookie(req.headers.cookie ?? undefined) ?? DEFAULT_LOCALE;

    const cookieHeader = req.headers.cookie;
    const cookies = cookieHeader ? parse(cookieHeader) : {};
    const csrfToken = cookies[CSRF_COOKIE_NAME] ?? generateCsrfToken();

    res.setHeader(
        'Set-Cookie',
        serialize(CSRF_COOKIE_NAME, csrfToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        }),
    );

    return { req, res, user, token, db: prisma, locale, csrfToken } satisfies RequestContext;
};

export type Context = Awaited<ReturnType<typeof createContext>>;

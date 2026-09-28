import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { stringifySetCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { appendSetCookie } from '../lib/cookies.js';
import { verifyPassword } from '../lib/password.js';
import { logActivity } from '../lib/activity-log.js';
import { checkRateLimit } from '../lib/rate-limiter.js';
import { addToBlacklist } from '../lib/token-blacklist.js';
import { publicProcedure, protectedProcedure, router } from '../trpc.js';
import { getMessage } from '../lib/locale.js';
import { demoLoginInputSchema, demoLoginOutputSchema, listDemoUsersOutputSchema, loginSchema } from '@repo/schemas/auth';
import { getJwtSecret } from '../lib/jwt-secret.js';
import { logApp } from '../lib/app-log.js';

const JWT_SECRET = getJwtSecret();
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

// Bcrypt compare cost for unknown accounts so login timing does not reveal
// whether an email exists (user-miss path does the same work as a real hash).
const DUMMY_HASH = bcrypt.hashSync(randomUUID(), 10);

const createAuthCookie = (token: string, rememberMe?: boolean) =>
    stringifySetCookie({
        name: 'access_token',
        value: token,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        ...(rememberMe ? { maxAge: TOKEN_MAX_AGE } : {}),
    });

const clearAuthCookie = () =>
    stringifySetCookie({
        name: 'access_token',
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });

const assertDemoLoginEnabled = () => {
    if (process.env.DEMO_LOGIN_ENABLED !== 'true') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Demo login is disabled.' });
    }
};

// ponytail: email deny-list (no User flag) keeps service accounts out of demo login.
export const SYSTEM_EXCLUDED_EMAILS = [
    process.env.AI_SYSTEM_EMAIL ?? 'ai-system@mail.com',
    process.env.ERP_INTEGRATION_EMAIL ?? 'n8n@mail.com',
];

export const authRouter = router({
    // ponytail: double-submit delivery. The `csrf_token` cookie is httpOnly and
    // the web client is a separate origin, so no browser JS can read it — this
    // is how the client gets the value it has to echo in `x-csrf-token`. Public
    // on purpose: a first-time visitor reaches the login form with no token
    // stored, so the client must be able to fetch one before it can mutate.
    // PublicProcedure also means this is never itself CSRF-gated (queries are
    // ungated), so calling it can never recurse.
    csrfToken: publicProcedure.query(({ ctx }) => ({
        csrfToken: ctx.csrfToken,
        // The token is `<expiresAtMs>.<nonce>.<hmac>` (lib/csrf.ts), so hand back
        // the server's own expiry: the client schedules its re-read from the mint
        // rather than from receipt, which would drift by the request latency.
        csrfExpiresAt: Number(ctx.csrfToken.split('.')[0]),
    })),

    // ponytail: listDemoUsers + demoLogin are intentionally PUBLIC with no
    // hasPermission() check — the DEMO_LOGIN_ENABLED env gate replaces auth so
    // visitors can one-click login without credentials. Never enable in
    // production with real data.
    listDemoUsers: publicProcedure
        .output(listDemoUsersOutputSchema)
        .query(async ({ ctx }) => {
            assertDemoLoginEnabled();

            const users = await ctx.db.user.findMany({
                where: { email: { notIn: SYSTEM_EXCLUDED_EMAILS } },
                orderBy: { email: 'asc' },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });

            return users.map((user) => ({
                id: user.id,
                email: user.email,
                name: user.name ?? user.email,
                role: user.role?.name ?? '',
                description: user.description ?? null,
                capabilities: user.role?.permissions.map((p) => p.permission.name) ?? [],
            }));
        }),

    demoLogin: publicProcedure
        .input(demoLoginInputSchema)
        .output(demoLoginOutputSchema)
        .mutation(async ({ ctx, input }) => {
            assertDemoLoginEnabled();

            const user = await ctx.db.user.findUnique({
                where: { id: input.userId },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!user) {
                logApp({
                    level: 'WARN',
                    module: 'auth',
                    message: 'Demo login failed: unknown user',
                    detail: { userId: input.userId },
                });
                throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
            }

            if (SYSTEM_EXCLUDED_EMAILS.includes(user.email)) {
                logApp({
                    level: 'WARN',
                    module: 'auth',
                    message: 'Demo login failed: excluded account',
                    detail: { userId: input.userId },
                });
                throw new TRPCError({ code: 'FORBIDDEN', message: 'Demo login is disabled.' });
            }

            // Mirror of login token creation + expiry logic (session cookie: no rememberMe).
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                },
                JWT_SECRET,
                { expiresIn: '7d', jwtid: randomUUID() }
            );

            const decoded = jwt.decode(token) as jwt.JwtPayload | null;
            const tokenExpiresAt = decoded?.exp ? decoded.exp * 1000 : null;

            appendSetCookie(ctx.res, createAuthCookie(token));

            await logActivity(ctx.db, {
                action: 'LOGIN',
                userId: user.id,
                resource: 'user',
                resourceId: user.id,
                message: `User ${user.name} logged in via demo login`,
            });

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name ?? user.email,
                    roles: user.role ? [{
                        id: user.role.id,
                        name: user.role.name,
                        permissions: user.role.permissions.map((p) => p.permission.name),
                    }] : [],
                },
                tokenExpiresAt,
            };
        }),

    login: publicProcedure
        .input(loginSchema)
        .mutation(async ({ ctx, input }) => {
            const { email, password } = input;

            // Rate limiting: 5 attempts per IP per minute
            const forwardedFor = ctx.req.headers['x-forwarded-for'];
            const ip = (typeof forwardedFor === 'string'
                ? forwardedFor.split(',')[0]?.trim()
                : undefined)
                ?? (ctx.req.socket?.remoteAddress as string | undefined)
                ?? 'unknown';
            const rateLimit = checkRateLimit(ip);
            if (!rateLimit.allowed) {
                logApp({
                    level: 'WARN',
                    module: 'auth',
                    message: 'Login rate limit exceeded',
                    detail: { email, ip },
                });
                throw new TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: getMessage(ctx.locale, 'auth.rateLimitExceeded'),
                });
            }

            const user = await prisma.user.findUnique({
                where: { email },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!user) {
                // Equalize timing with the found-user path before rejecting.
                await verifyPassword(password, DUMMY_HASH);
                logApp({
                    level: 'WARN',
                    module: 'auth',
                    message: 'Login failed: unknown email',
                    detail: { email, ip },
                });
                throw new TRPCError({ code: 'UNAUTHORIZED', message: getMessage(ctx.locale, 'auth.invalidCredentials') });
            }

            const isPasswordValid = await verifyPassword(password, user.password);
            if (!isPasswordValid) {
                logApp({
                    level: 'WARN',
                    module: 'auth',
                    message: 'Login failed: invalid password',
                    detail: { email, ip },
                });
                throw new TRPCError({ code: 'UNAUTHORIZED', message: getMessage(ctx.locale, 'auth.invalidCredentials') });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                },
                JWT_SECRET,
                { expiresIn: '7d', jwtid: randomUUID() }
            );

            const decoded = jwt.decode(token) as jwt.JwtPayload | null;
            const tokenExpiresAt = decoded?.exp ? decoded.exp * 1000 : null;

            appendSetCookie(ctx.res, createAuthCookie(token, input.rememberMe));

            // Log login activity
            await logActivity(prisma, {
                action: 'LOGIN',
                userId: user.id,
                resource: 'user',
                resourceId: user.id,
                message: `User ${user.name} logged in`,
            });

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: user.role ? [{
                        id: user.role.id,
                        name: user.role.name,
                        permissions: user.role.permissions.map((p) => p.permission.name),
                    }] : [],
                },
                tokenExpiresAt,
            };
        }),

    me: protectedProcedure.query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
            where: { id: ctx.user.userId },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: {
                                permission: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: getMessage(ctx.locale, 'auth.authenticationRequired') });
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                roles: user.role
                    ? [{
                        id: user.role.id,
                        name: user.role.name,
                        permissions: user.role.permissions.map((p) => p.permission.name),
                    }]
                    : [],
            },
            tokenExpiresAt: ctx.user.exp * 1000,
        };
    }),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
        // Revoke the current token (DB-backed by jti + in-memory fast path).
        if (ctx.token) {
            await addToBlacklist({
                token: ctx.token,
                exp: ctx.user.exp * 1000,
                jti: ctx.user.jti,
            });
        }

        // Log logout activity
        await logActivity(prisma, {
            action: 'LOGOUT',
            userId: ctx.user.userId,
            resource: 'user',
            resourceId: ctx.user.userId,
            message: `User ${ctx.user.name} logged out`,
        });

        appendSetCookie(ctx.res, clearAuthCookie());
        return { success: true };
    }),
});

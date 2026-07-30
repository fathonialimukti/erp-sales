import { TRPCError } from '@trpc/server';
import { stringifySetCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { verifyPassword } from '../lib/password.js';
import { logActivity } from '../lib/activity-log.js';
import { checkRateLimit } from '../lib/rate-limiter.js';
import { addToBlacklist } from '../lib/token-blacklist.js';
import { publicProcedure, protectedProcedure, router } from '../trpc.js';
import { getMessage } from '../lib/locale.js';
import { loginSchema } from '@repo/schemas/auth';
import { getJwtSecret } from '../lib/jwt-secret.js';

const JWT_SECRET = getJwtSecret();
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

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

export const authRouter = router({
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

            if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: getMessage(ctx.locale, 'auth.invalidCredentials') });

            const isPasswordValid = await verifyPassword(password, user.password);
            if (!isPasswordValid) {
                throw new TRPCError({ code: 'UNAUTHORIZED', message: getMessage(ctx.locale, 'auth.invalidCredentials') });
            }

            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            const decoded = jwt.decode(token) as jwt.JwtPayload | null;
            const tokenExpiresAt = decoded?.exp ? decoded.exp * 1000 : null;

            ctx.res.setHeader('Set-Cookie', createAuthCookie(token, input.rememberMe));

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
        // Revoke the current token by adding it to the blacklist
        if (ctx.token) {
            addToBlacklist(ctx.token, ctx.user.exp * 1000);
        }

        // Log logout activity
        await logActivity(prisma, {
            action: 'LOGOUT',
            userId: ctx.user.userId,
            resource: 'user',
            resourceId: ctx.user.userId,
            message: `User ${ctx.user.name} logged out`,
        });

        ctx.res.setHeader('Set-Cookie', clearAuthCookie());
        return { success: true };
    }),
});

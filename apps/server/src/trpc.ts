import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from './context.js';
import { prisma } from './lib/prisma.js';
import { getMessage, DEFAULT_LOCALE } from './lib/locale.js';
import { CSRF_HEADER, validateCsrfToken } from './lib/csrf.js';

const t = initTRPC.context<Context>().create();

const isAuthed = t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: getMessage(ctx.locale, 'auth.authenticationRequired') });
    }

    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
            db: ctx.db,
        },
    });
});

const normalizePermission = (permission: string) => {
    if (permission.includes('@')) return permission;
    const sepIndex = permission.lastIndexOf('_');
    if (sepIndex === -1) return permission;
    return `${permission.slice(0, sepIndex)}@${permission.slice(sepIndex + 1)}`;
};

// ponytail: sys-admin bypass — a literal "*" grant (seed's System Admin
// pattern) passes every gate; "resource@*" passes every action on that
// resource. Mirrors matchesPattern() in prisma/seed.ts.
const matchesGranted = (required: string, granted: string) => {
    if (granted === '*') return true;
    const normalizedGranted = normalizePermission(granted);
    if (normalizedGranted === required) return true;
    if (normalizedGranted.endsWith('@*')) {
        return required.startsWith(`${normalizedGranted.slice(0, -2)}@`);
    }
    return false;
};

// 30s TTL cache of userId -> permission strings. Avoids a user+role+permission
// join on every gated call. Tradeoff: permission/role changes take effect
// within 30s; mutation routers call clearPermissionCache() to apply instantly.
const PERMISSION_CACHE_TTL_MS = 30_000;
const permissionCache = new Map<string, { permissions: string[]; at: number }>();

async function loadUserPermissions(db: Context['db'], userId: string): Promise<string[]> {
    const user = await db.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: {
                        include: { permission: true },
                    },
                },
            },
        },
    });

    if (!user?.role) {
        throw new TRPCError({ code: 'FORBIDDEN', message: getMessage(DEFAULT_LOCALE, 'auth.noRoleAssigned') });
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);
    permissionCache.set(userId, { permissions, at: Date.now() });
    return permissions;
}

export function clearPermissionCache(userId?: string) {
    if (userId) permissionCache.delete(userId);
    else permissionCache.clear();
}

const hasPermission = (requiredPermissions: string | string[]) => {
    return t.middleware(async ({ ctx, next }) => {
        if (!ctx.user) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: getMessage(ctx.locale, 'auth.authenticationRequired') });
        }

        const cached = permissionCache.get(ctx.user.userId);
        const userPermissions =
            cached && Date.now() - cached.at <= PERMISSION_CACHE_TTL_MS
                ? cached.permissions
                : await loadUserPermissions(ctx.db, ctx.user.userId);

        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        const normalizedRequired = permissions.map(normalizePermission);
        const hasRequiredPermission = normalizedRequired.some((perm) =>
            userPermissions.some((granted) => matchesGranted(perm, granted)),
        );

        if (!hasRequiredPermission) {
            throw new TRPCError({ code: 'FORBIDDEN', message: getMessage(ctx.locale, 'auth.insufficientPermissions') });
        }

        return next();
    });
};

const transactional = t.middleware(async ({ ctx, next }) => {
    return prisma.$transaction(async (tx) => {
        return next({
            ctx: {
                ...ctx,
                db: tx,
            },
        });
    });
});

const csrfProtected = t.middleware(({ ctx, next }) => {
    const providedToken = ctx.req.headers[CSRF_HEADER]?.toString();
    if (!providedToken || !validateCsrfToken(providedToken, ctx.csrfToken)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: getMessage(ctx.locale, 'auth.csrfTokenInvalid') });
    }

    return next();
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
export const csrfProtectedProcedure = protectedProcedure.use(csrfProtected);
export const transactionalProtectedProcedure = protectedProcedure.use(transactional);
export { hasPermission, transactional };

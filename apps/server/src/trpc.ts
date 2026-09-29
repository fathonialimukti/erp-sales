import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from './context.js';
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

const assertValidCsrfToken = (ctx: Context) => {
    const providedToken = ctx.req.headers[CSRF_HEADER]?.toString();
    if (!providedToken || !validateCsrfToken(providedToken, ctx.csrfToken)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: getMessage(ctx.locale, 'auth.csrfTokenInvalid') });
    }
};

/**
 * Central CSRF hook, applied once — see `protectedProcedure` below. That one
 * line covers every state-changing call in all 32 routers, so no router carries
 * its own CSRF annotation.
 *
 * Mutations are gated on the client echoing the httpOnly `csrf_token` cookie in
 * CSRF_HEADER, which is why `auth.csrfToken` (public) exists: the value has to
 * travel in a response body, the cookie itself is unreadable from the web
 * origin. See docs/security-testing-report.md 9.3.
 *
 * login and demoLogin stay exempt by living on `publicProcedure`, which is
 * required, not incidental: on a fresh visit `useAuthBootstrap` makes no tRPC
 * call until a stored token exists, so a first-time visitor holds no CSRF token
 * at login time and gating login would lock everyone out.
 */
export const csrfOnMutation = t.middleware(({ ctx, next, type }) => {
    if (type === 'mutation') assertValidCsrfToken(ctx);
    return next();
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed).use(csrfOnMutation);
export { hasPermission };

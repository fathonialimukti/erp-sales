/**
 * Token revocation (logout / stolen-token defense).
 *
 * JWTs are stateless; revocation is tracked in the `revoked_tokens` table
 * keyed by the token's `jti` claim, so it survives restarts. A process-local
 * in-memory set provides a fast path and covers legacy tokens without a jti.
 * Expired rows are purged periodically.
 */

import { prisma } from './prisma.js';

const memoryBlacklist = new Map<string, number>(); // token -> exp (ms)

const PURGE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let purgeStarted = false;

const startPurge = () => {
    if (purgeStarted) return;
    purgeStarted = true;
    setInterval(() => {
        void prisma.revokedToken
            .deleteMany({ where: { expiresAt: { lt: new Date() } } })
            .catch(() => {});
        const now = Date.now();
        for (const [token, exp] of memoryBlacklist) {
            if (exp <= now) memoryBlacklist.delete(token);
        }
    }, PURGE_INTERVAL_MS).unref();
};

/**
 * Revoke a token. Writes through to the DB when the token carries a `jti`
 * (all tokens issued by the current auth router do) and always records the
 * in-memory entry.
 */
export const addToBlacklist = async (params: { token: string; exp: number; jti?: string | null }): Promise<void> => {
    const { token, exp, jti } = params;
    memoryBlacklist.set(token, exp);
    startPurge();

    if (jti) {
        await prisma.revokedToken
            .upsert({
                where: { jti },
                create: { jti, expiresAt: new Date(exp) },
                update: { expiresAt: new Date(exp) },
            })
            .catch(() => {
                // Revocation must never break logout — memory entry still applies.
            });
    }
};

/**
 * Returns true if the token is currently revoked.
 * Checks memory first, then the DB when a jti is present.
 */
export const isBlacklisted = async (token: string, jti?: string | null): Promise<boolean> => {
    const entry = memoryBlacklist.get(token);
    if (entry !== undefined) {
        if (entry <= Date.now()) {
            memoryBlacklist.delete(token);
        } else {
            return true;
        }
    }

    if (jti) {
        try {
            const row = await prisma.revokedToken.findUnique({ where: { jti }, select: { expiresAt: true } });
            if (row) {
                if (row.expiresAt.getTime() <= Date.now()) {
                    await prisma.revokedToken.delete({ where: { jti } }).catch(() => {});
                    return false;
                }
                return true;
            }
        } catch {
            // DB unavailable — fail closed for tokens with jti: treat as revoked
            // rather than letting a logged-out token back in.
            return true;
        }
    }

    return false;
};

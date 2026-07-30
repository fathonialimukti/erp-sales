/**
 * In-memory token blacklist.
 *
 * JWT tokens are stateless and cannot be revoked before their expiry.
 * This blacklist provides a best-effort revocation mechanism for stolen
 * tokens. Note: the blacklist is process-local and resets on restart.
 */

type BlacklistedToken = {
    exp: number;
};

const blacklist = new Map<string, BlacklistedToken>();

const CLEANUP_INTERVAL_MS = 60 * 1000;

const cleanupExpired = () => {
    const now = Date.now();
    for (const [token, entry] of blacklist) {
        if (entry.exp <= now) {
            blacklist.delete(token);
        }
    }
};

let cleanupStarted = false;

const startCleanup = () => {
    if (cleanupStarted) return;
    cleanupStarted = true;
    setInterval(cleanupExpired, CLEANUP_INTERVAL_MS).unref();
};

/**
 * Adds a token to the blacklist with its expiry timestamp (ms since epoch).
 */
export const addToBlacklist = (token: string, exp: number): void => {
    blacklist.set(token, { exp });
    startCleanup();
};

/**
 * Returns true if the token is currently in the blacklist.
 */
export const isBlacklisted = (token: string): boolean => {
    const entry = blacklist.get(token);
    if (!entry) return false;
    if (entry.exp <= Date.now()) {
        blacklist.delete(token);
        return false;
    }
    return true;
};

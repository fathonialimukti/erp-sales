/**
 * Simple in-memory rate limiter for login attempts.
 * Limits each IP to MAX_ATTEMPTS within WINDOW_MS.
 * Resets the window after the window expires.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute

interface Entry {
    count: number;
    resetAt: number;
}

const store = new Map<string, Entry>();

/** Clean up expired entries periodically to prevent memory leaks. */
const CLEANUP_INTERVAL = 5 * 60_000; // 5 minutes
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
    if (cleanupTimer !== null) return;
    cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of store) {
            if (entry.resetAt <= now) {
                store.delete(ip);
            }
        }
    }, CLEANUP_INTERVAL);
    cleanupTimer.unref();
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    startCleanup();

    const now = Date.now();
    const existing = store.get(ip);

    if (!existing || existing.resetAt <= now) {
        const resetAt = now + WINDOW_MS;
        store.set(ip, { count: 1, resetAt });
        return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetAt };
    }

    if (existing.count >= MAX_ATTEMPTS) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count++;
    return { allowed: true, remaining: MAX_ATTEMPTS - existing.count, resetAt: existing.resetAt };
}

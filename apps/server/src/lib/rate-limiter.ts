/**
 * In-memory rate limiters (single-instance deployment).
 *
 * Login attempts use a fixed window and are rejected when exceeded.
 *
 * AI requests use rolling (sliding-window) counters and **queue instead of
 * drop**: `acquireAiSlot()` waits for capacity — bounded by AI_QUEUE_MAX_WAIT_MS
 * (default 25s, below the 30s request timeout) — and only 429s as a last
 * resort. Limits come from app settings (DB → env → default) so admins can
 * tune them in the Settings page:
 *  - ai.globalRpm  → upstream provider per-key quota (hard 10 req/min)
 *  - ai.userRpm    → per-user fairness cap, prevents one user hogging the quota
 */

import { getSettingValue } from './settings-service.js';
import { prisma } from './prisma.js';

const AI_WINDOW_MS = 60_000; // rolling 60s window, matches "per minute" quotas

interface Entry {
    count: number;
    resetAt: number;
}

const CLEANUP_INTERVAL_MS = 5 * 60_000;

function createLimiter(store: Map<string, Entry>) {
    let cleanupTimer: ReturnType<typeof setInterval> | null = null;
    return () => {
        if (cleanupTimer !== null) return;
        cleanupTimer = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of store) {
                if (entry.resetAt <= now) store.delete(key);
            }
        }, CLEANUP_INTERVAL_MS);
        cleanupTimer.unref();
    };
}

function hit(
    store: Map<string, Entry>,
    key: string,
    max: number,
    windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
        const resetAt = now + windowMs;
        store.set(key, { count: 1, resetAt });
        return { allowed: true, remaining: max - 1, resetAt };
    }

    if (existing.count >= max) {
        return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count++;
    return { allowed: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

function readPositiveIntEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) return fallback;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ---- Login attempts per IP (fixed window, reject on exceed) ----

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000; // 1 minute

const loginStore = new Map<string, Entry>();
const startLoginCleanup = createLimiter(loginStore);

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
    startLoginCleanup();
    return hit(loginStore, ip, MAX_ATTEMPTS, WINDOW_MS);
}

// ---- AI rate limiting (sliding window + wait queue) ----

/** Rolling-window counter: timestamps of admitted requests. */
class SlidingWindow {
    private timestamps: number[] = [];

    tryAcquire(max: number): { ok: true } | { ok: false; retryAt: number } {
        const now = Date.now();
        // Prune timestamps outside the window.
        while (this.timestamps.length > 0 && this.timestamps[0]! <= now - AI_WINDOW_MS) {
            this.timestamps.shift();
        }
        if (this.timestamps.length < max) {
            this.timestamps.push(now);
            return { ok: true };
        }
        return { ok: false, retryAt: this.timestamps[0]! + AI_WINDOW_MS };
    }

    /** True when no request in the window is still counting (fully drained). */
    idle(now: number): boolean {
        const last = this.timestamps[this.timestamps.length - 1];
        return last === undefined || last <= now - AI_WINDOW_MS;
    }
}

const globalWindow = new SlidingWindow();
const userWindows = new Map<string, SlidingWindow>();

function userWindow(userId: string): SlidingWindow {
    let window = userWindows.get(userId);
    if (!window) {
        window = new SlidingWindow();
        userWindows.set(userId, window);
    }
    return window;
}

// Bound per-user map growth: prune users whose windows went fully idle.
let userPruneTimer: ReturnType<typeof setInterval> | null = null;
function startUserWindowPrune() {
    if (userPruneTimer !== null) return;
    userPruneTimer = setInterval(() => {
        const now = Date.now();
        for (const [userId, window] of userWindows) {
            if (window.idle(now)) userWindows.delete(userId);
        }
    }, CLEANUP_INTERVAL_MS);
    userPruneTimer.unref();
}

async function readAiNumberSetting(key: string, env: string, fallback: number): Promise<number> {
    try {
        const value = await getSettingValue(prisma, key);
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
    } catch {
        // Settings unavailable (e.g. boot) — fall through to env.
    }
    return readPositiveIntEnv(env, fallback);
}

function queueMaxWaitMs(): number {
    return readPositiveIntEnv('AI_QUEUE_MAX_WAIT_MS', 25_000);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Acquire an AI request slot for `userId`, **waiting for capacity** instead of
 * dropping the request. Checks the per-user cap first (anti-hogging: a user at
 * their cap waits even when global capacity exists), then the global cap that
 * mirrors the upstream provider's hard per-key quota.
 *
 * Returns `{ ok: true }` when the slot is acquired, or `{ ok: false, retryAfter }`
 * only when the queue wait budget (`AI_QUEUE_MAX_WAIT_MS`) is exhausted.
 */
export async function acquireAiSlot(userId: string): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
    startUserWindowPrune();

    const deadline = Date.now() + queueMaxWaitMs();

    // Re-read limits each attempt (settings-service caches 30s) so admin
    // changes apply without a restart.
    let globalRetryAt = Infinity;

    while (true) {
        const userRpm = await readAiNumberSetting('ai.userRpm', 'AI_USER_RPM', 10);
        const globalRpm = await readAiNumberSetting('ai.globalRpm', 'AI_GLOBAL_RPM', 10);

        const userSlot = userWindow(userId).tryAcquire(userRpm);
        if (!userSlot.ok) {
            if (Date.now() >= deadline) {
                return { ok: false, retryAfter: Math.max(1, Math.ceil((userSlot.retryAt - Date.now()) / 1000)) };
            }
            await sleep(Math.min(userSlot.retryAt - Date.now(), deadline - Date.now(), 1000));
            continue;
        }

        const globalSlot = globalWindow.tryAcquire(globalRpm);
        if (!globalSlot.ok) {
            // The user slot is held for this request — it will be consumed by
            // the actual upstream call once global capacity frees up.
            globalRetryAt = globalSlot.retryAt;
            if (Date.now() >= deadline) {
                return { ok: false, retryAfter: Math.max(1, Math.ceil((globalRetryAt - Date.now()) / 1000)) };
            }
            await sleep(Math.min(globalSlot.retryAt - Date.now(), deadline - Date.now(), 1000));
            continue;
        }

        return { ok: true };
    }
}

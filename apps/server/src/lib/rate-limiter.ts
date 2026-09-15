/**
 * In-memory rate limiters (single-instance deployment).
 *
 * Login attempts use a fixed window and are rejected when exceeded.
 *
 * AI requests use a rolling (sliding-window) global counter and **queue
 * instead of drop**: `acquireAiSlot()` waits for capacity — bounded by
 * AI_QUEUE_MAX_WAIT_MS (default 25s, below the 30s request timeout) — and only
 * 429s as a last resort. The cap (`ai.globalRpm`, DB → env `AI_GLOBAL_RPM`)
 * mirrors the shared API key's per-minute quota; **unset = unlimited**.
 * Configurable in Settings → AI provider.
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
}

const globalWindow = new SlidingWindow();

/**
 * Effective global cap (req/min): DB → env. `null` = unlimited.
 */
async function readGlobalRpm(): Promise<number | null> {
    try {
        const value = await getSettingValue(prisma, 'ai.globalRpm');
        if (value === null) return null;
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            return Math.floor(value);
        }
    } catch {
        // Settings unavailable (e.g. boot) — fall through to env.
    }
    const raw = process.env['AI_GLOBAL_RPM'];
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function queueMaxWaitMs(): number {
    const raw = process.env['AI_QUEUE_MAX_WAIT_MS'];
    if (!raw) return 25_000;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 25_000;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Acquire an AI request slot, **waiting for capacity** instead of dropping the
 * request. The global cap is shared by all users because it mirrors the
 * upstream API key's per-minute quota. Unset cap → no limiting.
 *
 * Returns `{ ok: true }` when the slot is acquired, or `{ ok: false, retryAfter }`
 * only when the queue wait budget (`AI_QUEUE_MAX_WAIT_MS`) is exhausted.
 */
export async function acquireAiSlot(): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
    const globalRpm = await readGlobalRpm();
    if (globalRpm === null) return { ok: true }; // unlimited

    const deadline = Date.now() + queueMaxWaitMs();

    while (true) {
        const slot = globalWindow.tryAcquire(globalRpm);
        if (slot.ok) return { ok: true };

        if (Date.now() >= deadline) {
            return { ok: false, retryAfter: Math.max(1, Math.ceil((slot.retryAt - Date.now()) / 1000)) };
        }
        await sleep(Math.min(slot.retryAt - Date.now(), deadline - Date.now(), 1000));
    }
}

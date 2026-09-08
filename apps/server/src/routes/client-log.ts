import type { Request, Response } from 'express';
import * as z from 'zod';
import { logApp } from '../lib/app-log.js';
import { checkRateLimit } from '../lib/rate-limiter.js';

/**
 * POST /api/log/client
 *
 * Receives client-side errors/warnings (ErrorBoundary, global handlers) so
 * they appear in the in-app System Logs viewer. Unauthenticated by design —
 * errors can happen before login — but IP rate-limited and size-capped.
 */
const clientLogSchema = z.object({
    level: z.enum(['WARN', 'ERROR']).default('ERROR'),
    message: z.string().min(1).max(1000),
    stack: z.string().max(8000).optional(),
    url: z.string().max(500).optional(),
    userAgent: z.string().max(300).optional(),
});

export function clientLogHandler(req: Request, res: Response): void {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined)
        ?? req.socket?.remoteAddress
        ?? 'unknown';

    const rateLimit = checkRateLimit(`client-log:${ip}`);
    if (!rateLimit.allowed) {
        res.status(429).json({ error: 'Too many log requests' });
        return;
    }

    const parsed = clientLogSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid log payload' });
        return;
    }

    logApp({
        level: parsed.data.level,
        module: 'client',
        message: parsed.data.message,
        detail: {
            stack: parsed.data.stack,
            url: parsed.data.url,
            userAgent: parsed.data.userAgent ?? req.headers['user-agent'],
        },
    });

    res.status(204).end();
}

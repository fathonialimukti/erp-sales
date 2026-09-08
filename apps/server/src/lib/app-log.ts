/**
 * Operational application log (`app_logs` table) — surfaced in the in-app
 * System Logs viewer. Only notable events go to the DB (errors, warnings,
 * security events, client-reported errors); high-volume HTTP access logs
 * stay on stdout where pm2 captures them to file.
 */

import type { Prisma } from '../prisma/generated/client';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import type { DbClient } from './prisma.js';

export type AppLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface AppLogEntry {
    level: AppLogLevel;
    module: string;
    message: string;
    detail?: Prisma.InputJsonValue;
    requestId?: string;
    userId?: string;
}

const STDOUT_LEVEL = {
    DEBUG: 'info',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
} as const;

/** Write to stdout AND the app_logs table (best-effort — logging never throws). */
export function logApp(entry: AppLogEntry, db: DbClient = prisma): void {
    logger[STDOUT_LEVEL[entry.level]](entry.message, {
        module: entry.module,
        requestId: entry.requestId,
        userId: entry.userId,
    });

    void db.appLog
        .create({
            data: {
                level: entry.level,
                module: entry.module,
                message: entry.message.slice(0, 2000),
                detail: entry.detail,
                requestId: entry.requestId,
                userId: entry.userId,
            },
        })
        .catch(() => {});
}

// --- Retention ---

const DEFAULT_RETENTION_DAYS = 30;
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let pruneStarted = false;

export function startAppLogRetention(): void {
    if (pruneStarted) return;
    pruneStarted = true;

    const prune = () => {
        const days = Number(process.env.APP_LOG_RETENTION_DAYS ?? DEFAULT_RETENTION_DAYS);
        const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000);
        void prisma.appLog.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
    };

    prune();
    setInterval(prune, PRUNE_INTERVAL_MS).unref();
}

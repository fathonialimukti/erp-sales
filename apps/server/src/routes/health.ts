import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { logApp } from '../lib/app-log.js';

export async function healthHandler(_req: Request, res: Response) {
  res.json({ status: 'ok', uptime: process.uptime() });
}

export async function readyHandler(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'connected' });
  } catch (error) {
    // /readyz is unauthenticated, so the driver message (DSN fragments, host,
    // schema names) must stay server-side — security-testing-report §8.
    logApp({
      level: 'ERROR',
      module: 'api',
      message: 'Readiness probe failed: database unreachable',
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
    res.status(503).json({ status: 'not_ready', db: 'disconnected' });
  }
}

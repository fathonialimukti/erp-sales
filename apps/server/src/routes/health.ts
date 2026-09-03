import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export async function healthHandler(_req: Request, res: Response) {
  res.json({ status: 'ok', uptime: process.uptime() });
}

export async function readyHandler(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', db: 'disconnected', error: String(error) });
  }
}

import { sweepTestRows } from './test-db.js';

/**
 * Runs once, in the main process, before any worker forks: sweep the rows a
 * previous run leaked so this run starts from a known state. Per-file accounting
 * lives in `setup.ts`.
 */
export default async function setup(): Promise<void> {
  const { prisma } = await import('../lib/prisma.js');
  try {
    await sweepTestRows(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

import 'dotenv/config';
import { afterAll, afterEach } from 'vitest';

process.env.DB_POOL_MAX = process.env.DB_POOL_MAX ?? '5';
process.env.DB_POOL_IDLE_MS = process.env.DB_POOL_IDLE_MS ?? '10000';
process.env.DB_POOL_CONNECT_TIMEOUT_MS = process.env.DB_POOL_CONNECT_TIMEOUT_MS ?? '5000';

process.on('warning', (warning) => {
  if (
    warning.name === 'DeprecationWarning' &&
    warning.message.includes('Calling client.query() when the client is already executing a query')
  ) {
    return;
  }
  console.warn(warning);
});

const { prisma } = await import('../lib/prisma.js');
const { clearSettingsCache } = await import('../lib/settings-service.js');
const { clearPermissionCache } = await import('../trpc.js');

// The suite runs sequentially against a shared DB — drop in-memory caches
// between files so tests observe each other's settings/permission changes.
afterEach(() => {
  clearSettingsCache();
  clearPermissionCache();
});

afterAll(async () => {
  await prisma.$disconnect();
});

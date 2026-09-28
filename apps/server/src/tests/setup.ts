import 'dotenv/config';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { rowCountDrift, rowCounts } from './test-db.js';

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

// Caches are per-process and the database is not; drop them between tests so a
// test never reads a permission or setting the previous test just wrote.
afterEach(() => {
  clearSettingsCache();
  clearPermissionCache();
});

let before: Record<string, number> = {};

// setup-file hooks are registered before the test file's own, and Vitest runs
// root-level `afterAll` last, so this fires after the file's teardown. That is
// the only point at which "what did this file leave behind" is meaningful.
beforeAll(async () => {
  before = await rowCounts(prisma);
});

/**
 * Reintroduction guard: a test file may change the database, but only by the
 * rows it created and by the rows it deleted itself. Any drift is reported
 * against the file that caused it.
 *
 * It replaces the `.catch(() => {})` teardown swallows that used to turn a leak
 * into a green run, and it is what would have caught the 32 junk users and 43
 * `TEST*` roles the suite was carrying in the developer's database.
 */
afterAll(async () => {
  try {
    const drift = rowCountDrift(before, await rowCounts(prisma));
    if (drift.length > 0) {
      throw new Error(
        `This test file changed the database outside its own rows (leaked or deleted pre-existing rows): ${drift.join(', ')}`
      );
    }
  } finally {
    await prisma.$disconnect();
  }
});

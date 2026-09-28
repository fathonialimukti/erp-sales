import 'dotenv/config';
import type { PrismaClient } from '../prisma/generated/client';

/**
 * Database hygiene for the integration suite.
 *
 * The suite runs against one database that it does not own, and used to share it
 * with the developer's live data and with whatever the previous run left behind.
 * Measured consequences, all of them defects:
 *
 *  - `backup.test.ts` restores a backup by deleting and re-inserting every row
 *    of every table — 264 permission rows per run (2 restores x 132). When a
 *    file's teardown lands inside another file's setup, the row the second file
 *    just upserted is gone and its `INSERT` fails with
 *    `role_has_permissions_permission_id_fkey` / `backups_created_by_id_fkey`.
 *    Vitest reports a failed `beforeAll` as *skipped* tests, so the file's
 *    coverage then disappeared from the summary — the suite reported 0, 7, 8,
 *    13 and 22 skipped across runs of the same 453 tests.
 *  - Teardown that deleted by name pattern rather than by id removed rows the
 *    suite never created: real `app_settings` (company name, SMTP host, AI
 *    keys). The drift check below caught that on its first run.
 *  - Rows survived runs: the database was carrying 32 `@example.com` users and
 *    43 `TEST*` roles that no teardown owned, so a test could pass or fail
 *    depending on what the previous run had left behind.
 *
 * Two mechanisms close that, and neither needs a second database:
 *
 *  1. `sweepTestRows` before the run deletes only rows the suite can prove are
 *     its own, so every run starts from the same state.
 *  2. `rowCountDrift` after every file fails that file if it left anything
 *     behind or removed a row that was already there. That is the guard against
 *     reintroduction, and it is what turns "the suite fails 2 runs in 7" into
 *     "the file that leaked is named on the run that leaked".
 *
 * A dedicated test *database* removes the whole class and is what CI already
 * does (`DATABASE_URL=…/erp_sales_test`): a test role there is free to be
 * reset, so nothing needs these two mechanisms. A dedicated test *schema* is
 * not available here: `lib/prisma.ts` builds `new PrismaPg({ connectionString })`
 * and `@prisma/adapter-pg` reports a `schemaName` only from its second
 * constructor argument, so `?schema=` on the URL is ignored and every statement
 * is qualified `public`.
 */

/**
 * Delete rows a previous run left behind, and only rows the suite can prove it
 * created. Every predicate is an unambiguous test marker, so this can never
 * touch real data — unlike `prisma db seed`, whose `deleteMany` wipes all
 * permissions, roles, grants and the CRM tables.
 */
export const sweepTestRows = async (prisma: PrismaClient): Promise<void> => {
  // `role_has_permissions` and `activity_logs` cascade from the rows below.
  await prisma.user.deleteMany({ where: { email: { endsWith: '@example.com' } } });
  await prisma.role.deleteMany({ where: { name: { startsWith: 'TEST' } } });
  await prisma.permission.deleteMany({
    where: { OR: [{ name: { startsWith: 'TEST' } }, { name: { startsWith: 'RBAC_PERMISSION_' } }] },
  });
  await prisma.aiActionConfirmation.deleteMany({ where: { widgetId: { startsWith: 'widget-' } } });
  await prisma.backup.deleteMany({ where: { createdBy: { email: { endsWith: '@example.com' } } } });
};

/** Row count of every table, in one round trip. */
export const rowCounts = async (prisma: PrismaClient): Promise<Record<string, number>> => {
  const rows = await prisma.$queryRaw<Array<{ table_name: string; n: bigint }>>`
    SELECT c.relname AS table_name,
           (xpath('/row/c/text()', query_to_xml(
             format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, ''
           )))[1]::text::bigint AS n
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = current_schema()
      AND c.relname <> '_prisma_migrations'
  `;
  return Object.fromEntries(rows.map((r) => [r.table_name, Number(r.n)]));
};

/**
 * What a test file did to the database beyond its own rows.
 *
 * `+n` means it left `n` rows behind; `-n` means it removed `n` rows that were
 * already there — the failure mode that quietly ate real app settings.
 * `app_logs` is excluded: `lib/app-log.ts` writes it as a side effect of running
 * code under test, so its contents say nothing about test hygiene.
 */
export const rowCountDrift = (
  before: Record<string, number>,
  after: Record<string, number>,
  ignore: readonly string[] = ['app_logs']
): string[] => {
  const drift: string[] = [];
  for (const table of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (ignore.includes(table)) continue;
    const delta = (after[table] ?? 0) - (before[table] ?? 0);
    if (delta === 0) continue;
    drift.push(`${table} ${delta > 0 ? `+${delta}` : delta}`);
  }
  return drift.sort();
};

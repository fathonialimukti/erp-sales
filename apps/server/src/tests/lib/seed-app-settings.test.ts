import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { seedAppSettings } from '../../lib/seed-app-settings.js';

// T16: reseeding must INSERT defaults only — a Settings-configured SMTP port/pass
// is never overwritten by a plain reseed (`prisma db seed` without reset). Note
// `db:all` runs `db push --force-reset` first, which drops the table, so a full
// reset cannot preserve the row and re-inserts the env/bootstrap default.
const KEYS = ['smtp.port', 'smtp.pass'];

type SavedRow = { key: string; value: unknown; updatedBy: string | null };
let saved: SavedRow[] = [];

async function wipe() {
  await prisma.appSetting.deleteMany({ where: { key: { in: KEYS } } });
}

beforeAll(async () => {
  // Preserve whatever this dev DB currently holds and restore it in afterAll —
  // these tests delete/recreate shared app_settings rows.
  const rows = await prisma.appSetting.findMany({ where: { key: { in: KEYS } } });
  saved = rows.map((r) => ({ key: r.key, value: r.value, updatedBy: r.updatedBy }));
  await wipe();
});

beforeEach(wipe);

afterAll(async () => {
  await wipe();
  for (const row of saved) {
    await prisma.appSetting.create({
      data: { key: row.key, value: row.value as never, updatedBy: row.updatedBy },
    });
  }
});

describe('seedAppSettings (insert-only)', () => {
  it('inserts the env/bootstrap default when the key is absent', async () => {
    await seedAppSettings(prisma, { SMTP_PORT: '2525' } as NodeJS.ProcessEnv);

    const row = await prisma.appSetting.findUnique({ where: { key: 'smtp.port' } });
    expect(row?.value).toBe(2525);
  });

  it('never overwrites an existing smtp.port on reseed', async () => {
    await prisma.appSetting.create({ data: { key: 'smtp.port', value: 2525, updatedBy: 'user' } });

    await seedAppSettings(prisma, { SMTP_PORT: '587' } as NodeJS.ProcessEnv);

    const row = await prisma.appSetting.findUnique({ where: { key: 'smtp.port' } });
    expect(row?.value).toBe(2525);
    expect(row?.updatedBy).toBe('user');
  });

  it('never overwrites an existing secret row (smtp.pass) on reseed', async () => {
    await prisma.appSetting.create({ data: { key: 'smtp.pass', value: 'user-secret', updatedBy: 'user' } });

    await seedAppSettings(prisma, { SMTP_PASS: 'seed-secret' } as NodeJS.ProcessEnv);

    const row = await prisma.appSetting.findUnique({ where: { key: 'smtp.pass' } });
    expect(row?.value).toBe('user-secret');
  });
});

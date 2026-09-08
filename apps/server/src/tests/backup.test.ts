import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BackupEnvelope } from '@repo/schemas/backup';
import { createCaller } from './helpers/caller.js';
import { seedRoleWithPermissions, seedTestUser } from './helpers/seed.js';
import {
  BACKUPS_DIR,
  getOrderedTableNames,
  parseBackupEnvelope,
  readBackupFile,
  writeBackupFile,
} from '../lib/backup.js';
import { prisma } from '../lib/prisma.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url)); // apps/server/src/tests
// Same file the router's getAppVersion reads: apps/server/package.json
const CURRENT_VERSION = (
  JSON.parse(readFileSync(path.resolve(TEST_DIR, '../../package.json'), 'utf8')) as { version: string }
).version;

const asTableCounts = (value: unknown): Record<string, number> => value as Record<string, number>;

const filePathFor = (filename: string) => path.join(BACKUPS_DIR, path.basename(filename));
const fileExists = async (filename: string): Promise<boolean> => {
  try {
    await fs.access(filePathFor(filename));
    return true;
  } catch {
    return false;
  }
};

let caller: ReturnType<typeof createCaller>;
let actorUserId: string;
let actorName: string;

// Cleanup tracking. Restores in this file wipe every table (including Backup),
// so every cleanup step tolerates rows that no longer exist.
const createdFilenames: string[] = [];
const createdBackupIds: string[] = [];
const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];
const createdRegionIds: string[] = [];
const createdAreaIds: string[] = [];

const trackBackup = <T extends { id: string; filename: string }>(row: T): T => {
  createdBackupIds.push(row.id);
  createdFilenames.push(row.filename);
  return row;
};

beforeAll(async () => {
  const role = await seedRoleWithPermissions([
    'backup@read', 'backup@create', 'backup@delete', 'backup@restore',
  ]);
  createdRoleIds.push(role.id);
  const actor = await seedTestUser({
    roleId: role.id,
    email: `backup-actor-${randomUUID()}@example.com`,
    name: 'Backup Actor',
  });
  actorUserId = actor.id;
  actorName = actor.name ?? 'Backup Actor';
  createdUserIds.push(actor.id);
  caller = createCaller({ userId: actor.id, email: actor.email, name: actor.name });
});

afterAll(async () => {
  for (const id of createdAreaIds) await prisma.area.delete({ where: { id } }).catch(() => {});
  for (const id of createdRegionIds) await prisma.region.delete({ where: { id } }).catch(() => {});
  for (const id of createdBackupIds) await prisma.backup.delete({ where: { id } }).catch(() => {});
  for (const filename of createdFilenames) await fs.rm(filePathFor(filename), { force: true }).catch(() => {});
  for (const id of createdUserIds) await prisma.user.delete({ where: { id } }).catch(() => {});
  for (const id of createdRoleIds) await prisma.role.delete({ where: { id } }).catch(() => {});
});

describe('backup router & service', () => {
  it('roundtrip: create backup, mutate data, restore, data matches the original snapshot', async () => {
    // ponytail: no row-by-row goldfile of all 42 tables — snapshot counts plus a
    // sentinel row and revert assertions prove restore fidelity without a fixture.
    const sentinel = await prisma.region.create({
      data: { name: `backup-keep-${randomUUID()}`, code: `BK-${randomUUID().slice(0, 8)}` },
    });
    createdRegionIds.push(sentinel.id);

    const created = trackBackup(await caller.backup.create({ note: 'roundtrip' }));
    expect(created.source).toBe('CREATED');
    expect(created.schemaVersion).toBe(CURRENT_VERSION);
    expect(created.sizeBytes).toBeGreaterThan(0);
    expect(await fileExists(created.filename)).toBe(true);
    const snapshotCounts = asTableCounts(created.tableCounts);
    expect(snapshotCounts.Region).toBeGreaterThanOrEqual(1);
    expect(snapshotCounts.User).toBeGreaterThanOrEqual(1);

    // Mutate after the snapshot: insert a new row and edit the sentinel.
    const extra = await prisma.region.create({
      data: { name: `backup-extra-${randomUUID()}`, code: `BX-${randomUUID().slice(0, 8)}` },
    });
    createdRegionIds.push(extra.id);
    await prisma.region.update({ where: { id: sentinel.id }, data: { name: 'backup-mutated-away' } });

    const restored = await caller.backup.restore({ id: created.id });
    for (const [table, count] of Object.entries(snapshotCounts)) {
      expect(restored.tableCounts[table]).toBe(count);
    }

    // The post-snapshot row is gone; the sentinel is reverted to its snapshot value.
    expect(await prisma.region.findUnique({ where: { id: extra.id } })).toBeNull();
    const reverted = await prisma.region.findUnique({ where: { id: sentinel.id } });
    expect(reverted?.name).toBe(sentinel.name);

    // Full-database restore: the actor user comes back from the snapshot.
    expect(await prisma.user.findUnique({ where: { id: actorUserId } })).not.toBeNull();
    // The Backup row itself did not exist at snapshot time, so the wipe removed it.
    expect(await prisma.backup.findUnique({ where: { id: created.id } })).toBeNull();
  });

  it('restore respects FK order for parent/child tables', async () => {
    const order = await getOrderedTableNames();
    expect(order.indexOf('Region')).toBeLessThan(order.indexOf('Area'));

    const region = await prisma.region.create({
      data: { name: `backup-fk-region-${randomUUID()}`, code: `FR-${randomUUID().slice(0, 8)}` },
    });
    createdRegionIds.push(region.id);
    const area = await prisma.area.create({
      data: { name: `backup-fk-area-${randomUUID()}`, code: `FA-${randomUUID().slice(0, 8)}`, regionId: region.id },
    });
    createdAreaIds.push(area.id);

    const created = trackBackup(await caller.backup.create({ note: 'fk-order' }));
    const snapshotCounts = asTableCounts(created.tableCounts);
    expect(snapshotCounts.Area).toBeGreaterThanOrEqual(1);

    await prisma.area.delete({ where: { id: area.id } });
    await prisma.region.delete({ where: { id: region.id } });
    expect(await prisma.area.findUnique({ where: { id: area.id } })).toBeNull();

    // Children are wiped before parents, then inserted parents before children —
    // a wrong order would reject with an FK violation instead of resolving.
    const restored = await caller.backup.restore({ id: created.id });
    expect(restored.tableCounts.Region).toBe(snapshotCounts.Region);
    expect(restored.tableCounts.Area).toBe(snapshotCounts.Area);

    const backRegion = await prisma.region.findUnique({ where: { id: region.id } });
    const backArea = await prisma.area.findUnique({ where: { id: area.id } });
    expect(backRegion).not.toBeNull();
    expect(backArea?.regionId).toBe(region.id);
  });

  it('restore refuses a backup whose schemaVersion does not match the current version', async () => {
    const created = trackBackup(await caller.backup.create({ note: 'version-mismatch' }));

    const envelope = parseBackupEnvelope(await readBackupFile(created.filename));
    expect(envelope.meta.schemaVersion).toBe(CURRENT_VERSION);
    const tampered: BackupEnvelope = {
      ...envelope,
      meta: { ...envelope.meta, schemaVersion: '0.0.0-tampered' },
    };
    await fs.writeFile(filePathFor(created.filename), JSON.stringify(tampered), 'utf8');

    await expect(caller.backup.restore({ id: created.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: `Backup schema version 0.0.0-tampered does not match current version ${CURRENT_VERSION}`,
    });

    // Refusal happens before the wipe: row and file are untouched.
    expect(await prisma.backup.findUnique({ where: { id: created.id } })).not.toBeNull();
    expect(await fileExists(created.filename)).toBe(true);
    await prisma.backup.delete({ where: { id: created.id } }).catch(() => {});
  });

  it('restore refuses an envelope whose data omits table keys (no silent wipe)', async () => {
    const sentinel = await prisma.region.create({
      data: { name: `backup-incomplete-${randomUUID()}`, code: `BI-${randomUUID().slice(0, 8)}` },
    });
    createdRegionIds.push(sentinel.id);

    const created = trackBackup(await caller.backup.create({ note: 'incomplete' }));

    // Schema-valid (passes backupEnvelopeSchema) but truncated: `data` keeps only the first
    // exported table. Restoring must refuse instead of wiping every unlisted table.
    const ordered = await getOrderedTableNames();
    const kept = ordered[0]!;
    const firstMissing = ordered[1]!;
    const envelope = parseBackupEnvelope(await readBackupFile(created.filename));
    const truncated: BackupEnvelope = {
      ...envelope,
      data: { [kept]: envelope.data[kept] ?? [] },
    };
    await fs.writeFile(filePathFor(created.filename), JSON.stringify(truncated), 'utf8');

    await expect(caller.backup.restore({ id: created.id })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: `Backup file is incomplete: missing data for table ${firstMissing}`,
    });

    // Refusal happens before the wipe: the sentinel survives and row/file are untouched.
    expect(await prisma.region.findUnique({ where: { id: sentinel.id } })).not.toBeNull();
    expect(await prisma.backup.findUnique({ where: { id: created.id } })).not.toBeNull();
    expect(await fileExists(created.filename)).toBe(true);
    await prisma.backup.delete({ where: { id: created.id } }).catch(() => {});
  });

  it('parseBackupEnvelope rejects malformed content and the upload flow stores a valid envelope', async () => {
    // Invalid JSON -> sentinel error.
    expect(() => parseBackupEnvelope('not-json{{')).toThrow('BACKUP_FILE_MALFORMED');
    // Valid JSON that is not an envelope -> rejected by the envelope schema.
    expect(() => parseBackupEnvelope(JSON.stringify({ hello: 'world' }))).toThrow();
    expect(() =>
      parseBackupEnvelope(JSON.stringify({ meta: { schemaVersion: '1', createdAt: 'x', tableCounts: {} } })),
    ).toThrow();

    // Full upload path: envelope -> file on disk -> registered UPLOADED row -> downloadable.
    const envelope: BackupEnvelope = {
      meta: {
        schemaVersion: CURRENT_VERSION,
        createdAt: new Date().toISOString(),
        tableCounts: { Region: 1 },
      },
      data: {
        Region: [{ id: `upload-region-${randomUUID()}`, name: 'Upload Flow Region', code: `UF-${randomUUID().slice(0, 8)}` }],
      },
    };
    const stored = await writeBackupFile(envelope);
    createdFilenames.push(stored.filename);
    expect(stored.sizeBytes).toBe(Buffer.byteLength(JSON.stringify(envelope), 'utf8'));
    expect(await fileExists(stored.filename)).toBe(true);

    const uploaded = await prisma.backup.create({
      data: {
        filename: stored.filename,
        sizeBytes: stored.sizeBytes,
        tableCounts: envelope.meta.tableCounts,
        schemaVersion: envelope.meta.schemaVersion,
        source: 'UPLOADED',
        note: 'upload flow',
        createdById: actorUserId,
      },
    });
    createdBackupIds.push(uploaded.id);

    const redownloaded = await caller.backup.download({ id: uploaded.id });
    expect(redownloaded.filename).toBe(stored.filename);
    expect(parseBackupEnvelope(redownloaded.content)).toEqual(envelope);
    await prisma.backup.delete({ where: { id: uploaded.id } }).catch(() => {});
  });

  it('delete removes both the file from disk and the Backup row', async () => {
    const created = trackBackup(await caller.backup.create({ note: 'to-delete' }));
    expect(await fileExists(created.filename)).toBe(true);

    const del = await caller.backup.delete({ id: created.id });
    expect(del).toEqual({ success: true });
    expect(await prisma.backup.findUnique({ where: { id: created.id } })).toBeNull();
    expect(await fileExists(created.filename)).toBe(false);

    const createActivity = await prisma.activityLog.findFirst({
      where: { resource: 'backup', resourceId: created.id, action: 'CREATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(createActivity).toBeTruthy();
    const deleteActivity = await prisma.activityLog.findFirst({
      where: { resource: 'backup', resourceId: created.id, action: 'DELETE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(deleteActivity).toBeTruthy();

    await expect(caller.backup.delete({ id: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('download returns the stored envelope content and NOT_FOUND for missing row or file', async () => {
    const created = trackBackup(await caller.backup.create({ note: 'download-me' }));

    const result = await caller.backup.download({ id: created.id });
    expect(result.filename).toBe(created.filename);
    const parsed = parseBackupEnvelope(result.content);
    expect(parsed.meta.schemaVersion).toBe(CURRENT_VERSION);
    expect(parsed.meta.tableCounts).toEqual(asTableCounts(created.tableCounts));
    // Every exported table is present in the payload.
    expect(Object.keys(parsed.data).sort()).toEqual(Object.keys(asTableCounts(created.tableCounts)).sort());

    await expect(caller.backup.download({ id: randomUUID() })).rejects.toMatchObject({ code: 'NOT_FOUND' });

    // Row exists but the file was removed from disk -> NOT_FOUND, not a crash.
    const ghost = await prisma.backup.create({
      data: {
        filename: `ghost-${randomUUID()}.json`,
        sizeBytes: 1,
        tableCounts: {},
        schemaVersion: CURRENT_VERSION,
        source: 'CREATED',
        createdById: actorUserId,
      },
    });
    createdBackupIds.push(ghost.id);
    await expect(caller.backup.download({ id: ghost.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await prisma.backup.delete({ where: { id: ghost.id } }).catch(() => {});
  });

  it('list returns the paginated meta shape, pages rows, and matches search', async () => {
    const token = `pag-${randomUUID()}`;
    const first = trackBackup(await caller.backup.create({ note: `${token}-first` }));
    const second = trackBackup(await caller.backup.create({ note: `${token}-second` }));

    const page1 = await caller.backup.list({ page: 1, limit: 1, search: token });
    expect(page1.data).toHaveLength(1);
    expect(page1.meta).toEqual({ total: 2, totalPages: 2, page: 1, limit: 1 });

    const page2 = await caller.backup.list({ page: 2, limit: 1, search: token });
    expect(page2.data).toHaveLength(1);
    expect(page2.meta).toEqual({ total: 2, totalPages: 2, page: 2, limit: 1 });

    const page1Row = page1.data[0]!;
    const page2Row = page2.data[0]!;
    expect([page1Row.filename, page2Row.filename].sort())
      .toEqual([first.filename, second.filename].sort());
    expect(page1Row).toMatchObject({ source: 'CREATED', note: expect.stringContaining(token) });
    expect(page1Row.createdBy).toEqual({ id: actorUserId, name: actorName });

    // Input is optional — defaults to page 1, limit 10.
    const bare = await caller.backup.list();
    expect(bare.meta.page).toBe(1);
    expect(bare.meta.limit).toBe(10);
    expect(bare.meta.total).toBeGreaterThanOrEqual(2);
  });
});

describe('backup permission denials', () => {
  let deniedCaller: ReturnType<typeof createCaller>;

  beforeAll(async () => {
    // A role with no backup permissions at all.
    const role = await seedRoleWithPermissions(['region@read']);
    createdRoleIds.push(role.id);
    const denied = await seedTestUser({
      roleId: role.id,
      email: `backup-denied-${randomUUID()}@example.com`,
      name: 'Backup Denied',
    });
    createdUserIds.push(denied.id);
    deniedCaller = createCaller({ userId: denied.id, email: denied.email, name: denied.name });
  });

  it('denies backup.create without backup@create', async () => {
    await expect(deniedCaller.backup.create({ note: 'nope' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('denies backup.list and backup.download without backup@read', async () => {
    await expect(deniedCaller.backup.list({ page: 1, limit: 10 })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(deniedCaller.backup.download({ id: 'nope' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('denies backup.delete without backup@delete', async () => {
    await expect(deniedCaller.backup.delete({ id: 'nope' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('denies backup.restore without backup@restore', async () => {
    // Permission check runs before the transaction opens, so no wipe can happen.
    await expect(deniedCaller.backup.restore({ id: 'nope' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

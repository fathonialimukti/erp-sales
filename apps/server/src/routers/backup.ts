import { TRPCError } from '@trpc/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupCreateInputSchema, backupIdInputSchema, backupListInputSchema, type BackupEnvelope } from '@repo/schemas/backup';
import { logActivity } from '../lib/activity-log.js';
import { deleteBackupFile, exportBackupToDisk, parseBackupEnvelope, readBackupFile, restoreFromBackup } from '../lib/backup.js';
import { buildCreateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

// ponytail: resolves to apps/server/package.json from both src/ (dev) and dist/ (build)
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_JSON_PATH = path.resolve(MODULE_DIR, '../../package.json');

function getAppVersion(): string {
  return (JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as { version: string }).version;
}

function mapBackupFileError(error: unknown): TRPCError | undefined {
  const message = (error as Error)?.message;
  if (message === 'BACKUP_FILE_NOT_FOUND') {
    return new TRPCError({ code: 'NOT_FOUND', message: 'Backup file not found.' });
  }
  if (message === 'BACKUP_FILE_MALFORMED') {
    return new TRPCError({ code: 'BAD_REQUEST', message: 'Backup file is malformed.' });
  }
  // restoreFromBackup refuses envelopes whose data omits table keys (silent-wipe guard).
  const incomplete = /^BACKUP_FILE_INCOMPLETE: (.+)$/.exec(message ?? '');
  if (incomplete) {
    return new TRPCError({
      code: 'BAD_REQUEST',
      message: `Backup file is incomplete: missing data for table ${incomplete[1]}`,
    });
  }
  return undefined;
}

export const backupRouter = router({
  list: protectedProcedure
    .use(hasPermission('backup@read'))
    .input(backupListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['filename', 'note'] as const);

      const [data, total] = await Promise.all([
        prisma.backup.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        }),
        prisma.backup.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  download: protectedProcedure
    .use(hasPermission('backup@read'))
    .input(backupIdInputSchema)
    .query(async ({ input }) => {
      const backup = await prisma.backup.findUnique({ where: { id: input.id } });
      if (!backup) throw new TRPCError({ code: 'NOT_FOUND', message: 'Backup not found.' });

      let content: string;
      try {
        content = await readBackupFile(backup.filename);
      } catch (error) {
        const mapped = mapBackupFileError(error);
        if (mapped) throw mapped;
        throw error;
      }

      return { filename: backup.filename, content };
    }),

  create: protectedProcedure
    .use(hasPermission('backup@create'))
    .input(backupCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const result = await exportBackupToDisk({ schemaVersion: getAppVersion() });

      // The file is already on disk — if the row insert fails, remove it instead of
      // leaving an orphaned file that no Backup row references.
      const created = await prisma.backup
        .create({
          data: {
            filename: result.filename,
            sizeBytes: result.sizeBytes,
            tableCounts: result.tableCounts,
            schemaVersion: result.schemaVersion,
            source: 'CREATED',
            note: input.note,
            createdById: ctx.user.userId,
          },
        })
        .catch(async (error) => {
          await deleteBackupFile(result.filename);
          throw error;
        });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'backup',
        resourceId: created.id,
        message: `Created backup ${created.filename}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  delete: protectedProcedure
    .use(hasPermission('backup@delete'))
    .input(backupIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.backup.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Backup not found.' });

      await deleteBackupFile(existing.filename);
      await prisma.backup.delete({ where: { id: existing.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'backup',
        resourceId: existing.id,
        message: `Deleted backup ${existing.filename}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),

  // ponytail: the transaction is opened in the body because this restore needs explicit
  // options — Prisma's 5s default interactive-transaction timeout rolls back real-size
  // restores. Composition is unchanged: isAuthed -> hasPermission still run before the
  // transaction opens, so denials and refusals never wipe anything.
  restore: protectedProcedure
    .use(hasPermission('backup@restore'))
    .input(backupIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      const backup = await prisma.backup.findUnique({ where: { id: input.id } });
      if (!backup) throw new TRPCError({ code: 'NOT_FOUND', message: 'Backup not found.' });

      let envelope: BackupEnvelope;
      try {
        envelope = parseBackupEnvelope(await readBackupFile(backup.filename));
      } catch (error) {
        const mapped = mapBackupFileError(error);
        if (mapped) throw mapped;
        throw error;
      }

      const backupVersion = envelope.meta.schemaVersion;
      const currentVersion = getAppVersion();
      if (backupVersion !== currentVersion) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Backup schema version ${backupVersion} does not match current version ${currentVersion}`,
        });
      }

      const { tableCounts } = await prisma
        .$transaction(
          async (tx) => {
            const counts = await restoreFromBackup(tx, envelope);
            await logActivity(tx, {
              action: 'IMPORT',
              userId: ctx.user.userId,
              resource: 'backup',
              resourceId: backup.id,
              message: `Restored backup ${backup.filename}`,
              detail: { tableCounts: counts },
            });
            return counts;
          },
          { timeout: 120_000, maxWait: 10_000 },
        )
        .catch((error: unknown) => {
          const mapped = mapBackupFileError(error);
          if (mapped) throw mapped;
          throw error;
        });

      return { tableCounts };
    }),
});

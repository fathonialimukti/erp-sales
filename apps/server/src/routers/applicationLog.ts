import { TRPCError } from '@trpc/server';
import type { AppLog, LogLevel, Prisma } from '../prisma/generated/client';
import { buildPaginationMeta, buildPaginationParams } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import {
  applicationLogIdSchema,
  listApplicationLogSchema,
  type ApplicationLogLevel,
} from '@repo/schemas/applicationLog';

const toDbLevel = (level: ApplicationLogLevel): LogLevel => level.toUpperCase() as LogLevel;

// Read model per frozen contract: `source` = AppLog.module,
// `meta` = AppLog.detail, lowercase level.
const toApplicationLog = (row: AppLog) => ({
  id: row.id,
  level: row.level.toLowerCase() as ApplicationLogLevel,
  message: row.message,
  meta: row.detail ?? undefined,
  source: row.module,
  createdAt: row.createdAt,
});

/**
 * Application Log — read-only view over the `app_logs` table (writes are
 * system-internal via logApp). Gated by `applicationLog@read`.
 * No create/update/delete procedures, hence no activity-log writes.
 */
export const applicationLogRouter = router({
  list: protectedProcedure
    .use(hasPermission('applicationLog@read'))
    .input(listApplicationLogSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);

      const where: Prisma.AppLogWhereInput = {
        ...(input?.level && { level: toDbLevel(input.level) }),
        ...(input?.source && { module: input.source }),
        ...(input?.startDate || input?.endDate
          ? {
              createdAt: {
                ...(input.startDate && { gte: new Date(input.startDate) }),
                ...(input.endDate && { lte: new Date(input.endDate) }),
              },
            }
          : {}),
        ...(input?.search && {
          OR: [
            { message: { contains: input.search, mode: 'insensitive' as const } },
            { module: { contains: input.search, mode: 'insensitive' as const } },
            { requestId: { contains: input.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [rows, total] = await Promise.all([
        prisma.appLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.appLog.count({ where }),
      ]);

      return { data: rows.map(toApplicationLog), meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('applicationLog@read'))
    .input(applicationLogIdSchema)
    .query(async ({ input }) => {
      const row = await prisma.appLog.findUnique({ where: { id: input.id } });
      if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Application log not found.' });
      return toApplicationLog(row);
    }),
});

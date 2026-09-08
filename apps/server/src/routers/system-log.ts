import * as z from 'zod';
import type { Prisma } from '../prisma/generated/client';
import { buildPaginationMeta, buildPaginationParams, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

const logLevelValues = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;

/**
 * System Logs — operational log entries from the server and client
 * (errors, warnings, security events). Gated by `log@read`.
 */
export const systemLogRouter = router({
    list: protectedProcedure
        .use(hasPermission('log@read'))
        .input(createListInputSchema({
            level: z.enum(logLevelValues).optional(),
            module: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ input }) => {
            const { page, limit, skip } = buildPaginationParams(input);

            const where: Prisma.AppLogWhereInput = {
                ...(input?.level && { level: input.level }),
                ...(input?.module && { module: input.module }),
                ...(input?.startDate || input?.endDate ? {
                    createdAt: {
                        ...(input.startDate && { gte: new Date(input.startDate) }),
                        ...(input.endDate && { lte: new Date(input.endDate) }),
                    },
                } : {}),
                ...(input?.search && {
                    OR: [
                        { message: { contains: input.search, mode: 'insensitive' as const } },
                        { module: { contains: input.search, mode: 'insensitive' as const } },
                        { requestId: { contains: input.search, mode: 'insensitive' as const } },
                    ],
                }),
            };

            const [data, total] = await Promise.all([
                prisma.appLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.appLog.count({ where }),
            ]);

            return {
                data,
                pagination: buildPaginationMeta({ page, limit, total }),
            };
        }),

    // Distinct modules for the filter dropdown (cheap, indexed).
    modules: protectedProcedure
        .use(hasPermission('log@read'))
        .query(async () => {
            const rows = await prisma.appLog.findMany({
                distinct: ['module'],
                select: { module: true },
                orderBy: { module: 'asc' },
            });
            return rows.map((r) => r.module);
        }),
});

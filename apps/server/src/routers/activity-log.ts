import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '../prisma/generated/client';
import { buildPaginationMeta, buildPaginationParams, createListInputSchema } from '../lib/list-query.js';
import { getMessage } from '../lib/locale.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

const activityActionValues = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'] as const;

export const activityLogRouter = router({
    // User-scoped list — any authenticated user sees their own logs only
    list: protectedProcedure
        .input(createListInputSchema({
            resource: z.string().optional(),
            action: z.enum(activityActionValues).optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const { page, limit, skip } = buildPaginationParams(input);

            const searchAction = input?.search?.trim().toUpperCase();
            const actionFilter = searchAction && activityActionValues.includes(searchAction as (typeof activityActionValues)[number])
                ? { action: searchAction as (typeof activityActionValues)[number] }
                : undefined;

            const where: Prisma.ActivityLogWhereInput = {
                userId: ctx.user.userId,
                ...(input?.resource && { resource: input.resource }),
                ...(input?.action && { action: input.action }),
                ...(input?.startDate || input?.endDate ? {
                    createdAt: {
                        ...(input.startDate && { gte: new Date(input.startDate) }),
                        ...(input.endDate && { lte: new Date(input.endDate) }),
                    },
                } : {}),
                ...(input?.search && {
                    OR: [
                        { message: { contains: input.search, mode: 'insensitive' as const } },
                        { resource: { contains: input.search, mode: 'insensitive' as const } },
                        { resourceId: { contains: input.search, mode: 'insensitive' as const } },
                        ...(actionFilter ? [actionFilter] : []),
                        { user: { name: { contains: input.search, mode: 'insensitive' as const } } },
                        { user: { email: { contains: input.search, mode: 'insensitive' as const } } },
                    ],
                }),
            };

            const data = await prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const total = await prisma.activityLog.count({ where });

            return {
                data,
                pagination: buildPaginationMeta({ page, limit, total }),
            };
        }),

    // Admin list — all users' logs
    adminList: protectedProcedure
        .use(hasPermission('activity_log@read'))
        .input(createListInputSchema({
            userId: z.string().optional(),
            resource: z.string().optional(),
            action: z.enum(activityActionValues).optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
        }))
        .query(async ({ input }) => {
            const { page, limit, skip } = buildPaginationParams(input);

            const searchAction = input?.search?.trim().toUpperCase();
            const actionFilter = searchAction && activityActionValues.includes(searchAction as (typeof activityActionValues)[number])
                ? { action: searchAction as (typeof activityActionValues)[number] }
                : undefined;

            const where: Prisma.ActivityLogWhereInput = {
                ...(input?.userId && { userId: input.userId }),
                ...(input?.resource && { resource: input.resource }),
                ...(input?.action && { action: input.action }),
                ...(input?.startDate || input?.endDate ? {
                    createdAt: {
                        ...(input.startDate && { gte: new Date(input.startDate) }),
                        ...(input.endDate && { lte: new Date(input.endDate) }),
                    },
                } : {}),
                ...(input?.search && {
                    OR: [
                        { message: { contains: input.search, mode: 'insensitive' as const } },
                        { resource: { contains: input.search, mode: 'insensitive' as const } },
                        { resourceId: { contains: input.search, mode: 'insensitive' as const } },
                        ...(actionFilter ? [actionFilter] : []),
                        { user: { name: { contains: input.search, mode: 'insensitive' as const } } },
                        { user: { email: { contains: input.search, mode: 'insensitive' as const } } },
                    ],
                }),
            };

            const data = await prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const total = await prisma.activityLog.count({ where });

            return {
                data,
                pagination: buildPaginationMeta({ page, limit, total }),
            };
        }),

    detail: protectedProcedure
        .input(z.object({ id: z.string().min(1, 'ID is required') }))
        .query(async ({ input, ctx }) => {
            const item = await prisma.activityLog.findUnique({
                where: { id: input.id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            if (!item) {
                throw new TRPCError({ code: 'NOT_FOUND', message: getMessage(ctx.locale, 'activityLog.notFound') });
            }

            const isAdmin = await ctx.db.user.findUnique({ where: { id: ctx.user.userId }, include: { role: { include: { permissions: { include: { permission: true } } } } } });
            const userPermissions = isAdmin?.role?.permissions.map((rp) => rp.permission.name) ?? [];
            if (!userPermissions.includes('activity_log@read') && item.userId !== ctx.user.userId) {
                throw new TRPCError({ code: 'FORBIDDEN', message: getMessage(ctx.locale, 'activityLog.forbidden') });
            }

            return item;
        }),
});
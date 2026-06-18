import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { buildPaginationMeta, buildPaginationParams, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { protectedProcedure, router } from '../trpc.js';

export const notificationRouter = router({
  list: protectedProcedure
    .input(createListInputSchema({
      unreadOnly: z.boolean().optional(),
      type: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { page, limit, skip } = buildPaginationParams(input);

      const where: Record<string, unknown> = { userId: ctx.user.userId };
      if (input?.unreadOnly) where.isRead = false;
      if (input?.type) where.type = input.type;

      const [data, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true } } },
        }),
        prisma.notification.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.notification.count({
      where: { userId: ctx.user.userId, isRead: false },
    });
    return { count };
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.notification.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found.' });

      return prisma.notification.update({
        where: { id: input.id },
        data: { isRead: true, readAt: new Date() },
      });
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { userId: ctx.user.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }),

  // Admin list — view all users' notifications
  adminList: protectedProcedure
    .input(createListInputSchema({
      userId: z.string().optional(),
      type: z.string().optional(),
      targetType: z.string().optional(),
      isRead: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);

      const where: Record<string, unknown> = {};
      if (input?.userId) where.userId = input.userId;
      if (input?.type) where.type = input.type;
      if (input?.targetType) where.targetType = input.targetType;
      if (input?.isRead !== undefined) where.isRead = input.isRead;

      const [data, total] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
          },
        }),
        prisma.notification.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  adminDelete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.notification.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
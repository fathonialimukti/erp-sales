import * as z from 'zod';
import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildDeleteLogDetail, buildUpdateLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, createListInputSchema } from '../lib/list-query.js';
import { getMessage } from '../lib/locale.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

// T2 frozen contract: user-scoped reads (own rows, `notification@read`),
// ownership-scoped mutations (`notification@update` / `notification@delete`
// + logActivity), admin procedures (`notification@delete` — the canonical
// admin gate for cross-user read + delete).
export const notificationRouter = router({
  list: protectedProcedure
    .use(hasPermission('notification@read'))
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

  unreadCount: protectedProcedure
    .use(hasPermission('notification@read'))
    .query(async ({ ctx }) => {
      const count = await prisma.notification.count({
        where: { userId: ctx.user.userId, isRead: false },
      });
      return { count };
    }),

  markAsRead: protectedProcedure
    .use(hasPermission(['notification@update', 'notification@read']))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.notification.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: getMessage(ctx.locale, 'notification.notFound') });
      if (existing.userId !== ctx.user.userId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: getMessage(ctx.locale, 'notification.noAccess') });
      }

      const updated = await prisma.notification.update({
        where: { id: input.id },
        data: { isRead: true, readAt: new Date() },
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'notification',
        resourceId: updated.id,
        message: `Marked notification as read: ${updated.title}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  markAllAsRead: protectedProcedure
    .use(hasPermission(['notification@update', 'notification@read']))
    .mutation(async ({ ctx }) => {
      await prisma.notification.updateMany({
        where: { userId: ctx.user.userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'notification',
        resourceId: ctx.user.userId,
        message: 'Marked all notifications as read',
      });

      return { success: true };
    }),

  clearAll: protectedProcedure
    .use(hasPermission('notification@delete'))
    .mutation(async ({ ctx }) => {
      const owned = await prisma.notification.findMany({
        where: { userId: ctx.user.userId },
        select: { id: true, title: true },
      });
      await prisma.notification.deleteMany({
        where: { userId: ctx.user.userId },
      });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'notification',
        resourceId: ctx.user.userId,
        message: `Cleared ${owned.length} notification(s)`,
        detail: { count: owned.length } as never,
      });

      return { success: true };
    }),

  // Admin list — view all users' notifications
  adminList: protectedProcedure
    .use(hasPermission('notification@delete'))
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
    .use(hasPermission('notification@delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.notification.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: getMessage(ctx.locale, 'notification.notFound') });

      await prisma.notification.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'notification',
        resourceId: existing.id,
        message: `Deleted notification: ${existing.title}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),
});

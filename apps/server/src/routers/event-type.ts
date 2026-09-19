import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createEventTypeSchema, updateEventTypeSchema, eventTypeIdSchema } from '@repo/schemas/event-type';

export const eventTypeRouter = router({
  list: protectedProcedure
    .use(hasPermission('event-type@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['id', 'name', 'code'] as const);

      const [data, total] = await Promise.all([
        prisma.eventType.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.eventType.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('event-type@read'))
    .input(eventTypeIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.eventType.findUnique({ where: { id: input.id } });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event type not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('event-type@create'))
    .input(createEventTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.eventType.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'event_type',
        resourceId: created.id,
        message: `Created event type ${created.name}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('event-type@update'))
    .input(updateEventTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.eventType.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event type not found.' });

      const updated = await prisma.eventType.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'event_type',
        resourceId: updated.id,
        message: `Updated event type ${updated.name}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('event-type@delete'))
    .input(eventTypeIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.eventType.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event type not found.' });

      await prisma.eventType.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'event_type',
        resourceId: existing.id,
        message: `Deleted event type ${existing.name}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),
});

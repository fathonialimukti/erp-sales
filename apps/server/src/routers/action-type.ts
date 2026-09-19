import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createActionTypeSchema, updateActionTypeSchema, actionTypeIdSchema } from '@repo/schemas/action-type';

export const actionTypeRouter = router({
  list: protectedProcedure
    .use(hasPermission('action-type@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['id', 'name', 'code'] as const);

      const [data, total] = await Promise.all([
        prisma.actionType.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.actionType.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('action-type@read'))
    .input(actionTypeIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.actionType.findUnique({ where: { id: input.id } });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Action type not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('action-type@create'))
    .input(createActionTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.actionType.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'action_type',
        resourceId: created.id,
        message: `Created action type ${created.name}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('action-type@update'))
    .input(updateActionTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.actionType.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Action type not found.' });

      const updated = await prisma.actionType.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'action_type',
        resourceId: updated.id,
        message: `Updated action type ${updated.name}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('action-type@delete'))
    .input(actionTypeIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.actionType.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Action type not found.' });

      await prisma.actionType.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'action_type',
        resourceId: existing.id,
        message: `Deleted action type ${existing.name}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),
});

import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createBudgetPeriodSchema, updateBudgetPeriodSchema, budgetPeriodIdSchema } from '@repo/schemas/budget-period';

export const budgetPeriodRouter = router({
  list: protectedProcedure
    .use(hasPermission('budget-period@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['id', 'name', 'code'] as const);

      const [data, total] = await Promise.all([
        prisma.budgetPeriod.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.budgetPeriod.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('budget-period@read'))
    .input(budgetPeriodIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.budgetPeriod.findUnique({ where: { id: input.id } });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget period not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('budget-period@create'))
    .input(createBudgetPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.budgetPeriod.create({
        data: {
          code: input.code,
          name: input.name,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: input.status,
        },
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'budget_period',
        resourceId: created.id,
        message: `Created budget period ${created.name}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('budget-period@update'))
    .input(updateBudgetPeriodSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.budgetPeriod.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget period not found.' });

      const updated = await prisma.budgetPeriod.update({
        where: { id: currentId },
        data: {
          code: data.code,
          name: data.name,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'budget_period',
        resourceId: updated.id,
        message: `Updated budget period ${updated.name}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('budget-period@delete'))
    .input(budgetPeriodIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.budgetPeriod.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget period not found.' });

      await prisma.budgetPeriod.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'budget_period',
        resourceId: existing.id,
        message: `Deleted budget period ${existing.name}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),
});

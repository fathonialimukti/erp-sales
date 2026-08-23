import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createBudgetTypeSchema, updateBudgetTypeSchema, budgetTypeIdSchema } from '@repo/schemas/budget-type';

export const budgetTypeRouter = router({
  list: protectedProcedure
    .use(hasPermission('budget-type@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['id', 'name', 'code'] as const);

      const [data, total] = await Promise.all([
        prisma.budgetType.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.budgetType.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('budget-type@read'))
    .input(budgetTypeIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.budgetType.findUnique({ where: { id: input.id } });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget type not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('budget-type@create'))
    .input(createBudgetTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.budgetType.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'budget_type',
        resourceId: created.id,
        message: `Created budget type ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('budget-type@update'))
    .input(updateBudgetTypeSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.budgetType.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget type not found.' });

      const updated = await prisma.budgetType.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'budget_type',
        resourceId: updated.id,
        message: `Updated budget type ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('budget-type@delete'))
    .input(budgetTypeIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.budgetType.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget type not found.' });

      const hasBudgetLines = await prisma.budgetLine.count({ where: { budgetTypeId: input.id } });
      if (hasBudgetLines > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot delete budget type "${existing.name}" because it has ${hasBudgetLines} associated budget line(s). Delete or reassign the budget lines first.`,
        });
      }

      await prisma.budgetType.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'budget_type',
        resourceId: existing.id,
        message: `Deleted budget type ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});

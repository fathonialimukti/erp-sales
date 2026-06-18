import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createSkuCategorySchema, updateSkuCategorySchema, skuCategoryIdSchema } from '@repo/schemas/sku-category';

export const skuCategoryRouter = router({
  list: protectedProcedure
    .use(hasPermission('sku@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['name', 'code'] as const);

      const [data, total] = await Promise.all([
        prisma.skuCategory.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { skus: true } } },
        }),
        prisma.skuCategory.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('sku@read'))
    .input(skuCategoryIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.skuCategory.findUnique({
        where: { id: input.id },
        include: { skus: { select: { id: true, name: true, code: true } } },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('sku@create'))
    .input(createSkuCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.skuCategory.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'sku_category',
        resourceId: created.id,
        message: `Created product category ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('sku@update'))
    .input(updateSkuCategorySchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.skuCategory.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found.' });

      const updated = await prisma.skuCategory.update({ where: { id: currentId }, data });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'sku_category',
        resourceId: updated.id,
        message: `Updated product category ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('sku@delete'))
    .input(skuCategoryIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.skuCategory.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found.' });

      await prisma.skuCategory.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'sku_category',
        resourceId: existing.id,
        message: `Deleted product category ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});
import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createSkuSchema, updateSkuSchema, skuIdSchema, skuListInputSchema } from '@repo/schemas/sku';

export const skuRouter = router({
  list: protectedProcedure
    .use(hasPermission('sku@read'))
    .input(skuListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['name', 'code', 'description'] as const);

      const where: Record<string, unknown> = { ...searchWhere };
      if (input?.categoryId) where.categoryId = input.categoryId;

      const [data, total] = await Promise.all([
        prisma.sku.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true } },
            _count: { select: { salesOrderItems: true } },
          },
        }),
        prisma.sku.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('sku@read'))
    .input(skuIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.sku.findUnique({
        where: { id: input.id },
        include: { category: { select: { id: true, name: true } } },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('sku@create'))
    .input(createSkuSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.sku.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'sku',
        resourceId: created.id,
        message: `Created product ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('sku@update'))
    .input(updateSkuSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.sku.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found.' });

      const updated = await prisma.sku.update({ where: { id: currentId }, data });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'sku',
        resourceId: updated.id,
        message: `Updated product ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('sku@delete'))
    .input(skuIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.sku.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found.' });

      await prisma.sku.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'sku',
        resourceId: existing.id,
        message: `Deleted product ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});
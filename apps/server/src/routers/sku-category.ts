import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createSkuCategorySchema, updateSkuCategorySchema, skuCategoryIdSchema } from '@repo/schemas/sku-category';

export const skuCategoryRouter = router({
  list: protectedProcedure
    .use(hasPermission('skuCategory@read'))
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
    .use(hasPermission('skuCategory@read'))
    .input(skuCategoryIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.skuCategory.findUnique({
        where: { id: input.id },
        include: { skus: { select: { id: true, name: true, code: true } } },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found.' });
      return record;
    }),

  stats: protectedProcedure
    .use(hasPermission('skuCategory@read'))
    .input(skuCategoryIdSchema)
    .query(async ({ input }) => {
      const existing = await prisma.skuCategory.findUnique({
        where: { id: input.id },
        select: { id: true },
      });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found.' });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      // 30-day window (including today)
      const trendStart = new Date(now);
      trendStart.setHours(0, 0, 0, 0);
      trendStart.setDate(trendStart.getDate() - 29);

      const dayKey = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      const [skus, monthItems, prevMonthItems, trendItems] = await Promise.all([
        prisma.sku.findMany({
          where: { categoryId: input.id },
          select: { id: true, name: true, code: true, basePrice: true, status: true },
        }),
        prisma.salesOrderItem.findMany({
          where: {
            sku: { categoryId: input.id },
            salesOrder: { approvalStatus: 'APPROVED', date: { gte: startOfMonth, lte: endOfMonth } },
          },
          select: {
            lineTotal: true,
            quantity: true,
            salesOrder: { select: { date: true } },
            sku: { select: { id: true, name: true, code: true } },
          },
        }),
        prisma.salesOrderItem.findMany({
          where: {
            sku: { categoryId: input.id },
            salesOrder: { approvalStatus: 'APPROVED', date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
          },
          select: { lineTotal: true },
        }),
        prisma.salesOrderItem.findMany({
          where: {
            sku: { categoryId: input.id },
            salesOrder: { approvalStatus: 'APPROVED', date: { gte: trendStart, lte: now } },
          },
          select: { lineTotal: true, salesOrder: { select: { date: true } } },
        }),
      ]);

      const skuCount = skus.length;
      const activeSkuCount = skus.filter((s) => s.status === 'ACTIVE').length;
      const catalogValue = skus.reduce((sum, s) => sum + (s.basePrice ? Number(s.basePrice) : 0), 0);

      const monthRevenue = monthItems.reduce((sum, i) => sum + Number(i.lineTotal), 0);
      const prevMonthRevenue = prevMonthItems.reduce((sum, i) => sum + Number(i.lineTotal), 0);
      const revenueDelta = monthRevenue - prevMonthRevenue;
      const revenueDeltaPercent = prevMonthRevenue > 0
        ? Math.round((revenueDelta / prevMonthRevenue) * 1000) / 10
        : null;

      // Top SKUs by approved revenue this month (top 5)
      const skuAgg = new Map<string, { name: string; code: string | null; revenue: number; quantity: number }>();
      monthItems.forEach((item) => {
        const agg = skuAgg.get(item.sku.id) ?? { name: item.sku.name, code: item.sku.code, revenue: 0, quantity: 0 };
        agg.revenue += Number(item.lineTotal);
        agg.quantity += Number(item.quantity);
        skuAgg.set(item.sku.id, agg);
      });
      const topSkus = Array.from(skuAgg.entries())
        .map(([id, agg]) => ({ id, name: agg.name, code: agg.code, revenue: agg.revenue, quantity: agg.quantity }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // 30-day revenue trend, bucketed by local date of salesOrder.date
      const buckets = new Map<string, { date: string; total: number }>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(trendStart);
        d.setDate(d.getDate() + i);
        const k = dayKey(d);
        buckets.set(k, { date: k, total: 0 });
      }
      trendItems.forEach((item) => {
        const k = dayKey(new Date(item.salesOrder.date));
        const bucket = buckets.get(k);
        if (bucket) bucket.total += Number(item.lineTotal);
      });
      const revenueTrend = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));

      return {
        skuCount,
        activeSkuCount,
        catalogValue,
        monthRevenue,
        prevMonthRevenue,
        revenueDeltaPercent,
        revenueTrend,
        topSkus,
      };
    }),

  create: protectedProcedure
    .use(hasPermission('skuCategory@create'))
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
    .use(hasPermission('skuCategory@update'))
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
    .use(hasPermission('skuCategory@delete'))
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
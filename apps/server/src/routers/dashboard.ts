import { prisma } from '../lib/prisma.js';
import { protectedProcedure, router } from '../trpc.js';

export const dashboardRouter = router({
    /**
     * Sales-focused dashboard data: KPI counts, 30-day revenue trend,
     * top-5 customers by revenue this month, and recent activity.
     * All queries run in parallel and return Decimal as number.
     */
    sales: protectedProcedure.query(async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // 30-day window (including today)
        const trendStart = new Date(now);
        trendStart.setHours(0, 0, 0, 0);
        trendStart.setDate(trendStart.getDate() - 29);

        const [
            openOrders,
            draftOrders,
            proposedOrders,
            approvedOrders,
            rejectedOrders,
            customerCount,
            skuCount,
            activeSkuCount,
            monthRevenueRaw,
            prevMonthRevenueRaw,
            visitCount,
            orderItemsThisMonth,
            topCustomersRaw,
            trendRowsRaw,
            recentActivity,
            revenueBySkuRaw,
        ] = await Promise.all([
            prisma.salesOrder.count({ where: { approvalStatus: { in: ['DRAFT', 'PROPOSED'] } } }),
            prisma.salesOrder.count({ where: { approvalStatus: 'DRAFT' } }),
            prisma.salesOrder.count({ where: { approvalStatus: 'PROPOSED' } }),
            prisma.salesOrder.count({ where: { approvalStatus: 'APPROVED' } }),
            prisma.salesOrder.count({ where: { approvalStatus: 'REJECTED' } }),
            prisma.customer.count(),
            prisma.sku.count(),
            prisma.sku.count({ where: { status: 'ACTIVE' } }),
            prisma.salesOrder.aggregate({
                _sum: { grandTotal: true },
                where: { approvalStatus: 'APPROVED', date: { gte: startOfMonth, lte: endOfMonth } },
            }),
            prisma.salesOrder.aggregate({
                _sum: { grandTotal: true },
                where: { approvalStatus: 'APPROVED', date: { gte: startOfPrevMonth, lte: endOfPrevMonth } },
            }),
            prisma.visitLog.count(),
            prisma.salesOrderItem.count({
                where: { salesOrder: { createdAt: { gte: startOfMonth, lte: endOfMonth } } },
            }),
            prisma.salesOrder.groupBy({
                by: ['customerId'],
                where: { approvalStatus: 'APPROVED', date: { gte: startOfMonth, lte: endOfMonth } },
                _sum: { grandTotal: true },
                orderBy: { _sum: { grandTotal: 'desc' } },
                take: 5,
            }),
            prisma.salesOrder.findMany({
                where: { createdAt: { gte: trendStart } },
                select: { createdAt: true, grandTotal: true },
            }),
            prisma.activityLog.findMany({
                take: 8,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { id: true, name: true, email: true } } },
            }),
            prisma.salesOrderItem.groupBy({
                by: ['skuId'],
                where: { salesOrder: { approvalStatus: 'APPROVED', date: { gte: startOfMonth, lte: endOfMonth } } },
                _sum: { lineTotal: true },
            }),
        ]);

        // Build 30-day revenue trend: bucket orders by local date
        const dayKey = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };
        const buckets = new Map<string, { date: string; total: number; count: number }>();
        for (let i = 0; i < 30; i++) {
            const d = new Date(trendStart);
            d.setDate(d.getDate() + i);
            const k = dayKey(d);
            buckets.set(k, { date: k, total: 0, count: 0 });
        }
        trendRowsRaw.forEach((row) => {
            const k = dayKey(new Date(row.createdAt));
            const bucket = buckets.get(k);
            if (bucket) {
                bucket.total += row.grandTotal ? Number(row.grandTotal) : 0;
                bucket.count += 1;
            }
        });
        const revenueTrend = Array.from(buckets.values());

        // Top customers — need names
        const topCustomerIds = topCustomersRaw.map((c) => c.customerId).filter((id): id is string => id !== null);
        const topCustomerNames = await prisma.customer.findMany({
            where: { id: { in: topCustomerIds } },
            select: { id: true, name: true },
        });
        const nameMap = new Map(topCustomerNames.map((c) => [c.id, c.name]));
        const topCustomers = topCustomersRaw
            .filter((c): c is typeof c & { customerId: string } => c.customerId !== null)
            .map((c) => ({
            id: c.customerId,
            name: nameMap.get(c.customerId) ?? 'Unknown',
            total: c._sum.grandTotal ? Number(c._sum.grandTotal) : 0,
        }));

        const monthRevenue = monthRevenueRaw._sum.grandTotal ? Number(monthRevenueRaw._sum.grandTotal) : 0;
        const prevMonthRevenue = prevMonthRevenueRaw._sum.grandTotal ? Number(prevMonthRevenueRaw._sum.grandTotal) : 0;
        const revenueDelta = monthRevenue - prevMonthRevenue;
        const revenueDeltaPercent = prevMonthRevenue > 0
            ? Math.round((revenueDelta / prevMonthRevenue) * 1000) / 10
            : null;

        // Revenue by category (this month, approved) — top 6
        const revenueByCategory = await (async () => {
            if (revenueBySkuRaw.length === 0) return [];
            const skuIds = revenueBySkuRaw.map((r) => r.skuId);
            const skuCats = await prisma.sku.findMany({ where: { id: { in: skuIds } }, select: { id: true, categoryId: true } });
            const categoryIds = skuCats.map((s) => s.categoryId).filter((id): id is string => id !== null);
            if (categoryIds.length === 0) return [];
            const [categories, skuCounts] = await Promise.all([
                prisma.skuCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }),
                prisma.sku.groupBy({
                    by: ['categoryId'],
                    where: { categoryId: { in: categoryIds, not: null } },
                    _count: { _all: true },
                }),
            ]);
            const skuToCategory = new Map(skuCats.map((s) => [s.id, s.categoryId]));
            const categoryName = new Map(categories.map((c) => [c.id, c.name]));
            const categorySkuCount = new Map(
                skuCounts.filter((g) => g.categoryId !== null).map((g) => [g.categoryId as string, g._count._all]),
            );
            const fold = new Map<string, { revenue: number; skuCount: number }>();
            revenueBySkuRaw.forEach((row) => {
                const categoryId = skuToCategory.get(row.skuId) ?? null;
                if (!categoryId) return;
                const agg = fold.get(categoryId) ?? { revenue: 0, skuCount: categorySkuCount.get(categoryId) ?? 0 };
                agg.revenue += row._sum.lineTotal ? Number(row._sum.lineTotal) : 0;
                fold.set(categoryId, agg);
            });
            return Array.from(fold.entries())
                .map(([id, agg]) => ({ id, name: categoryName.get(id) ?? 'Unknown', revenue: agg.revenue, skuCount: agg.skuCount }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 6);
        })();

        return {
            kpis: {
                openOrders,
                draftOrders,
                proposedOrders,
                approvedOrders,
                rejectedOrders,
                monthRevenue,
                prevMonthRevenue,
                revenueDelta,
                revenueDeltaPercent,
                customerCount,
                skuCount,
                activeSkuCount,
                visitCount,
                orderItemsThisMonth,
            },
            revenueTrend,
            topCustomers,
            recentActivity: recentActivity.map((a) => ({
                id: a.id,
                action: a.action,
                message: a.message,
                resource: a.resource,
                resourceId: a.resourceId,
                createdAt: a.createdAt,
                userName: a.user?.name ?? 'System',
            })),
            revenueByCategory,
        };
    }),
});

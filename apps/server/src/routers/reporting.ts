import { TRPCError } from '@trpc/server';
import type { Prisma } from '../prisma/generated/client';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { prisma } from '../lib/prisma.js';
import {
  bucketByPeriod,
  buildReportWhere,
  daysBetween,
  resolveAreaIdsForRegion,
  toNumber,
} from '../lib/report-query.js';
import {
  reportFilterSchema,
  reportDimensionSchema,
  reportPeriodSchema,
} from '@repo/schemas/report';
import * as z from 'zod';

const APPROVED = 'APPROVED' as const;

export const reportingRouter = router({
  /**
   * Sales KPI summary: approved revenue, order count, AOV, total quantity,
   * and period-over-period delta vs the previous equal-length window.
   */
  salesSummary: protectedProcedure
    .use(hasPermission('report@read'))
    .input(reportFilterSchema)
    .query(async ({ input }) => {
      const where = buildReportWhere(input);
      const approvedWhere = { ...where, approvalStatus: APPROVED };

      // Previous equal window for delta
      let prevWhere: typeof approvedWhere = { ...approvedWhere };
      if (input?.dateFrom && input?.dateTo) {
        const from = new Date(input.dateFrom);
        const to = new Date(input.dateTo);
        const span = daysBetween(from, to) + 1;
        const prevTo = new Date(from);
        prevTo.setDate(prevTo.getDate() - 1);
        const prevFrom = new Date(prevTo);
        prevFrom.setDate(prevFrom.getDate() - (span - 1));
        prevWhere = {
          ...where,
          approvalStatus: APPROVED,
          date: { gte: prevFrom, lte: prevTo },
        };
      }

      const [agg, prevAgg, itemAgg] = await Promise.all([
        prisma.salesOrder.aggregate({
          _sum: { grandTotal: true },
          _count: { _all: true },
          where: approvedWhere,
        }),
        prisma.salesOrder.aggregate({
          _sum: { grandTotal: true },
          where: prevWhere,
        }),
        prisma.salesOrderItem.aggregate({
          _sum: { quantity: true },
          where: { salesOrder: approvedWhere },
        }),
      ]);

      const revenue = toNumber(agg._sum?.grandTotal);
      const prevRevenue = toNumber(prevAgg._sum?.grandTotal);
      const orderCount = agg._count?._all ?? 0;
      const quantity = toNumber(itemAgg._sum?.quantity);
      const aov = orderCount > 0 ? revenue / orderCount : 0;
      const delta = revenue - prevRevenue;
      const deltaPercent = prevRevenue > 0 ? Math.round((delta / prevRevenue) * 1000) / 10 : null;

      return { revenue, prevRevenue, orderCount, quantity, aov, delta, deltaPercent };
    }),

  /**
   * Sales aggregated by a chosen dimension (region/area/outlet/customer/sku).
   * Returns top rows by revenue with order count and quantity.
   */
  salesByDimension: protectedProcedure
    .use(hasPermission('report@read'))
    .input(
      reportFilterSchema
        .unwrap()
        .merge(z.object({ dimension: reportDimensionSchema }))
        .optional(),
    )
    .query(async ({ input }) => {
      const dimension = input?.dimension ?? 'region';
      const where = buildReportWhere(input);
      const approvedWhere = { ...where, approvalStatus: APPROVED };

      if (dimension === 'sku') {
        const rows = await prisma.salesOrderItem.groupBy({
          by: ['skuId'],
          where: { salesOrder: approvedWhere },
          _sum: { lineTotal: true, quantity: true },
          _count: { _all: true },
          orderBy: { _sum: { lineTotal: 'desc' } },
          take: 20,
        });
        const skuIds = rows.map((r) => r.skuId).filter((id): id is string => id !== null);
        const skus = await prisma.sku.findMany({
          where: { id: { in: skuIds } },
          select: { id: true, name: true, code: true },
        });
        const nameMap = new Map(skus.map((s) => [s.id, `${s.code ? s.code + ' · ' : ''}${s.name}`]));
        return rows
          .filter((r): r is typeof r & { skuId: string } => r.skuId !== null)
          .map((r) => ({
            id: r.skuId,
            label: nameMap.get(r.skuId) ?? 'Unknown',
            revenue: toNumber(r._sum?.lineTotal),
            orderCount: r._count?._all ?? 0,
            quantity: toNumber(r._sum?.quantity),
          }));
      }

      // Region is reached via area.regionId (SalesOrder has no regionId column),
      // so group by areaId and roll the results up into region buckets.
      if (dimension === 'region') {
        const areaRows = await prisma.salesOrder.groupBy({
          by: ['areaId'],
          where: approvedWhere,
          _sum: { grandTotal: true },
          _count: { _all: true },
          orderBy: { _sum: { grandTotal: 'desc' } },
          take: 100,
        });
        const areaIds = areaRows.map((r) => r.areaId).filter((id): id is string => id !== null);
        const areas = await prisma.area.findMany({
          where: { id: { in: areaIds } },
          select: { id: true, regionId: true, region: { select: { id: true, name: true } } },
        });
        const areaToRegion = new Map(areas.map((a) => [a.id, a.region?.id ?? null]));
        const regionName = new Map(areas.map((a) => [a.region?.id ?? '', a.region?.name ?? 'Unknown']));

        const quantityRows = await prisma.salesOrderItem.groupBy({
          by: ['salesOrderId'],
          where: { salesOrder: approvedWhere },
          _sum: { quantity: true },
        });
        const orderIds = quantityRows.map((r) => r.salesOrderId);
        const orders = await prisma.salesOrder.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, areaId: true },
        });
        const qtyByOrder = new Map(quantityRows.map((q) => [q.salesOrderId, toNumber(q._sum?.quantity)]));
        const qtyByArea = new Map<string, number>();
        orders.forEach((o) => {
          if (o.areaId) qtyByArea.set(o.areaId, (qtyByArea.get(o.areaId) ?? 0) + (qtyByOrder.get(o.id) ?? 0));
        });

        const regionAgg = new Map<string, { revenue: number; orderCount: number; quantity: number }>();
        for (const r of areaRows) {
          const regionId = r.areaId ? (areaToRegion.get(r.areaId) ?? null) : null;
          if (!regionId) continue;
          const cur = regionAgg.get(regionId) ?? { revenue: 0, orderCount: 0, quantity: 0 };
          cur.revenue += toNumber(r._sum?.grandTotal);
          cur.orderCount += r._count?._all ?? 0;
          cur.quantity += r.areaId ? (qtyByArea.get(r.areaId) ?? 0) : 0;
          regionAgg.set(regionId, cur);
        }

        return Array.from(regionAgg.entries())
          .map(([regionId, agg]) => ({
            id: regionId,
            label: regionName.get(regionId) ?? 'Unknown',
            revenue: agg.revenue,
            orderCount: agg.orderCount,
            quantity: agg.quantity,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 20);
      }

      const byField: Record<string, 'areaId' | 'outletId' | 'customerId'> = {
        area: 'areaId',
        outlet: 'outletId',
        customer: 'customerId',
      };
      const field = byField[dimension as 'area' | 'outlet' | 'customer'] ?? 'areaId';

      const rows = await prisma.salesOrder.groupBy({
        by: [field] as Prisma.SalesOrderScalarFieldEnum[],
        where: approvedWhere,
        _sum: { grandTotal: true },
        _count: { _all: true },
        orderBy: { _sum: { grandTotal: 'desc' } },
        take: 20,
      });

      const ids = rows
        .map((r) => (r as unknown as Record<string, string | null>)[field])
        .filter((id): id is string => id !== null);

      let nameMap = new Map<string, string>();
      if (dimension === 'area') {
        const recs = await prisma.area.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
        nameMap = new Map(recs.map((r) => [r.id, r.name]));
      } else if (dimension === 'outlet') {
        const recs = await prisma.outlet.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
        nameMap = new Map(recs.map((r) => [r.id, r.name]));
      } else if (dimension === 'customer') {
        const recs = await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
        nameMap = new Map(recs.map((r) => [r.id, r.name]));
      }

      // quantity per dimension via items grouped by order, then rolled up by order field
      const quantityRows = await prisma.salesOrderItem.groupBy({
        by: ['salesOrderId'],
        where: { salesOrder: approvedWhere },
        _sum: { quantity: true },
      });
      const orderIds = quantityRows.map((r) => r.salesOrderId);
      const orders = await prisma.salesOrder.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, [field]: true },
      });
      const qtyByOrder = new Map<string, number>();
      quantityRows.forEach((q) => {
        qtyByOrder.set(q.salesOrderId, toNumber(q._sum?.quantity));
      });
      const qtyByDim = new Map<string, number>();
      orders.forEach((o) => {
        const rawKey = (o as unknown as Record<string, unknown>)[field];
        const key = typeof rawKey === 'string' ? rawKey : null;
        if (key) {
          const qty = qtyByOrder.get((o as unknown as { id: string }).id) ?? 0;
          qtyByDim.set(key, (qtyByDim.get(key) ?? 0) + qty);
        }
      });

      return rows.map((r) => {
        const id = (r as unknown as Record<string, string | null>)[field];
        return {
          id: id ?? 'unknown',
          label: id ? nameMap.get(id) ?? 'Unknown' : 'Unknown',
          revenue: toNumber(r._sum?.grandTotal),
          orderCount: r._count?._all ?? 0,
          quantity: id ? qtyByDim.get(id) ?? 0 : 0,
        };
      });
    }),

  /**
   * Revenue trend bucketed by day/week/month over the date range.
   */
  salesTrend: protectedProcedure
    .use(hasPermission('report@read'))
    .input(
      reportFilterSchema
        .unwrap()
        .extend({ period: reportPeriodSchema.default('day') })
        .optional(),
    )
    .query(async ({ input }) => {
      const period = input?.period ?? 'day';
      const where = buildReportWhere(input);
      const approvedWhere = { ...where, approvalStatus: APPROVED };

      const rows = await prisma.salesOrder.findMany({
        where: approvedWhere,
        select: { date: true, grandTotal: true },
      });

      const range =
        input?.dateFrom && input?.dateTo
          ? { from: new Date(input.dateFrom), to: new Date(input.dateTo) }
          : undefined;

      return bucketByPeriod(
        rows.map((r) => ({ date: new Date(r.date), total: toNumber(r.grandTotal) })),
        period,
        range,
      );
    }),

  /**
   * Field activity: visit counts by salesman/area/outlet, outlet coverage,
   * and visit→order conversion. Plus per-salesman KPI rows.
   */
  fieldActivity: protectedProcedure
    .use(hasPermission('report@read'))
    .input(reportFilterSchema)
    .query(async ({ input }) => {
      const where = buildReportWhere(input);
      const areaIds = input?.regionId ? await resolveAreaIdsForRegion(prisma, input.regionId) : undefined;
      type SalesmanGroup = { salesmanId: string | null; _count: { _all: number } };

      const visitWhere: Record<string, unknown> = {};
      if (input?.salesmanId) visitWhere.salesmanId = input.salesmanId;
      if (input?.outletId) visitWhere.outletId = input.outletId;
      if (areaIds) visitWhere.outlet = { areaId: { in: areaIds } };
      if (input?.dateFrom || input?.dateTo) {
        visitWhere.date = {};
        if (input.dateFrom) (visitWhere.date as Record<string, unknown>).gte = new Date(input.dateFrom);
        if (input.dateTo) (visitWhere.date as Record<string, unknown>).lte = new Date(input.dateTo);
      }

      const [totalVisits, visitsWithOrder, outletCount, visitedOutletIds, bySalesman] = await Promise.all([
        prisma.visitLog.count({ where: visitWhere }),
        prisma.visitLog.count({ where: { ...visitWhere, salesOrderId: { not: null } } }),
        prisma.outlet.count({
          where: areaIds ? { areaId: { in: areaIds } } : input?.outletId ? { id: input.outletId } : {},
        }),
        prisma.visitLog.findMany({
          where: visitWhere,
          select: { outletId: true },
          distinct: ['outletId'],
        }),
        prisma.visitLog.groupBy({
          by: ['salesmanId'] as const,
          where: visitWhere,
          _count: { _all: true },
          orderBy: { _count: { salesmanId: 'desc' as const } },
          take: 20,
        }),
      ]);

      const salesmanNames = await prisma.user.findMany({
        where: { id: { in: bySalesman.map((r) => r.salesmanId).filter((id): id is string => id !== null) } },
        select: { id: true, name: true },
      });

      const nameMap = new Map(salesmanNames.map((s) => [s.id, s.name]));
      const salesmanRows = (bySalesman as unknown as SalesmanGroup[])
        .filter((r): r is SalesmanGroup & { salesmanId: string } => r.salesmanId !== null)
        .sort((a, b) => b._count._all - a._count._all)
        .map((r) => ({
          id: r.salesmanId,
          name: nameMap.get(r.salesmanId) ?? 'Unknown',
          visits: r._count._all,
        }));

      // Per-salesman orders + revenue
      const soWhere = buildReportWhere(input);
      const salesmanOrders = await prisma.salesOrder.groupBy({
        by: ['createdById'],
        where: { ...soWhere, createdById: { in: salesmanRows.map((s) => s.id) }, approvalStatus: APPROVED },
        _sum: { grandTotal: true },
        _count: { _all: true },
      });
      const orderMap = new Map(
        salesmanOrders.map((r) => [r.createdById, { revenue: toNumber(r._sum?.grandTotal), orders: r._count?._all ?? 0 }]),
      );
      const perSalesman = salesmanRows.map((s) => ({
        ...s,
        orders: orderMap.get(s.id)?.orders ?? 0,
        revenue: orderMap.get(s.id)?.revenue ?? 0,
      }));

      const coverage = outletCount > 0 ? Math.round((visitedOutletIds.length / outletCount) * 100) : 0;
      const conversion = totalVisits > 0 ? Math.round((visitsWithOrder / totalVisits) * 100) : 0;

      return {
        totalVisits,
        visitsWithOrder,
        outletCount,
        visitedOutletCount: visitedOutletIds.length,
        coveragePercent: coverage,
        conversionPercent: conversion,
        perSalesman,
      };
    }),

  /**
   * Accounts receivable: aging buckets from approved orders minus payments,
   * plus collected/outstanding totals and collection rate.
   */
  collection: protectedProcedure
    .use(hasPermission('report@read'))
    .input(reportFilterSchema)
    .query(async ({ input }) => {
      const where = buildReportWhere(input);
      const approvedWhere = { ...where, approvalStatus: APPROVED };

      const orders = await prisma.salesOrder.findMany({
        where: approvedWhere,
        select: { id: true, date: true, grandTotal: true, customerId: true, areaId: true },
      });

      const orderIds = orders.map((o) => o.id);
      const payments = orderIds.length
        ? await prisma.payment.findMany({
            where: { salesOrderId: { in: orderIds } },
            select: { salesOrderId: true, amount: true },
          })
        : [];

      const paidByOrder = new Map<string, number>();
      payments.forEach((p) => {
        paidByOrder.set(p.salesOrderId, (paidByOrder.get(p.salesOrderId) ?? 0) + toNumber(p.amount));
      });

      const now = new Date();
      const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90_plus: 0 };
      let outstandingTotal = 0;
      let collectedTotal = 0;
      const byCustomer = new Map<string, { outstanding: number; collected: number }>();

      for (const o of orders) {
        const invoiced = toNumber(o.grandTotal);
        const paid = paidByOrder.get(o.id) ?? 0;
        const outstanding = Math.max(0, invoiced - paid);
        collectedTotal += paid;
        if (outstanding <= 0) continue;
        outstandingTotal += outstanding;

        const age = daysBetween(new Date(o.date), now);
        if (age <= 30) buckets.b0_30 += outstanding;
        else if (age <= 60) buckets.b31_60 += outstanding;
        else if (age <= 90) buckets.b61_90 += outstanding;
        else buckets.b90_plus += outstanding;

        const cur = byCustomer.get(o.customerId ?? '') ?? { outstanding: 0, collected: 0 };
        cur.outstanding += outstanding;
        cur.collected += paid;
        byCustomer.set(o.customerId ?? '', cur);
      }

      const customerIds = Array.from(byCustomer.keys());
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(customers.map((c) => [c.id, c.name]));
      const byCustomerRows = customerIds
        .map((id) => ({
          id,
          name: nameMap.get(id) ?? 'Unknown',
          outstanding: byCustomer.get(id)!.outstanding,
          collected: byCustomer.get(id)!.collected,
        }))
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 20);

      const totalBilled = outstandingTotal + collectedTotal;
      const collectionRate = totalBilled > 0 ? Math.round((collectedTotal / totalBilled) * 100) : 0;

      return {
        outstandingTotal,
        collectedTotal,
        totalBilled,
        collectionRatePercent: collectionRate,
        aging: [
          { bucket: '0-30', label: '0–30 days', amount: buckets.b0_30 },
          { bucket: '31-60', label: '31–60 days', amount: buckets.b31_60 },
          { bucket: '61-90', label: '61–90 days', amount: buckets.b61_90 },
          { bucket: '90+', label: '90+ days', amount: buckets.b90_plus },
        ],
        byCustomer: byCustomerRows,
      };
    }),

  /**
   * Promotion ROI: per action program / event proposal, budget vs cost
   * (payments) and linked approved revenue in the program's area + window.
   */
  promoRoi: protectedProcedure
    .use(hasPermission('report@read'))
    .input(reportFilterSchema)
    .query(async ({ input }) => {
      const areaIds = input?.regionId ? await resolveAreaIdsForRegion(prisma, input.regionId) : undefined;

      const programWhere: Record<string, unknown> = {};
      if (input?.areaId) programWhere.areaId = input.areaId;
      if (areaIds) programWhere.areaId = { in: areaIds };
      if (input?.dateFrom || input?.dateTo) {
        programWhere.startDate = {};
        if (input.dateFrom) (programWhere.startDate as Record<string, unknown>).gte = new Date(input.dateFrom);
        if (input.dateTo) (programWhere.startDate as Record<string, unknown>).lte = new Date(input.dateTo);
      }

      const [programs, proposals] = await Promise.all([
        prisma.actionProgram.findMany({
          where: { ...programWhere, approvalStatus: APPROVED },
          select: {
            id: true,
            name: true,
            actionTypeId: true,
            plannedCost: true,
            areaId: true,
            startDate: true,
            endDate: true,
            payments: { select: { amount: true } },
          },
        }),
        prisma.eventProposal.findMany({
          where: { ...programWhere, approvalStatus: APPROVED },
          select: {
            id: true,
            name: true,
            plannedCost: true,
            areaId: true,
            eventDate: true,
            eventEndDate: true,
            payments: { select: { amount: true } },
          },
        }),
      ]);

      const revenueCache = new Map<string, number>();
      const getRevenueKey = (areaId: string | null, from: Date, to: Date) =>
        areaId ? `${areaId}|${from.toISOString()}|${to.toISOString()}` : '';

      const linkedRevenue = async (areaId: string | null, from: Date, to: Date): Promise<number> => {
        if (!areaId) return 0;
        const key = getRevenueKey(areaId, from, to);
        if (revenueCache.has(key)) return revenueCache.get(key)!;
        const agg = await prisma.salesOrder.aggregate({
          _sum: { grandTotal: true },
          where: { areaId, approvalStatus: APPROVED, date: { gte: from, lte: to } },
        });
        const value = toNumber(agg._sum?.grandTotal);
        revenueCache.set(key, value);
        return value;
      };

      const mapProgram = async (p: (typeof programs)[number]) => {
        const cost = p.payments.reduce((s, pay) => s + toNumber(pay.amount), 0);
        const budget = toNumber(p.plannedCost);
        const from = new Date(p.startDate);
        const to = p.endDate ? new Date(p.endDate) : new Date(p.startDate);
        const revenue = await linkedRevenue(p.areaId, from, to);
        const roi = cost > 0 ? Math.round(((revenue - cost) / cost) * 1000) / 10 : null;
        return {
          id: p.id,
          name: p.name,
          kind: 'action_program',
          type: p.actionTypeId,
          budget,
          cost,
          revenue,
          roi,
        };
      };

      const mapProposal = async (p: (typeof proposals)[number]) => {
        const cost = p.payments.reduce((s, pay) => s + toNumber(pay.amount), 0);
        const budget = toNumber(p.plannedCost);
        const from = new Date(p.eventDate);
        const to = p.eventEndDate ? new Date(p.eventEndDate) : new Date(p.eventDate);
        const revenue = await linkedRevenue(p.areaId, from, to);
        const roi = cost > 0 ? Math.round(((revenue - cost) / cost) * 1000) / 10 : null;
        return {
          id: p.id,
          name: p.name,
          kind: 'event_proposal',
          type: 'EVENT',
          budget,
          cost,
          revenue,
          roi,
        };
      };

      const [programRows, proposalRows] = await Promise.all([
        Promise.all(programs.map(mapProgram)),
        Promise.all(proposals.map(mapProposal)),
      ]);

      return { items: [...programRows, ...proposalRows].sort((a, b) => b.revenue - a.revenue) };
    }),

  /**
   * Pipeline funnel: visit → sales order (by status) → payment counts, plus
   * average days-in-status for approval bottlenecks.
   */
  pipelineFunnel: protectedProcedure
    .use(hasPermission('report@read'))
    .input(reportFilterSchema)
    .query(async ({ input }) => {
      const where = buildReportWhere(input);
      const areaIds = input?.regionId ? await resolveAreaIdsForRegion(prisma, input.regionId) : undefined;

      const visitWhere: Record<string, unknown> = {};
      if (input?.salesmanId) visitWhere.salesmanId = input.salesmanId;
      if (input?.outletId) visitWhere.outletId = input.outletId;
      if (areaIds) visitWhere.outlet = { areaId: { in: areaIds } };
      if (input?.dateFrom || input?.dateTo) {
        visitWhere.date = {};
        if (input.dateFrom) (visitWhere.date as Record<string, unknown>).gte = new Date(input.dateFrom);
        if (input.dateTo) (visitWhere.date as Record<string, unknown>).lte = new Date(input.dateTo);
      }

      const [visits, soByStatus, filteredOrderIds] = await Promise.all([
        prisma.visitLog.count({ where: visitWhere }),
        prisma.salesOrder.groupBy({
          by: ['approvalStatus'],
          where,
          _count: { _all: true },
        }),
        prisma.salesOrder.findMany({
          where,
          select: { id: true },
          take: 500,
        }),
      ]);

      const paidOrders = filteredOrderIds.length
        ? await prisma.payment.groupBy({
            by: ['salesOrderId'],
            where: { salesOrderId: { in: filteredOrderIds.map((o) => o.id) } },
            _count: { _all: true },
          })
        : [];

      const statusMap = new Map(soByStatus.map((r) => [r.approvalStatus, r._count?._all ?? 0]));
      const ordersTotal =
        (statusMap.get('DRAFT') ?? 0) +
        (statusMap.get('PROPOSED') ?? 0) +
        (statusMap.get('APPROVED') ?? 0) +
        (statusMap.get('REJECTED') ?? 0);
      const paidCount = paidOrders.length;

      // Approval bottleneck: avg days from proposedAt → approvedAt on approved orders
      const approvedOrders = await prisma.salesOrder.findMany({
        where: { ...where, approvalStatus: APPROVED, proposedAt: { not: null }, approvedAt: { not: null } },
        select: { proposedAt: true, approvedAt: true },
      });
      const approvalDays =
        approvedOrders.length > 0
          ? Math.round(
              (approvedOrders.reduce(
                (s, o) => s + daysBetween(new Date(o.proposedAt!), new Date(o.approvedAt!)),
                0,
              ) /
                approvedOrders.length) *
                10,
            ) / 10
          : 0;

      return {
        visits,
        ordersTotal,
        draft: statusMap.get('DRAFT') ?? 0,
        proposed: statusMap.get('PROPOSED') ?? 0,
        approved: statusMap.get('APPROVED') ?? 0,
        rejected: statusMap.get('REJECTED') ?? 0,
        paidOrders: paidCount,
        avgApprovalDays: approvalDays,
      };
    }),
});

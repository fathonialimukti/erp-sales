import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { z } from 'zod';
import { createSalesOrderSchema, updateSalesOrderSchema, salesOrderIdSchema, salesOrderListInputSchema } from '@repo/schemas/sales-order';
import { pushApprovalHistory, sendApprovalNotification } from '../lib/approval-helpers.js';

export const salesOrderRouter = router({
  list: protectedProcedure
    .use(hasPermission('sales-order@read'))
    .input(salesOrderListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['documentNumber', 'notes'] as const);

      const where: Record<string, unknown> = { ...searchWhere };
      if (input?.customerId) where.customerId = input.customerId;
      if (input?.outletId) where.outletId = input.outletId;
      if (input?.areaId) where.areaId = input.areaId;
      if (input?.approvalStatus) where.approvalStatus = input.approvalStatus;

      const [data, total] = await Promise.all([
        prisma.salesOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true } },
            outlet: { select: { id: true, name: true } },
            area: { select: { id: true, name: true } },
            _count: { select: { items: true } },
          },
        }),
        prisma.salesOrder.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('sales-order@read'))
    .input(salesOrderIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.salesOrder.findUnique({
        where: { id: input.id },
        include: {
          customer: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          items: {
            include: { sku: { select: { id: true, name: true, code: true, baseUnit: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('sales-order@create'))
    .input(createSalesOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const { items, date, expectedDeliveryDate, ...header } = input;

      const created = await prisma.$transaction(async (tx) => {
        const order = await tx.salesOrder.create({
          data: {
            ...header,
            date: date ? new Date(date) : new Date(),
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
            createdById: ctx.user.userId,
          },
        });

        await tx.salesOrderItem.createMany({
          data: items.map((item, idx) => ({
            ...item,
            salesOrderId: order.id,
            sortOrder: idx,
          })),
        });

        return order;
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'sales_order',
        resourceId: created.id,
        message: `Created sales order ${created.documentNumber ?? created.id}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('sales-order@update'))
    .input(updateSalesOrderSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, items, date, expectedDeliveryDate, ...header } = input;
      const existing = await prisma.salesOrder.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT orders can be edited.' });

      const updated = await prisma.$transaction(async (tx) => {
        const order = await tx.salesOrder.update({
          where: { id: currentId },
          data: {
            ...header,
            date: date ? new Date(date) : undefined,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
          },
        });

        // Replace items
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: currentId } });
        await tx.salesOrderItem.createMany({
          data: items.map((item, idx) => ({
            ...item,
            salesOrderId: order.id,
            sortOrder: idx,
          })),
        });

        return order;
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'sales_order',
        resourceId: updated.id,
        message: `Updated sales order ${updated.documentNumber ?? updated.id}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('sales-order@delete'))
    .input(salesOrderIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.salesOrder.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });

      await prisma.salesOrder.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'sales_order',
        resourceId: existing.id,
        message: `Deleted sales order ${existing.documentNumber ?? existing.id}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),

  propose: protectedProcedure
    .use(hasPermission('sales-order@propose'))
    .input(salesOrderIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.salesOrder.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT orders can be proposed.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Submit',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: 'Sales order submitted for approval',
      });

      const updated = await prisma.salesOrder.update({
        where: { id: input.id },
        data: { approvalStatus: 'PROPOSED', proposedAt: new Date(), approvalHistory: history as any },
      });

      await logActivity(prisma, {
        action: 'APPROVE',
        userId: ctx.user.userId,
        resource: 'sales_order',
        resourceId: updated.id,
        message: `Proposed sales order ${updated.documentNumber ?? updated.id}`,
      });

      return updated;
    }),

  approve: protectedProcedure
    .use(hasPermission('sales-order@approve'))
    .input(salesOrderIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.salesOrder.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      if (existing.approvalStatus !== 'PROPOSED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only PROPOSED orders can be approved.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Approve',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.salesOrder.update({
        where: { id: idInput.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedById: ctx.user.userId,
          approvedAt: new Date(),
          approvalHistory: history as any,
        },
      });

      // Notify creator
      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Sales Order Approved`,
        message: `Your sales order ${existing.documentNumber ?? existing.id} has been approved by ${ctx.user.name ?? 'Manager'}.`,
        targetType: 'SALES_ORDER',
        targetId: existing.id,
        actionUrl: `/sales-order/${existing.id}`,
      });

      await logActivity(prisma, {
        action: 'APPROVE',
        userId: ctx.user.userId,
        resource: 'sales_order',
        resourceId: updated.id,
        message: `Approved sales order ${updated.documentNumber ?? updated.id}`,
      });

      return updated;
    }),

  reject: protectedProcedure
    .use(hasPermission('sales-order@approve'))
    .input(salesOrderIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.salesOrder.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Reject',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Rejected',
      });

      const updated = await prisma.salesOrder.update({
        where: { id: idInput.id },
        data: { approvalStatus: 'REJECTED', approvalHistory: history as any },
      });

      // Notify creator
      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Sales Order Rejected`,
        message: `Your sales order ${existing.documentNumber ?? existing.id} has been rejected.${message ? ` Reason: ${message}` : ''}`,
        targetType: 'SALES_ORDER',
        targetId: existing.id,
        actionUrl: `/sales-order/${existing.id}`,
        type: 'WARNING',
      });

      await logActivity(prisma, {
        action: 'REJECT',
        userId: ctx.user.userId,
        resource: 'sales_order',
        resourceId: updated.id,
        message: `Rejected sales order ${updated.documentNumber ?? updated.id}`,
      });

      return updated;
    }),
});
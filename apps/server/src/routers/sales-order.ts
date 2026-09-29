import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../prisma/generated/client.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import * as z from 'zod';
import { createSalesOrderSchema, updateSalesOrderSchema, salesOrderIdSchema, salesOrderListInputSchema } from '@repo/schemas/sales-order';
import { resolveCartonLines } from '../lib/carton-pack-size.js';
import { pushApprovalHistory, sendApprovalNotification } from '../lib/approval-helpers.js';
import { validateSalesOrder } from '../lib/ai-validation.js';
import { findBestDiscount } from '../lib/action-program-discount.js';
import { startBackgroundValidation } from '../lib/background-validation.js';

export const salesOrderRouter = router({
  list: protectedProcedure
    .use(hasPermission('sales-order@read'))
    .input(salesOrderListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);

      const where: Prisma.SalesOrderWhereInput = {};
      if (input?.customerId) where.customerId = input.customerId;
      if (input?.outletId) where.outletId = input.outletId;
      if (input?.areaId) where.areaId = input.areaId;
      // ponytail: list input types approvalStatus as z.string() (schema change =
      // behavior change), so the raw string is passed through as before.
      if (input?.approvalStatus) where.approvalStatus = input.approvalStatus as Prisma.SalesOrderWhereInput['approvalStatus'];

      // Date range filter
      if (input?.dateFrom || input?.dateTo) {
        const date: Prisma.DateTimeFilter = {};
        if (input.dateFrom) date.gte = new Date(input.dateFrom);
        if (input.dateTo) date.lte = new Date(input.dateTo);
        where.date = date;
      }

      // Global search across all table columns
      if (input?.search?.trim()) {
        const raw = input.search.trim();
        const numeric = Number(raw.replace(/\./g, '').replace(/,/g, '.'));
        const isNumeric = !Number.isNaN(numeric);

        const or: Prisma.SalesOrderWhereInput[] = [
          { documentNumber: { contains: raw, mode: 'insensitive' } },
          { notes: { contains: raw, mode: 'insensitive' } },
          { customer: { name: { contains: raw, mode: 'insensitive' } } },
          { outlet: { name: { contains: raw, mode: 'insensitive' } } },
          { area: { name: { contains: raw, mode: 'insensitive' } } },
        ];

        if (isNumeric) {
          or.push({ grandTotal: { equals: numeric } });
        }

        where.OR = or;
      }

      // Sorting
      const sortBy = input?.sortBy || 'createdAt';
      const sortOrder = input?.sortOrder || 'desc';
      const orderBy: Prisma.SalesOrderOrderByWithRelationInput = { [sortBy]: sortOrder };

      const [data, total] = await Promise.all([
        prisma.salesOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy,
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

      // Auto-fill customerId and areaId from outlet
      const outlet = await prisma.outlet.findUnique({
        where: { id: header.outletId },
        select: { customerId: true, areaId: true },
      });
      if (!outlet) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found.' });

      // Validate optional action-program link: approved + active on order date + outlet covered
      if (header.actionProgramId) {
        const program = await prisma.actionProgram.findUnique({
          where: { id: header.actionProgramId },
          select: { approvalStatus: true, startDate: true, endDate: true },
        });
        if (!program) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Action program not found.' });
        if (program.approvalStatus !== 'APPROVED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Action program is not approved.' });
        const orderDate = date ? new Date(date) : new Date();
        if (orderDate < program.startDate || orderDate > program.endDate) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Action program is not active on the order date.' });
        }
        const outletInProgram = await prisma.actionProgramOutlet.findUnique({
          where: { actionProgramId_outletId: { actionProgramId: header.actionProgramId, outletId: header.outletId } },
        });
        if (!outletInProgram) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Outlet is not part of the action program.' });
      }

      // Auto-generate document number if not provided
      const providedDocumentNumber = header.documentNumber;

      // SPEC §Validation: whole-carton gate — resolve each line's pack size
      // from the live SKU, reject non-multiples, snapshot packSize onto the
      // line. Runs before the transaction so a bad line writes nothing.
      const itemRows = await resolveCartonLines(prisma, items);

      const created = await prisma.$transaction(async (tx) => {
        let documentNumber = providedDocumentNumber;
        if (!documentNumber) {
          const today = new Date();
          const dateStr = today.toISOString().split('T')[0]!.replace(/-/g, ''); // YYYYMMDD
          const prefix = `SO-${dateStr}-`;

          // Serialize concurrent number generation for this prefix so two
          // simultaneous creates cannot compute the same next number.
          // Advisory xact lock auto-releases at commit/rollback; the
          // documentNumber @unique constraint remains the hard backstop.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${prefix}))`;

          // Find the last document number for today
          const lastOrder = await tx.salesOrder.findFirst({
            where: {
              documentNumber: {
                startsWith: prefix,
              },
            },
            orderBy: {
              documentNumber: 'desc',
            },
            select: {
              documentNumber: true,
            },
          });

          let nextNum = 1;
          if (lastOrder?.documentNumber) {
            const lastNum = parseInt(lastOrder.documentNumber.slice(-4), 10);
            if (!isNaN(lastNum)) {
              nextNum = lastNum + 1;
            }
          }
          documentNumber = `${prefix}${nextNum.toString().padStart(4, '0')}`;
        }

        const order = await tx.salesOrder.create({
          data: {
            ...header,
            documentNumber,
            customerId: outlet.customerId,
            areaId: outlet.areaId,
            date: date ? new Date(date) : new Date(),
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
            createdById: ctx.user.userId,
            approvalStatus: 'DRAFT',
          },
        });

        await tx.salesOrderItem.createMany({
          data: itemRows.map((item, idx) => ({
            ...item,
            salesOrderId: order.id,
            sortOrder: idx,
          })),
        });

        await logActivity(tx, {
          action: 'CREATE',
          userId: ctx.user.userId,
          resource: 'sales_order',
          resourceId: order.id,
          message: `Created sales order ${order.documentNumber ?? order.id}`,
          detail: buildCreateLogDetail(order),
        });

        return order;
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

      // Auto-fill customerId and areaId from outlet
      const outlet = await prisma.outlet.findUnique({
        where: { id: header.outletId },
        select: { customerId: true, areaId: true },
      });
      if (!outlet) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found.' });

      // Validate optional action-program link: approved + active on order date + outlet covered
      if (header.actionProgramId) {
        const program = await prisma.actionProgram.findUnique({
          where: { id: header.actionProgramId },
          select: { approvalStatus: true, startDate: true, endDate: true },
        });
        if (!program) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Action program not found.' });
        if (program.approvalStatus !== 'APPROVED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Action program is not approved.' });
        const orderDate = date ? new Date(date) : new Date();
        if (orderDate < program.startDate || orderDate > program.endDate) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Action program is not active on the order date.' });
        }
        const outletInProgram = await prisma.actionProgramOutlet.findUnique({
          where: { actionProgramId_outletId: { actionProgramId: header.actionProgramId, outletId: header.outletId } },
        });
        if (!outletInProgram) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Outlet is not part of the action program.' });
      }

      // SPEC §Editing a line: keep each existing line's own packSize snapshot
      // unless its sku is swapped, then re-snapshot from the live SKU.
      const existingItems = await prisma.salesOrderItem.findMany({
        where: { salesOrderId: currentId },
        select: { skuId: true, packSize: true },
      });
      const existingSnapshots = new Map(existingItems.map((item) => [item.skuId, item.packSize]));

      // SPEC §Validation: same whole-carton gate as create.
      const itemRows = await resolveCartonLines(prisma, items, existingSnapshots);

      const updated = await prisma.$transaction(async (tx) => {
        const order = await tx.salesOrder.update({
          where: { id: currentId },
          data: {
            ...header,
            customerId: outlet.customerId,
            areaId: outlet.areaId,
            date: date ? new Date(date) : undefined,
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
          },
        });

        // Replace items
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: currentId } });
        await tx.salesOrderItem.createMany({
          data: itemRows.map((item, idx) => ({
            ...item,
            salesOrderId: order.id,
            sortOrder: idx,
          })),
        });

        await logActivity(tx, {
          action: 'UPDATE',
          userId: ctx.user.userId,
          resource: 'sales_order',
          resourceId: order.id,
          message: `Updated sales order ${order.documentNumber ?? order.id}`,
          detail: buildUpdateLogDetail(existing, order),
        });

        return order;
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('sales-order@delete'))
    .input(salesOrderIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.salesOrder.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      // Delete is legal only in the states where the creator still holds the order —
      // the same set `propose` accepts. Once an order is in the approval pipeline
      // (VALIDATING/PROPOSED/APPROVED) it is a financial record: it can be rejected,
      // never erased. Without this guard the UI hid Delete on proposed orders while
      // the API still accepted it.
      if (existing.approvalStatus !== 'DRAFT' && existing.approvalStatus !== 'REJECTED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT or REJECTED orders can be deleted.' });
      }

      await prisma.$transaction(async (tx) => {
        // Conditional delete, matching the TOCTOU guard used by validate/propose/approve/
        // reject: a proposal landing between the read above and this write is rejected,
        // not silently deleted.
        const result = await tx.salesOrder.deleteMany({
          where: { id: input.id, approvalStatus: { in: ['DRAFT', 'REJECTED'] } },
        });
        if (result.count === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT or REJECTED orders can be deleted.' });
        }

        await logActivity(tx, {
          action: 'DELETE',
          userId: ctx.user.userId,
          resource: 'sales_order',
          resourceId: existing.id,
          message: `Deleted sales order ${existing.documentNumber ?? existing.id}`,
          detail: buildDeleteLogDetail(existing),
        });
      });

      return { success: true };
    }),

  validate: protectedProcedure
    .use(hasPermission('sales-order@validate'))
    .input(salesOrderIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.salesOrder.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT orders can be validated.' });

      const validation = await validateSalesOrder(input.id);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Validation failed: ${validation.issues.join(', ')}`,
        });
      }

      const history = pushApprovalHistory(existing.approvalHistory, {
        process: 'AI Validation',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: 'Document validated successfully',
      });

      const updated = await prisma.$transaction(async (tx) => {
        // Conditional update: rejects a concurrent state change (TOCTOU guard).
        const result = await tx.salesOrder.updateMany({
          where: { id: input.id, approvalStatus: 'DRAFT' },
          data: {
            approvalStatus: 'PROPOSED',
            proposedAt: new Date(),
            approvalHistory: history,
          },
        });
        if (result.count === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT orders can be validated.' });
        }
        const order = await tx.salesOrder.findUniqueOrThrow({ where: { id: input.id } });

        await logActivity(tx, {
          action: 'APPROVE',
          userId: ctx.user.userId,
          resource: 'sales_order',
          resourceId: order.id,
          message: `Validated sales order ${order.documentNumber ?? order.id}`,
        });

        return order;
      });

      return updated;
    }),

  lookupDiscount: protectedProcedure
    .use(hasPermission('sales-order@read'))
    .input(z.object({
      skuId: z.string(),
      outletId: z.string(),
      date: z.string(),
    }))
    .query(async ({ input }) => {
      const discount = await findBestDiscount(input.skuId, input.outletId, new Date(input.date));
      return discount;
    }),

  suggestDiscounts: protectedProcedure
    .use(hasPermission('sales-order@read'))
    .input(z.object({
      outletId: z.string(),
      date: z.string(),
      skuIds: z.array(z.string()),
    }))
    .query(async ({ input }) => {
      const entries = await Promise.all(
        input.skuIds.map(async (skuId) => {
          const discount = await findBestDiscount(skuId, input.outletId, new Date(input.date));
          return [
            skuId,
            discount
              ? {
                  discountPercent: discount.discountPercent,
                  actionProgramId: discount.actionProgramId,
                  actionProgramName: discount.actionProgramName,
                }
              : null,
          ] as const;
        }),
      );
      return Object.fromEntries(entries);
    }),

  propose: protectedProcedure
    .use(hasPermission('sales-order@propose'))
    .input(salesOrderIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.salesOrder.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      if (existing.approvalStatus !== 'DRAFT' && existing.approvalStatus !== 'REJECTED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT or REJECTED orders can be proposed.' });

      const history = pushApprovalHistory(existing.approvalHistory, {
        process: 'Submit',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Sales order submitted for AI validation',
      });

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.salesOrder.updateMany({
          where: { id: idInput.id, approvalStatus: { in: ['DRAFT', 'REJECTED'] } },
          data: {
            approvalStatus: 'VALIDATING',
            approvalHistory: history,
          },
        });
        if (result.count === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT or REJECTED orders can be proposed.' });
        }
        const order = await tx.salesOrder.findUniqueOrThrow({ where: { id: idInput.id } });

        await logActivity(tx, {
          action: 'APPROVE',
          userId: ctx.user.userId,
          resource: 'sales_order',
          resourceId: order.id,
          message: `Submitted sales order ${order.documentNumber ?? order.id} for AI validation`,
        });

        return order;
      });

      // Fire-and-forget background validation (reads committed data)
      startBackgroundValidation(updated.id, ctx.user.userId);

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

      const history = pushApprovalHistory(existing.approvalHistory, {
        process: 'Approve',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.salesOrder.updateMany({
          where: { id: idInput.id, approvalStatus: 'PROPOSED' },
          data: {
            approvalStatus: 'APPROVED',
            approvedById: ctx.user.userId,
            approvedAt: new Date(),
            approvalHistory: history,
          },
        });
        if (result.count === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only PROPOSED orders can be approved.' });
        }
        const order = await tx.salesOrder.findUniqueOrThrow({ where: { id: idInput.id } });

        // Notify creator atomically with the state change.
        await sendApprovalNotification({
          recipientId: existing.createdById,
          createdById: ctx.user.userId,
          title: `Sales Order Approved`,
          message: `Your sales order ${order.documentNumber ?? order.id} has been approved by ${ctx.user.name ?? 'Manager'}.`,
          targetType: 'SALES_ORDER',
          targetId: order.id,
          actionUrl: `/sales-order/${order.id}`,
          db: tx,
        });

        await logActivity(tx, {
          action: 'APPROVE',
          userId: ctx.user.userId,
          resource: 'sales_order',
          resourceId: order.id,
          message: `Approved sales order ${order.documentNumber ?? order.id}`,
        });

        return order;
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

      const history = pushApprovalHistory(existing.approvalHistory, {
        process: 'Reject',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Rejected',
      });

      const updated = await prisma.$transaction(async (tx) => {
        // PROPOSED or VALIDATING (manager can reject while AI validation runs).
        const result = await tx.salesOrder.updateMany({
          where: { id: idInput.id, approvalStatus: { in: ['PROPOSED', 'VALIDATING'] } },
          data: { approvalStatus: 'REJECTED', approvalHistory: history },
        });
        if (result.count === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only PROPOSED or VALIDATING orders can be rejected.' });
        }
        const order = await tx.salesOrder.findUniqueOrThrow({ where: { id: idInput.id } });

        await sendApprovalNotification({
          recipientId: existing.createdById,
          createdById: ctx.user.userId,
          title: `Sales Order Rejected`,
          message: `Your sales order ${order.documentNumber ?? order.id} has been rejected.${message ? ` Reason: ${message}` : ''}`,
          targetType: 'SALES_ORDER',
          targetId: order.id,
          actionUrl: `/sales-order/${order.id}`,
          type: 'WARNING',
          db: tx,
        });

        await logActivity(tx, {
          action: 'REJECT',
          userId: ctx.user.userId,
          resource: 'sales_order',
          resourceId: order.id,
          message: `Rejected sales order ${order.documentNumber ?? order.id}`,
        });

        return order;
      });

      return updated;
    }),

  retryValidation: protectedProcedure
    .use(hasPermission('sales-order@validate'))
    .input(salesOrderIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.salesOrder.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sales order not found.' });
      if (existing.approvalStatus !== 'VALIDATING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only VALIDATING orders can retry AI validation.' });
      }

      const updated = await prisma.salesOrder.update({
        where: { id: input.id },
        data: {},
      });

      await logActivity(prisma, {
        action: 'APPROVE',
        userId: ctx.user.userId,
        resource: 'sales_order',
        resourceId: updated.id,
        message: `Retrying AI validation for sales order ${updated.documentNumber ?? updated.id}`,
      });

      // Fire-and-forget background validation
      startBackgroundValidation(updated.id, ctx.user.userId);

      return updated;
    }),
});
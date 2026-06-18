import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createInvoiceSchema, updateInvoiceSchema, invoiceIdSchema, invoiceListInputSchema } from '@repo/schemas/invoice';

export const invoiceRouter = router({
  list: protectedProcedure
    .use(hasPermission('invoice@read'))
    .input(invoiceListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['documentNumber', 'notes'] as const);

      const where: Record<string, unknown> = { ...searchWhere };
      if (input?.customerId) where.customerId = input.customerId;
      if (input?.salesOrderId) where.salesOrderId = input.salesOrderId;
      if (input?.status) where.status = input.status;

      const [data, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true } },
            salesOrder: { select: { id: true, documentNumber: true } },
            _count: { select: { payments: true } },
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('invoice@read'))
    .input(invoiceIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.invoice.findUnique({
        where: { id: input.id },
        include: {
          customer: { select: { id: true, name: true } },
          salesOrder: { select: { id: true, documentNumber: true } },
          payments: { orderBy: { date: 'desc' } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('invoice@create'))
    .input(createInvoiceSchema)
    .mutation(async ({ input, ctx }) => {
      const { date, dueDate, ...rest } = input;
      const created = await prisma.invoice.create({
        data: {
          ...rest,
          date: date ? new Date(date) : new Date(),
          dueDate: new Date(dueDate),
        },
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'invoice',
        resourceId: created.id,
        message: `Created invoice ${created.documentNumber ?? created.id}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('invoice@update'))
    .input(updateInvoiceSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, date, dueDate, ...rest } = input;
      const existing = await prisma.invoice.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found.' });

      const updated = await prisma.invoice.update({
        where: { id: currentId },
        data: {
          ...rest,
          date: date ? new Date(date) : undefined,
          dueDate: new Date(dueDate),
        },
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'invoice',
        resourceId: updated.id,
        message: `Updated invoice ${updated.documentNumber ?? updated.id}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('invoice@delete'))
    .input(invoiceIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.invoice.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found.' });

      await prisma.invoice.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'invoice',
        resourceId: existing.id,
        message: `Deleted invoice ${existing.documentNumber ?? existing.id}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});
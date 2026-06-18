import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createVisitLogSchema, updateVisitLogSchema, visitLogIdSchema, visitLogListInputSchema } from '@repo/schemas/visit-log';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildDeleteLogDetail, buildUpdateLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { pushApprovalHistory, sendApprovalNotification } from '../lib/approval-helpers.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

export const visitLogRouter = router({
  list: protectedProcedure
    .use(hasPermission('visit-log@read'))
    .input(visitLogListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);

      const where: Record<string, unknown> = {};
      if (input?.salesmanId) where.salesmanId = input.salesmanId;
      if (input?.outletId) where.outletId = input.outletId;
      if (input?.approvalStatus) where.approvalStatus = input.approvalStatus;

      const [data, total] = await Promise.all([
        prisma.visitLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { date: 'desc' },
          include: {
            salesman: { select: { id: true, name: true } },
            outlet: { select: { id: true, name: true } },
          },
        }),
        prisma.visitLog.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('visit-log@read'))
    .input(visitLogIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.visitLog.findUnique({
        where: { id: input.id },
        include: {
          salesman: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true, customer: { select: { id: true, name: true } }, area: { select: { id: true, name: true } } } },
          salesOrder: { select: { id: true, documentNumber: true, grandTotal: true } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Visit log not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('visit-log@create'))
    .input(createVisitLogSchema)
    .mutation(async ({ input, ctx }) => {
      const { date, checkInAt, checkOutAt, ...rest } = input;
      const created = await prisma.visitLog.create({
        data: {
          ...rest,
          date: new Date(date),
          checkInAt: checkInAt ? new Date(checkInAt) : null,
          checkOutAt: checkOutAt ? new Date(checkOutAt) : null,
        },
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'visit_log',
        resourceId: created.id,
        message: `Created visit log at ${created.date.toISOString()}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('visit-log@create'))
    .input(updateVisitLogSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, date, checkInAt, checkOutAt, ...rest } = input;
      const existing = await prisma.visitLog.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Visit log not found.' });

      const updated = await prisma.visitLog.update({
        where: { id: currentId },
        data: {
          ...rest,
          date: new Date(date),
          checkInAt: checkInAt ? new Date(checkInAt) : null,
          checkOutAt: checkOutAt ? new Date(checkOutAt) : null,
        },
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'visit_log',
        resourceId: updated.id,
        message: `Updated visit log`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('visit-log@delete'))
    .input(visitLogIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.visitLog.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Visit log not found.' });

      await prisma.visitLog.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'visit_log',
        resourceId: existing.id,
        message: `Deleted visit log`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),

  // --- Approval flow: submit for AM approval → Area Manager approves/rejects ---

  submit: protectedProcedure
    .use(hasPermission('visit-log@create'))
    .input(visitLogIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.visitLog.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Visit log not found.' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT visit logs can be submitted.' });

      const history = pushApprovalHistory((existing as any).approvalHistory ?? null, {
        process: 'Submit',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: 'Visit log submitted for approval',
      });

      const updated = await prisma.visitLog.update({
        where: { id: input.id },
        data: { approvalStatus: 'PROPOSED', submittedAt: new Date(), approvalHistory: history } as any,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'visit_log', resourceId: updated.id, message: `Submitted visit log for approval` });
      return updated;
    }),

  approve: protectedProcedure
    .use(hasPermission('visit-log@read'))
    .input(visitLogIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.visitLog.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Visit log not found.' });
      if (existing.approvalStatus !== 'PROPOSED') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only PROPOSED visit logs can be approved.' });

      const history = pushApprovalHistory((existing as any).approvalHistory ?? null, {
        process: 'Approve',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.visitLog.update({
        where: { id: idInput.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedById: ctx.user.userId,
          approvedAt: new Date(),
          approvalHistory: history,
        } as any,
      });

      await sendApprovalNotification({
        recipientId: existing.salesmanId,
        createdById: ctx.user.userId,
        title: `Visit Log Approved`,
        message: `Your visit log at ${existing.outletId ? 'outlet' : 'location'} has been approved.`,
        targetType: 'VISIT_LOG',
        targetId: existing.id,
        actionUrl: `/visit-log/${existing.id}`,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'visit_log', resourceId: updated.id, message: `Approved visit log` });
      return updated;
    }),

  reject: protectedProcedure
    .use(hasPermission('visit-log@read'))
    .input(visitLogIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.visitLog.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Visit log not found.' });

      const history = pushApprovalHistory((existing as any).approvalHistory ?? null, {
        process: 'Reject',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Rejected',
      });

      const updated = await prisma.visitLog.update({
        where: { id: idInput.id },
        data: { approvalStatus: 'REJECTED', approvalHistory: history } as any,
      });

      await sendApprovalNotification({
        recipientId: existing.salesmanId,
        createdById: ctx.user.userId,
        title: `Visit Log Rejected`,
        message: `Your visit log has been rejected.${message ? ` Reason: ${message}` : ''}`,
        targetType: 'VISIT_LOG',
        targetId: existing.id,
        actionUrl: `/visit-log/${existing.id}`,
        type: 'WARNING',
      });

      await logActivity(prisma, { action: 'REJECT', userId: ctx.user.userId, resource: 'visit_log', resourceId: updated.id, message: `Rejected visit log` });
      return updated;
    }),
});
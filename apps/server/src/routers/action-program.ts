import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createActionProgramSchema } from '@repo/schemas/action-program';
import { z } from 'zod';
import { updateActionProgramSchema, actionProgramIdSchema, actionProgramListInputSchema } from '@repo/schemas/action-program';
import { pushApprovalHistory, sendApprovalNotification } from '../lib/approval-helpers.js';
import type { ActionProgramType } from '../prisma/generated/client';

export const actionProgramRouter = router({
  list: protectedProcedure
    .use(hasPermission('action-program@read'))
    .input(actionProgramListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['name', 'documentNumber', 'description'] as const);

      const where: Record<string, unknown> = { ...searchWhere };
      if (input?.areaId) where.areaId = input.areaId;
      if (input?.approvalStatus) where.approvalStatus = input.approvalStatus;
      if (input?.type) where.type = input.type;

      const [data, total] = await Promise.all([
        prisma.actionProgram.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            area: { select: { id: true, name: true } },
            pic: { select: { id: true, name: true } },
            _count: { select: { outlets: true, skus: true } },
          },
        }),
        prisma.actionProgram.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('action-program@read'))
    .input(actionProgramIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.actionProgram.findUnique({
        where: { id: input.id },
        include: {
          area: { select: { id: true, name: true } },
          pic: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          outlets: { include: { outlet: { select: { id: true, name: true, code: true } } } },
          skus: { include: { sku: { select: { id: true, name: true, code: true } } } },
          payments: { orderBy: { paymentDate: 'asc' } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Action program not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('action-program@create'))
    .input(createActionProgramSchema)
    .mutation(async ({ input, ctx }) => {
      const { outletIds, skuIds, payments, startDate, endDate, ...header } = input;

      const created = await prisma.$transaction(async (tx) => {
        const program = await tx.actionProgram.create({
          data: {
            ...header,
            type: header.type as ActionProgramType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            createdById: ctx.user.userId,
            rules: (header.rules ?? {}) as any,
          },
        });

        // Connect outlets
        await tx.actionProgramOutlet.createMany({
          data: outletIds.map((outletId) => ({ actionProgramId: program.id, outletId })),
        });

        // Connect SKUs
        if (skuIds.length > 0) {
          await tx.actionProgramSku.createMany({
            data: skuIds.map((skuId) => ({ actionProgramId: program.id, skuId })),
          });
        }

        // Create payments
        if (payments.length > 0) {
          await tx.actionProgramPayment.createMany({
            data: payments.map((p) => ({
              actionProgramId: program.id,
              ...p,
              paymentDate: new Date(p.paymentDate),
            })),
          });
        }

        return program;
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'action_program',
        resourceId: created.id,
        message: `Created action program ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('action-program@update'))
    .input(updateActionProgramSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, outletIds, skuIds, payments, startDate, endDate, ...header } = input;
      const existing = await prisma.actionProgram.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Action program not found.' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT programs can be edited.' });

      const updated = await prisma.$transaction(async (tx) => {
        const program = await tx.actionProgram.update({
          where: { id: currentId },
          data: {
            ...header,
            type: header.type as ActionProgramType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            rules: (header.rules ?? {}) as any,
          },
        });

        // Replace outlets
        await tx.actionProgramOutlet.deleteMany({ where: { actionProgramId: currentId } });
        await tx.actionProgramOutlet.createMany({
          data: outletIds.map((outletId) => ({ actionProgramId: program.id, outletId })),
        });

        // Replace SKUs
        await tx.actionProgramSku.deleteMany({ where: { actionProgramId: currentId } });
        if (skuIds.length > 0) {
          await tx.actionProgramSku.createMany({
            data: skuIds.map((skuId) => ({ actionProgramId: program.id, skuId })),
          });
        }

        // Replace payments
        await tx.actionProgramPayment.deleteMany({ where: { actionProgramId: currentId } });
        if (payments.length > 0) {
          await tx.actionProgramPayment.createMany({
            data: payments.map((p) => ({
              actionProgramId: program.id,
              ...p,
              paymentDate: new Date(p.paymentDate),
            })),
          });
        }

        return program;
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'action_program',
        resourceId: updated.id,
        message: `Updated action program ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('action-program@delete'))
    .input(actionProgramIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.actionProgram.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Action program not found.' });

      await prisma.actionProgram.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'action_program',
        resourceId: existing.id,
        message: `Deleted action program ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),

  // ---- 4-tier approval flow: Area Manager → Regional Manager → Finance → Director ----

  approveArea: protectedProcedure
    .use(hasPermission('action-program@approve-area'))
    .input(actionProgramIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.actionProgram.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Action program not found.' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT programs can start approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Area Manager',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.actionProgram.update({
        where: { id: idInput.id },
        data: {
          approvalStatus: 'PROPOSED',
          areaManagerApprovedById: ctx.user.userId,
          areaManagerApprovedAt: new Date(),
          approvalHistory: history as any,
        },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Action Program Progress`,
        message: `Area Manager approved your program "${existing.name}".`,
        targetType: 'ACTION_PROGRAM',
        targetId: existing.id,
        actionUrl: `/action-program/${existing.id}`,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'action_program', resourceId: updated.id, message: `Area Manager approved ${updated.name}` });
      return updated;
    }),

  approveRegion: protectedProcedure
    .use(hasPermission('action-program@approve-region'))
    .input(actionProgramIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.actionProgram.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (existing.approvalStatus !== 'PROPOSED' || !existing.areaManagerApprovedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Waiting for Area Manager approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Regional Manager',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.actionProgram.update({
        where: { id: idInput.id },
        data: { regionManagerApprovedById: ctx.user.userId, regionManagerApprovedAt: new Date(), approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Action Program Progress`,
        message: `Regional Manager approved your program "${existing.name}".`,
        targetType: 'ACTION_PROGRAM',
        targetId: existing.id,
        actionUrl: `/action-program/${existing.id}`,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'action_program', resourceId: updated.id, message: `Region Manager approved ${updated.name}` });
      return updated;
    }),

  approveFinance: protectedProcedure
    .use(hasPermission('action-program@approve-finance'))
    .input(actionProgramIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.actionProgram.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (!existing.regionManagerApprovedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Waiting for Region Manager approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Finance PIC',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.actionProgram.update({
        where: { id: idInput.id },
        data: { financeManagerApprovedById: ctx.user.userId, financeManagerApprovedAt: new Date(), approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Action Program Progress`,
        message: `Finance PIC approved your program "${existing.name}".`,
        targetType: 'ACTION_PROGRAM',
        targetId: existing.id,
        actionUrl: `/action-program/${existing.id}`,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'action_program', resourceId: updated.id, message: `Finance approved ${updated.name}` });
      return updated;
    }),

  approveDirector: protectedProcedure
    .use(hasPermission('action-program@approve-director'))
    .input(actionProgramIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.actionProgram.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (!existing.financeManagerApprovedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Waiting for Finance approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Director',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.actionProgram.update({
        where: { id: idInput.id },
        data: { approvalStatus: 'APPROVED', directorApprovedById: ctx.user.userId, directorApprovedAt: new Date(), approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Action Program Fully Approved`,
        message: `Director has approved your program "${existing.name}". All approvals complete.`,
        targetType: 'ACTION_PROGRAM',
        targetId: existing.id,
        actionUrl: `/action-program/${existing.id}`,
        type: 'SUCCESS',
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'action_program', resourceId: updated.id, message: `Director approved ${updated.name}` });
      return updated;
    }),

  reject: protectedProcedure
    .use(hasPermission('action-program@approve-area'))
    .input(actionProgramIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.actionProgram.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Reject',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Rejected',
      });

      const updated = await prisma.actionProgram.update({
        where: { id: idInput.id },
        data: { approvalStatus: 'REJECTED', approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Action Program Rejected`,
        message: `Your program "${existing.name}" has been rejected.${message ? ` Reason: ${message}` : ''}`,
        targetType: 'ACTION_PROGRAM',
        targetId: existing.id,
        actionUrl: `/action-program/${existing.id}`,
        type: 'WARNING',
      });

      await logActivity(prisma, { action: 'REJECT', userId: ctx.user.userId, resource: 'action_program', resourceId: updated.id, message: `Rejected ${updated.name}` });
      return updated;
    }),
});
import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createEventProposalSchema } from '@repo/schemas/event-proposal';
import { z } from 'zod';
import { updateEventProposalSchema, eventProposalIdSchema, eventProposalListInputSchema } from '@repo/schemas/event-proposal';
import { pushApprovalHistory, sendApprovalNotification } from '../lib/approval-helpers.js';

export const eventProposalRouter = router({
  list: protectedProcedure
    .use(hasPermission('event-proposal@read'))
    .input(eventProposalListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['name', 'documentNumber', 'eventType', 'venue'] as const);

      const where: Record<string, unknown> = { ...searchWhere };
      if (input?.areaId) where.areaId = input.areaId;
      if (input?.approvalStatus) where.approvalStatus = input.approvalStatus;

      const [data, total] = await Promise.all([
        prisma.eventProposal.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            area: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            _count: { select: { skus: true } },
          },
        }),
        prisma.eventProposal.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('event-proposal@read'))
    .input(eventProposalIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.eventProposal.findUnique({
        where: { id: input.id },
        include: {
          area: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          skus: { include: { sku: { select: { id: true, name: true, code: true } } } },
          payments: { orderBy: { paymentDate: 'asc' } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event proposal not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('event-proposal@create'))
    .input(createEventProposalSchema)
    .mutation(async ({ input, ctx }) => {
      const { skuIds, payments, eventDate, eventEndDate, ...header } = input;

      const created = await prisma.$transaction(async (tx) => {
        const proposal = await tx.eventProposal.create({
          data: {
            ...header,
            eventDate: new Date(eventDate),
            eventEndDate: eventEndDate ? new Date(eventEndDate) : null,
            createdById: ctx.user.userId,
          },
        });

        if (skuIds.length > 0) {
          await tx.eventProposalSku.createMany({
            data: skuIds.map((skuId) => ({ eventProposalId: proposal.id, skuId })),
          });
        }

        if (payments.length > 0) {
          await tx.eventProposalPayment.createMany({
            data: payments.map((p) => ({
              eventProposalId: proposal.id,
              ...p,
              paymentDate: new Date(p.paymentDate),
            })),
          });
        }

        return proposal;
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'event_proposal',
        resourceId: created.id,
        message: `Created event proposal ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('event-proposal@update'))
    .input(updateEventProposalSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, skuIds, payments, eventDate, eventEndDate, ...header } = input;
      const existing = await prisma.eventProposal.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event proposal not found.' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT proposals can be edited.' });

      const updated = await prisma.$transaction(async (tx) => {
        const proposal = await tx.eventProposal.update({
          where: { id: currentId },
          data: {
            ...header,
            eventDate: new Date(eventDate),
            eventEndDate: eventEndDate ? new Date(eventEndDate) : null,
          },
        });

        await tx.eventProposalSku.deleteMany({ where: { eventProposalId: currentId } });
        if (skuIds.length > 0) {
          await tx.eventProposalSku.createMany({
            data: skuIds.map((skuId) => ({ eventProposalId: proposal.id, skuId })),
          });
        }

        await tx.eventProposalPayment.deleteMany({ where: { eventProposalId: currentId } });
        if (payments.length > 0) {
          await tx.eventProposalPayment.createMany({
            data: payments.map((p) => ({
              eventProposalId: proposal.id,
              ...p,
              paymentDate: new Date(p.paymentDate),
            })),
          });
        }

        return proposal;
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'event_proposal',
        resourceId: updated.id,
        message: `Updated event proposal ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('event-proposal@delete'))
    .input(eventProposalIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.eventProposal.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Event proposal not found.' });

      await prisma.eventProposal.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'event_proposal',
        resourceId: existing.id,
        message: `Deleted event proposal ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),

  // ---- 4-tier approval: Area → Region → Finance → Director ----

  approveArea: protectedProcedure
    .use(hasPermission('event-proposal@approve-area'))
    .input(eventProposalIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.eventProposal.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (existing.approvalStatus !== 'DRAFT') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only DRAFT proposals can start approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Area Manager',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.eventProposal.update({
        where: { id: idInput.id },
        data: { approvalStatus: 'PROPOSED', areaManagerApprovedById: ctx.user.userId, areaManagerApprovedAt: new Date(), approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Event Proposal Progress`,
        message: `Area Manager approved your proposal "${existing.name}".`,
        targetType: 'EVENT_PROPOSAL',
        targetId: existing.id,
        actionUrl: `/event-proposal/${existing.id}`,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'event_proposal', resourceId: updated.id, message: `Area Manager approved ${updated.name}` });
      return updated;
    }),

  approveRegion: protectedProcedure
    .use(hasPermission('event-proposal@approve-region'))
    .input(eventProposalIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.eventProposal.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (existing.approvalStatus !== 'PROPOSED' || !existing.areaManagerApprovedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Waiting for Area Manager approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Regional Manager',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.eventProposal.update({
        where: { id: idInput.id },
        data: { regionManagerApprovedById: ctx.user.userId, regionManagerApprovedAt: new Date(), approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Event Proposal Progress`,
        message: `Regional Manager approved your proposal "${existing.name}".`,
        targetType: 'EVENT_PROPOSAL',
        targetId: existing.id,
        actionUrl: `/event-proposal/${existing.id}`,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'event_proposal', resourceId: updated.id, message: `Region Manager approved ${updated.name}` });
      return updated;
    }),

  approveFinance: protectedProcedure
    .use(hasPermission('event-proposal@approve-finance'))
    .input(eventProposalIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.eventProposal.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (!existing.regionManagerApprovedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Waiting for Region Manager approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Finance PIC',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.eventProposal.update({
        where: { id: idInput.id },
        data: { financeManagerApprovedById: ctx.user.userId, financeManagerApprovedAt: new Date(), approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Event Proposal Progress`,
        message: `Finance PIC approved your proposal "${existing.name}".`,
        targetType: 'EVENT_PROPOSAL',
        targetId: existing.id,
        actionUrl: `/event-proposal/${existing.id}`,
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'event_proposal', resourceId: updated.id, message: `Finance approved ${updated.name}` });
      return updated;
    }),

  approveDirector: protectedProcedure
    .use(hasPermission('event-proposal@approve-director'))
    .input(eventProposalIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.eventProposal.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      if (!existing.financeManagerApprovedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Waiting for Finance approval.' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Director',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Approved',
      });

      const updated = await prisma.eventProposal.update({
        where: { id: idInput.id },
        data: { approvalStatus: 'APPROVED', directorApprovedById: ctx.user.userId, directorApprovedAt: new Date(), approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Event Proposal Fully Approved`,
        message: `Director has approved your proposal "${existing.name}". All approvals complete.`,
        targetType: 'EVENT_PROPOSAL',
        targetId: existing.id,
        actionUrl: `/event-proposal/${existing.id}`,
        type: 'SUCCESS',
      });

      await logActivity(prisma, { action: 'APPROVE', userId: ctx.user.userId, resource: 'event_proposal', resourceId: updated.id, message: `Director approved ${updated.name}` });
      return updated;
    }),

  reject: protectedProcedure
    .use(hasPermission('event-proposal@approve-area'))
    .input(eventProposalIdSchema.extend({ message: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { message, ...idInput } = input;
      const existing = await prisma.eventProposal.findUnique({ where: { id: idInput.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      const history = pushApprovalHistory((existing as any).approvalHistory, {
        process: 'Reject',
        name: ctx.user.name ?? 'Unknown',
        dateTime: new Date().toISOString(),
        message: message ?? 'Rejected',
      });

      const updated = await prisma.eventProposal.update({
        where: { id: idInput.id },
        data: { approvalStatus: 'REJECTED', approvalHistory: history as any },
      });

      await sendApprovalNotification({
        recipientId: existing.createdById,
        createdById: ctx.user.userId,
        title: `Event Proposal Rejected`,
        message: `Your proposal "${existing.name}" has been rejected.${message ? ` Reason: ${message}` : ''}`,
        targetType: 'EVENT_PROPOSAL',
        targetId: existing.id,
        actionUrl: `/event-proposal/${existing.id}`,
        type: 'WARNING',
      });

      await logActivity(prisma, { action: 'REJECT', userId: ctx.user.userId, resource: 'event_proposal', resourceId: updated.id, message: `Rejected ${updated.name}` });
      return updated;
    }),
});
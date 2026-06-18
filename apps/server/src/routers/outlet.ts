import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createOutletSchema, updateOutletSchema, outletIdSchema, outletListInputSchema } from '@repo/schemas/outlet';

export const outletRouter = router({
  list: protectedProcedure
    .use(hasPermission('outlet@read'))
    .input(outletListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['name', 'code', 'address'] as const);

      const where: Record<string, unknown> = { ...searchWhere };
      if (input?.customerId) where.customerId = input.customerId;
      if (input?.areaId) where.areaId = input.areaId;

      const [data, total] = await Promise.all([
        prisma.outlet.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true } },
            area: { select: { id: true, name: true } },
            _count: { select: { visitLogs: true, salesOrders: true } },
          },
        }),
        prisma.outlet.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('outlet@read'))
    .input(outletIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.outlet.findUnique({
        where: { id: input.id },
        include: {
          customer: { select: { id: true, name: true } },
          area: { select: { id: true, name: true, region: { select: { id: true, name: true } } } },
          contacts: { select: { id: true, name: true, title: true, email: true, phone: true } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('outlet@create'))
    .input(createOutletSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.outlet.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'outlet',
        resourceId: created.id,
        message: `Created outlet ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('outlet@update'))
    .input(updateOutletSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.outlet.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found.' });

      const updated = await prisma.outlet.update({ where: { id: currentId }, data });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'outlet',
        resourceId: updated.id,
        message: `Updated outlet ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('outlet@delete'))
    .input(outletIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.outlet.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found.' });

      await prisma.outlet.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'outlet',
        resourceId: existing.id,
        message: `Deleted outlet ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});
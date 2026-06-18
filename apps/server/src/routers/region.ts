import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createRegionSchema, updateRegionSchema, regionIdSchema } from '@repo/schemas/region';

export const regionRouter = router({
  list: protectedProcedure
    .use(hasPermission('region@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['id', 'name', 'code'] as const);

      const [data, total] = await Promise.all([
        prisma.region.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { _count: { select: { areas: true } } } }),
        prisma.region.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('region@read'))
    .input(regionIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.region.findUnique({
        where: { id: input.id },
        include: { areas: { select: { id: true, name: true, code: true } } },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Region not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('region@create'))
    .input(createRegionSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.region.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'region',
        resourceId: created.id,
        message: `Created region ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('region@update'))
    .input(updateRegionSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.region.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Region not found.' });

      const updated = await prisma.region.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'region',
        resourceId: updated.id,
        message: `Updated region ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('region@delete'))
    .input(regionIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.region.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Region not found.' });

      await prisma.region.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'region',
        resourceId: existing.id,
        message: `Deleted region ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});
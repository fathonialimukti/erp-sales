import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createAreaSchema, updateAreaSchema, areaIdSchema, areaListInputSchema } from '@repo/schemas/area';

export const areaRouter = router({
  list: protectedProcedure
    .use(hasPermission('area@read'))
    .input(areaListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['name', 'code'] as const);

      const where: any = { ...searchWhere };
      if (input?.regionId) where.regionId = input.regionId;

      const [data, total] = await Promise.all([
        prisma.area.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            region: { select: { id: true, name: true } },
            _count: { select: { outlets: true, salesmen: true } },
          },
        }),
        prisma.area.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('area@read'))
    .input(areaIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.area.findUnique({
        where: { id: input.id },
        include: {
          region: { select: { id: true, name: true } },
          outlets: { select: { id: true, name: true, code: true } },
          salesmen: { select: { id: true, name: true, email: true } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Area not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('area@create'))
    .input(createAreaSchema)
    .mutation(async ({ input, ctx }) => {
      const region = await prisma.region.findUnique({ where: { id: input.regionId } });
      if (!region) throw new TRPCError({ code: 'NOT_FOUND', message: 'Region not found.' });

      const created = await prisma.area.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'area',
        resourceId: created.id,
        message: `Created area ${created.name}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('area@update'))
    .input(updateAreaSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.area.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Area not found.' });

      const region = await prisma.region.findUnique({ where: { id: data.regionId } });
      if (!region) throw new TRPCError({ code: 'NOT_FOUND', message: 'Region not found.' });

      const updated = await prisma.area.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'area',
        resourceId: updated.id,
        message: `Updated area ${updated.name}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('area@delete'))
    .input(areaIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.area.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Area not found.' });

      await prisma.area.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'area',
        resourceId: existing.id,
        message: `Deleted area ${existing.name}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});
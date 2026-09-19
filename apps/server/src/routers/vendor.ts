import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createVendorSchema, updateVendorSchema, vendorIdSchema, vendorListInputSchema } from '@repo/schemas/vendor';

export const vendorRouter = router({
  list: protectedProcedure
    .use(hasPermission('vendor@read'))
    .input(vendorListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['id', 'name', 'code'] as const);

      const where = {
        ...(searchWhere ?? {}),
        ...(input?.status ? { status: input.status } : {}),
      };

      const [data, total] = await Promise.all([
        prisma.vendor.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.vendor.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('vendor@read'))
    .input(vendorIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.vendor.findUnique({ where: { id: input.id } });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('vendor@create'))
    .input(createVendorSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.vendor.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'vendor',
        resourceId: created.id,
        message: `Created vendor ${created.name}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('vendor@update'))
    .input(updateVendorSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.vendor.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found.' });

      const updated = await prisma.vendor.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'vendor',
        resourceId: updated.id,
        message: `Updated vendor ${updated.name}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('vendor@delete'))
    .input(vendorIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.vendor.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendor not found.' });

      await prisma.vendor.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'vendor',
        resourceId: existing.id,
        message: `Deleted vendor ${existing.name}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),
});

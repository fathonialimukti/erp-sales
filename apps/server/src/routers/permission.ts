import * as z from 'zod';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

export const permissionRouter = router({
  list: protectedProcedure
    .use(hasPermission('permission@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['name', 'description'] as const);

      const [data, total] = await Promise.all([
        prisma.permission.findMany({
          where,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          include: { _count: { select: { roles: true } } },
        }),
        prisma.permission.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  create: protectedProcedure
    .use(hasPermission('permission@create'))
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.permission.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'permission',
        resourceId: created.id,
        message: `Created permission ${created.name}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('permission@update'))
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const existing = await prisma.permission.findUnique({ where: { id } });
      const updated = await prisma.permission.update({ where: { id }, data });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'permission',
        resourceId: updated.id,
        message: `Updated permission ${updated.name}`,
        detail: buildUpdateLogDetail(existing ?? {}, updated),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('permission@delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.permission.findUnique({ where: { id: input.id } });
      await prisma.permission.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'permission',
        resourceId: input.id,
        message: `Deleted permission ${existing?.name ?? input.id}`,
        detail: buildDeleteLogDetail(existing ?? {}),
      });

      return { success: true };
    }),
});
import { z } from 'zod';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

export const permissionRouter = router({
  list: protectedProcedure
    .use(hasPermission('user@read'))
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
    .use(hasPermission('user@create'))
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      return prisma.permission.create({ data: input });
    }),

  update: protectedProcedure
    .use(hasPermission('user@update'))
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.permission.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .use(hasPermission('user@delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.permission.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
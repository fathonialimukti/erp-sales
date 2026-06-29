import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';

export const roleRouter = router({
  list: protectedProcedure
    .use(hasPermission('role@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['name', 'description'] as const);

      const [data, total] = await Promise.all([
        prisma.role.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { users: true, permissions: true } },
          },
        }),
        prisma.role.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('role@read'))
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const record = await prisma.role.findUnique({
        where: { id: input.id },
        include: {
          permissions: { include: { permission: { select: { id: true, name: true, description: true } } } },
          users: { select: { id: true, name: true, email: true } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('role@create'))
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      permissionIds: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ input }) => {
      const { permissionIds, ...data } = input;
      const created = await prisma.$transaction(async (tx) => {
        const role = await tx.role.create({ data });
        if (permissionIds.length > 0) {
          await tx.roleHasPermission.createMany({
            data: permissionIds.map((pid) => ({ roleId: role.id, permissionId: pid })),
          });
        }
        return role;
      });
      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('role@update'))
    .input(z.object({
      currentId: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      permissionIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { currentId, permissionIds, ...data } = input;
      const existing = await prisma.role.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found.' });

      const updated = await prisma.$transaction(async (tx) => {
        const role = await tx.role.update({ where: { id: currentId }, data });

        if (permissionIds !== undefined) {
          await tx.roleHasPermission.deleteMany({ where: { roleId: currentId } });
          if (permissionIds.length > 0) {
            await tx.roleHasPermission.createMany({
              data: permissionIds.map((pid) => ({ roleId: role.id, permissionId: pid })),
            });
          }
        }

        return role;
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('role@delete'))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await prisma.role.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Role not found.' });

      await prisma.role.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
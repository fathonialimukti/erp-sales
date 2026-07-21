import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createKnowledgeBaseSchema, updateKnowledgeBaseSchema, knowledgeBaseIdSchema } from '@repo/schemas/knowledge-base';

export const knowledgeBaseRouter = router({
  list: protectedProcedure
    .use(hasPermission('knowledge-base@read'))
    .input(createListInputSchema())
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where = buildTextSearchWhere(input?.search, ['title', 'content', 'source'] as const);

      const [data, total] = await Promise.all([
        prisma.knowledgeChunk.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.knowledgeChunk.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('knowledge-base@read'))
    .input(knowledgeBaseIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.knowledgeChunk.findUnique({ where: { id: input.id } });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Knowledge entry not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('knowledge-base@create'))
    .input(createKnowledgeBaseSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.knowledgeChunk.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'knowledge-base',
        resourceId: created.id,
        message: `Created knowledge entry ${created.title}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('knowledge-base@update'))
    .input(updateKnowledgeBaseSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.knowledgeChunk.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Knowledge entry not found.' });

      const updated = await prisma.knowledgeChunk.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'knowledge-base',
        resourceId: updated.id,
        message: `Updated knowledge entry ${updated.title}`,
        detail: buildUpdateLogDetail(existing as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('knowledge-base@delete'))
    .input(knowledgeBaseIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.knowledgeChunk.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Knowledge entry not found.' });

      await prisma.knowledgeChunk.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'knowledge-base',
        resourceId: existing.id,
        message: `Deleted knowledge entry ${existing.title}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});

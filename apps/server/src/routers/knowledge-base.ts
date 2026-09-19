import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import {
  clearChunkEmbedding,
  embedKnowledgeChunkBestEffort,
  setChunkEmbeddingStatus,
} from '../lib/ai-embedding.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere, createListInputSchema } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
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
        detail: buildCreateLogDetail(created),
      });

      // Mark pending before fire-and-forget embed — never fail the mutation.
      try { await setChunkEmbeddingStatus(created.id, 'pending'); } catch (e) { logger.warn('[embedding] set pending failed', { error: e instanceof Error ? e.message : String(e) }); }
      // Best-effort hybrid RAG embedding — never fail the mutation.
      void embedKnowledgeChunkBestEffort(ctx.db, created.id, created.title, created.content);

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
        detail: buildUpdateLogDetail(existing, updated),
      });

      const contentChanged =
        updated.title !== existing.title || updated.content !== existing.content;
      if (contentChanged) {
        // Drop stale vector first so failed re-embed cannot rank old content.
        try {
          await clearChunkEmbedding(updated.id);
        } catch (err) {
          logger.warn(`[embedding] clear failed for knowledge chunk ${updated.id}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
        // Mark pending before fire-and-forget re-embed — never fail the mutation.
        try { await setChunkEmbeddingStatus(updated.id, 'pending'); } catch (e) { logger.warn('[embedding] set pending failed', { error: e instanceof Error ? e.message : String(e) }); }
        // Best-effort re-embed — never fail the mutation.
        void embedKnowledgeChunkBestEffort(ctx.db, updated.id, updated.title, updated.content);
      }

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
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),

  reembed: protectedProcedure
    .use(hasPermission('knowledge-base@update'))
    .input(knowledgeBaseIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.knowledgeChunk.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Knowledge entry not found.' });

      // Mark pending before fire-and-forget re-embed — never fail the mutation.
      try { await setChunkEmbeddingStatus(existing.id, 'pending'); } catch (e) { logger.warn('[embedding] set pending failed', { error: e instanceof Error ? e.message : String(e) }); }
      // Best-effort re-embed — never fail the mutation.
      void embedKnowledgeChunkBestEffort(ctx.db, existing.id, existing.title, existing.content);

      return { success: true };
    }),
});

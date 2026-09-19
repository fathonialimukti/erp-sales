import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { getBudgetLineSummary } from '../lib/budget-calc.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createBudgetLineSchema, updateBudgetLineSchema, budgetLineIdSchema, budgetLineListInputSchema } from '@repo/schemas/budget-line';
import { Prisma } from '../prisma/generated/client';

const budgetLineIncludes = {
  budgetType: { select: { id: true, name: true } },
  period: { select: { id: true, name: true, code: true } },
  region: { select: { id: true, name: true } },
  area: { select: { id: true, name: true } },
} as const;

// Scope rule: REGION → regionId, AREA → areaId. Schema already refines this,
// but enforce again server-side against stale/foreign client input.
export function assertScopeTargets(input: { scope: string; regionId?: string | undefined; areaId?: string | undefined }) {
  if (input.scope === 'REGION' && !input.regionId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'regionId is required when scope is REGION.' });
  }
  if (input.scope === 'AREA' && !input.areaId) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'areaId is required when scope is AREA.' });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

/**
 * The @@unique([budgetTypeId, periodId, scope, regionId, areaId]) index is NULLS
 * DISTINCT in Postgres — every row NULLs one scope id, so the index never fires.
 * Explicit pre-insert dedupe (P2002 catch below stays as a backstop). Scope ids
 * are guaranteed present by assertScopeTargets(); the ! is safe there.
 */
export async function assertNoDuplicateBudgetLine(
  input: {
    budgetTypeId: string;
    periodId: string;
    scope: 'REGION' | 'AREA';
    regionId?: string | undefined;
    areaId?: string | undefined;
  },
  excludeId?: string,
): Promise<void> {
  const duplicate = await prisma.budgetLine.findFirst({
    where: {
      budgetTypeId: input.budgetTypeId,
      periodId: input.periodId,
      scope: input.scope,
      ...(input.scope === 'REGION'
        ? { regionId: input.regionId!, areaId: null } // non-null: REGION requires regionId
        : { areaId: input.areaId!, regionId: null }), // non-null: AREA requires areaId
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (duplicate) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Budget line already exists for this type/period/scope.' });
  }
}

export const budgetLineRouter = router({
  list: protectedProcedure
    .use(hasPermission('budget-line@read'))
    .input(budgetLineListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['id', 'name', 'code'] as const);

      const where = {
        ...(searchWhere ?? {}),
        ...(input?.budgetTypeId ? { budgetTypeId: input.budgetTypeId } : {}),
        ...(input?.periodId ? { periodId: input.periodId } : {}),
        ...(input?.scope ? { scope: input.scope } : {}),
        ...(input?.regionId ? { regionId: input.regionId } : {}),
        ...(input?.areaId ? { areaId: input.areaId } : {}),
      };

      const [data, total] = await Promise.all([
        prisma.budgetLine.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            ...budgetLineIncludes,
            _count: { select: { actionPrograms: true, eventProposals: true } },
          },
        }),
        prisma.budgetLine.count({ where }),
      ]);

      const rows = await Promise.all(
        data.map(async (line) => ({
          ...line,
          summary: await getBudgetLineSummary(prisma, line.id),
        })),
      );

      return { data: rows, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('budget-line@read'))
    .input(budgetLineIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.budgetLine.findUnique({
        where: { id: input.id },
        include: {
          ...budgetLineIncludes,
          actionPrograms: { select: { id: true, name: true, plannedCost: true, approvalStatus: true } },
          eventProposals: { select: { id: true, name: true, plannedCost: true, approvalStatus: true } },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget line not found.' });

      return {
        ...record,
        summary: await getBudgetLineSummary(prisma, record.id),
      };
    }),

  create: protectedProcedure
    .use(hasPermission('budget-line@create'))
    .input(createBudgetLineSchema)
    .mutation(async ({ input, ctx }) => {
      assertScopeTargets(input);
      await assertNoDuplicateBudgetLine(input);

      let created;
      try {
        created = await prisma.budgetLine.create({
          data: {
            budgetTypeId: input.budgetTypeId,
            periodId: input.periodId,
            scope: input.scope,
            ...(input.regionId !== undefined ? { regionId: input.regionId } : {}),
            ...(input.areaId !== undefined ? { areaId: input.areaId } : {}),
            amount: input.amount,
            ...(input.currency !== undefined ? { currency: input.currency } : {}),
          },
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Budget line already exists for this type/period/scope.' });
        }
        throw err;
      }

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'budget_line',
        resourceId: created.id,
        message: `Created budget line ${created.scope} ${created.amount}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('budget-line@update'))
    .input(updateBudgetLineSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      assertScopeTargets(data);

      const existing = await prisma.budgetLine.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget line not found.' });

      await assertNoDuplicateBudgetLine(data, currentId);

      let updated;
      try {
        updated = await prisma.budgetLine.update({
          where: { id: currentId },
          data: {
            budgetTypeId: data.budgetTypeId,
            periodId: data.periodId,
            scope: data.scope,
            ...(data.regionId !== undefined ? { regionId: data.regionId } : {}),
            ...(data.areaId !== undefined ? { areaId: data.areaId } : {}),
            amount: data.amount,
            ...(data.currency !== undefined ? { currency: data.currency } : {}),
          },
        });
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Budget line already exists for this type/period/scope.' });
        }
        throw err;
      }

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'budget_line',
        resourceId: updated.id,
        message: `Updated budget line ${updated.scope} ${updated.amount}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('budget-line@delete'))
    .input(budgetLineIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.budgetLine.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget line not found.' });

      await prisma.budgetLine.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'budget_line',
        resourceId: existing.id,
        message: `Deleted budget line ${existing.scope}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),
});

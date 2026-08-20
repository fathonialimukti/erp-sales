import { TRPCError } from '@trpc/server';
import type { Prisma } from '../prisma/generated/client';
import type { DbClient } from './prisma.js';

export interface BudgetLineSummary {
  allocated: number;
  committed: number;
  spent: number;
  remaining: number;
}

const sum = (values: Array<{ amount: Prisma.Decimal | number }>): number =>
  values.reduce((acc, v) => acc + Number(v.amount), 0);

/**
 * Compute remaining-budget summary for a budget line.
 *
 *   remaining = allocated − committed − spent
 *   committed = Σ plannedCost of APPROVED programs/proposals on the line
 *   spent     = Σ ActionProgramPayment + EventProposalPayment + EventVendorPayment
 *
 * Kept simple on purpose: nested payment aggregates use findMany + reduce in JS
 * (Prisma has no nested _sum on relations).
 */
export async function getBudgetLineSummary(
  db: DbClient,
  lineId: string,
): Promise<BudgetLineSummary> {
  const line = await db.budgetLine.findUnique({
    where: { id: lineId },
    select: { amount: true },
  });
  if (!line) return { allocated: 0, committed: 0, spent: 0, remaining: 0 };

  const [committedPrograms, committedProposals, programPayments, proposalPayments, vendorPayments] =
    await Promise.all([
      db.actionProgram.aggregate({
        _sum: { plannedCost: true },
        where: { budgetLineId: lineId, approvalStatus: 'APPROVED' },
      }),
      db.eventProposal.aggregate({
        _sum: { plannedCost: true },
        where: { budgetLineId: lineId, approvalStatus: 'APPROVED' },
      }),
      db.actionProgram.findMany({
        where: { budgetLineId: lineId },
        select: { payments: { select: { amount: true } } },
      }),
      db.eventProposal.findMany({
        where: { budgetLineId: lineId },
        select: { payments: { select: { amount: true } } },
      }),
      db.eventProposal.findMany({
        where: { budgetLineId: lineId },
        select: { vendors: { select: { payments: { select: { amount: true } } } } },
      }),
    ]);

  const allocated = Number(line.amount);
  const committed =
    Number(committedPrograms._sum.plannedCost ?? 0) +
    Number(committedProposals._sum.plannedCost ?? 0);
  const spent =
    sum(programPayments.flatMap((p) => p.payments)) +
    sum(proposalPayments.flatMap((p) => p.payments)) +
    sum(vendorPayments.flatMap((p) => p.vendors.flatMap((v) => v.payments)));

  return { allocated, committed, spent, remaining: allocated - committed - spent };
}

/**
 * Σ outlet.cost + Σ item.cost + Σ sku.cost — the planned cost of an action program.
 */
export function computeActionProgramPlannedCost(input: {
  outlets: Array<{ cost: number }>;
  items: Array<{ cost: number }>;
  skus: Array<{ cost: number }>;
}): number {
  const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);
  return sum(input.outlets.map((o) => o.cost)) + sum(input.items.map((i) => i.cost)) + sum(input.skus.map((s) => s.cost));
}

/**
 * Σ sku.total + Σ misc.total (recomputed qty × price) + Σ vendor.amount — the
 * planned cost of an event proposal.
 */
export function computeEventProposalPlannedCost(input: {
  skus: Array<{ total: number }>;
  miscItems: Array<{ quantity: number; price: number }>;
  vendors: Array<{ amount: number }>;
}): number {
  const sum = (values: number[]) => values.reduce((acc, v) => acc + v, 0);
  return (
    sum(input.skus.map((s) => s.total)) +
    sum(input.miscItems.map((m) => m.quantity * m.price)) +
    sum(input.vendors.map((v) => v.amount))
  );
}

/**
 * Validate that a program/proposal can be committed to a budget line:
 * scope must match the program's area, and committed-other + plannedCost must
 * not exceed the line's allocated amount. Throws TRPCError BAD_REQUEST otherwise.
 */
export async function assertBudgetCapacity(
  db: DbClient,
  input: { lineId: string; areaId: string; plannedCost: number; excludeId?: string },
): Promise<void> {
  const line = await db.budgetLine.findUnique({
    where: { id: input.lineId },
    include: { area: true, region: true },
  });
  if (!line) throw new TRPCError({ code: 'NOT_FOUND', message: 'Budget line not found.' });

  if (line.scope === 'AREA') {
    if (line.areaId !== input.areaId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Budget line scope does not match program area' });
    }
  } else if (line.scope === 'REGION') {
    const area = await db.area.findUnique({ where: { id: input.areaId } });
    if (!area || area.regionId !== line.regionId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Budget line scope does not match program area' });
    }
  }

  const [committedPrograms, committedProposals] = await Promise.all([
    db.actionProgram.aggregate({
      _sum: { plannedCost: true },
      where: {
        budgetLineId: input.lineId,
        approvalStatus: 'APPROVED',
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
    }),
    db.eventProposal.aggregate({
      _sum: { plannedCost: true },
      where: {
        budgetLineId: input.lineId,
        approvalStatus: 'APPROVED',
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      },
    }),
  ]);

  const committedOther =
    Number(committedPrograms._sum.plannedCost ?? 0) + Number(committedProposals._sum.plannedCost ?? 0);
  if (committedOther + input.plannedCost > Number(line.amount)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Budget line over-allocated' });
  }
}

/**
 * Reject a payment that would push spent beyond the line's remaining budget.
 * committed here = ALL approved programs/proposals on the line (via summary).
 *
 * excludePaymentAmount: update flows delete + recreate a program/proposal's
 * payments, so the summary's spent already includes the ones being replaced —
 * subtract them to avoid a double count that over-rejects.
 */
export async function assertPaymentWithinBudget(
  db: DbClient,
  input: { lineId: string; paymentAmount: number; excludePaymentAmount?: number },
): Promise<void> {
  const summary = await getBudgetLineSummary(db, input.lineId);
  const spentOther = summary.spent - (input.excludePaymentAmount ?? 0);
  if (summary.allocated - summary.committed - spentOther - input.paymentAmount < 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Budget line over-allocated' });
  }
}

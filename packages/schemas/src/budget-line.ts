import * as z from 'zod';
import { createListInputSchema } from './common';

const budgetLineScopeSchema = z.enum(['REGION', 'AREA']);

export const budgetLineListInputSchema = createListInputSchema({
  budgetTypeId: z.string().optional(),
  periodId: z.string().optional(),
  scope: budgetLineScopeSchema.optional(),
  regionId: z.string().optional(),
  areaId: z.string().optional(),
});

// Scope presence rule: REGION requires regionId, AREA requires areaId.
const checkScopeId = (
  data: { scope: 'REGION' | 'AREA'; regionId?: string | undefined; areaId?: string | undefined },
  ctx: z.RefinementCtx,
) => {
  if (data.scope === 'REGION' && !data.regionId) {
    ctx.addIssue({
      code: 'custom',
      path: ['regionId'],
      message: 'regionId is required when scope is REGION',
    });
  }
  if (data.scope === 'AREA' && !data.areaId) {
    ctx.addIssue({
      code: 'custom',
      path: ['areaId'],
      message: 'areaId is required when scope is AREA',
    });
  }
};

const budgetLineFields = {
  budgetTypeId: z.string().min(1, 'Budget type is required'),
  periodId: z.string().min(1, 'Budget period is required'),
  scope: budgetLineScopeSchema,
  regionId: z.string().optional(),
  areaId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().optional(),
} as const;

export const createBudgetLineSchema = z.object(budgetLineFields).superRefine(checkScopeId);

export const updateBudgetLineSchema = z
  .object({
    currentId: z.string(),
    ...budgetLineFields,
  })
  .superRefine(checkScopeId);

export const budgetLineIdSchema = z.object({
  id: z.string(),
});

export type CreateBudgetLineInput = z.infer<typeof createBudgetLineSchema>;
export type UpdateBudgetLineInput = z.infer<typeof updateBudgetLineSchema>;
export type BudgetLineIdInput = z.infer<typeof budgetLineIdSchema>;

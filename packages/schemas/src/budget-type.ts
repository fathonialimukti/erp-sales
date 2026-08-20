import * as z from 'zod';
import { createListInputSchema } from './common';

export const budgetTypeListInputSchema = createListInputSchema();

export const createBudgetTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const updateBudgetTypeSchema = z.object({
  currentId: z.string(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const budgetTypeIdSchema = z.object({
  id: z.string(),
});

export type CreateBudgetTypeInput = z.infer<typeof createBudgetTypeSchema>;
export type UpdateBudgetTypeInput = z.infer<typeof updateBudgetTypeSchema>;
export type BudgetTypeIdInput = z.infer<typeof budgetTypeIdSchema>;

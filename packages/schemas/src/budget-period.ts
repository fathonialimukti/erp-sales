import * as z from 'zod';
import { createListInputSchema } from './common';

export const budgetPeriodListInputSchema = createListInputSchema();

export const createBudgetPeriodSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.string().default('OPEN'),
});

export const updateBudgetPeriodSchema = z.object({
  currentId: z.string(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  status: z.string().optional(),
});

export const budgetPeriodIdSchema = z.object({
  id: z.string(),
});

export type CreateBudgetPeriodInput = z.infer<typeof createBudgetPeriodSchema>;
export type UpdateBudgetPeriodInput = z.infer<typeof updateBudgetPeriodSchema>;
export type BudgetPeriodIdInput = z.infer<typeof budgetPeriodIdSchema>;

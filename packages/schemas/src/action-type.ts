import * as z from 'zod';
import { createListInputSchema } from './common';

export const actionTypeListInputSchema = createListInputSchema();

export const createActionTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const updateActionTypeSchema = z.object({
  currentId: z.string(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const actionTypeIdSchema = z.object({
  id: z.string(),
});

export type CreateActionTypeInput = z.infer<typeof createActionTypeSchema>;
export type UpdateActionTypeInput = z.infer<typeof updateActionTypeSchema>;
export type ActionTypeIdInput = z.infer<typeof actionTypeIdSchema>;

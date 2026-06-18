import { z } from 'zod';
import { createListInputSchema } from './common';

export const actionProgramListInputSchema = createListInputSchema({
  areaId: z.string().optional(),
  approvalStatus: z.string().optional(),
  type: z.string().optional(),
});

// --- Payment sub-record ---
export const actionProgramPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// --- Create ---
export const createActionProgramSchema = z.object({
  documentNumber: z.string().optional(),
  name: z.string().min(1, 'Program name is required'),
  type: z.string().min(1, 'Program type is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budgetAmount: z.number().positive().optional().nullable(),
  budgetCurrency: z.string().default('IDR'),
  rules: z.any().optional(),
  areaId: z.string().min(1, 'Area is required'),
  picId: z.string().min(1, 'PIC is required'),
  outletIds: z.array(z.string()).min(1, 'At least one outlet is required'),
  skuIds: z.array(z.string()).optional().default([]),
  payments: z.array(actionProgramPaymentSchema).optional().default([]),
});

// --- Update ---
export const updateActionProgramSchema = z.object({
  currentId: z.string(),
  documentNumber: z.string().optional(),
  name: z.string().min(1, 'Program name is required'),
  type: z.string().min(1, 'Program type is required'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  budgetAmount: z.number().positive().optional().nullable(),
  budgetCurrency: z.string(),
  rules: z.any().optional(),
  areaId: z.string().min(1, 'Area is required'),
  picId: z.string().min(1, 'PIC is required'),
  outletIds: z.array(z.string()).min(1, 'At least one outlet is required'),
  skuIds: z.array(z.string()).optional().default([]),
  payments: z.array(actionProgramPaymentSchema).optional().default([]),
});

export const actionProgramIdSchema = z.object({
  id: z.string(),
});

export type ActionProgramPaymentInput = z.infer<typeof actionProgramPaymentSchema>;
export type CreateActionProgramInput = z.infer<typeof createActionProgramSchema>;
export type UpdateActionProgramInput = z.infer<typeof updateActionProgramSchema>;
export type ActionProgramIdInput = z.infer<typeof actionProgramIdSchema>;
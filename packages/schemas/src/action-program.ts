import * as z from 'zod';
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

// --- SKU sub-record (rich model with pricing) ---
export const actionProgramSkuInputSchema = z.object({
  skuId: z.string().min(1, 'SKU is required'),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().nonnegative('Price must be non-negative'),
  discount: z.number().nonnegative('Discount must be non-negative').default(0),
  priceAfterDiscount: z.number().nonnegative('Price after discount must be non-negative'),
  cost: z.number().nonnegative('Cost must be non-negative'),
  tax: z.number().nonnegative('Tax must be non-negative').default(0),
  total: z.number().nonnegative('Total must be non-negative'),
  notes: z.string().optional(),
});

// --- Item sub-record (non-SKU items like banners, materials) ---
export const actionProgramItemInputSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().nonnegative('Price must be non-negative'),
  cost: z.number().nonnegative('Cost must be non-negative'),
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
  budgetCurrency: z.string().default('IDR'),
  rules: z.any().optional(),
  areaId: z.string().min(1, 'Area is required'),
  picId: z.string().min(1, 'PIC is required'),
  outletIds: z.array(z.string()).min(1, 'At least one outlet is required'),
  skus: z.array(actionProgramSkuInputSchema).optional().default([]),
  items: z.array(actionProgramItemInputSchema).optional().default([]),
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
  budgetCurrency: z.string(),
  rules: z.any().optional(),
  areaId: z.string().min(1, 'Area is required'),
  picId: z.string().min(1, 'PIC is required'),
  outletIds: z.array(z.string()).min(1, 'At least one outlet is required'),
  skus: z.array(actionProgramSkuInputSchema).optional().default([]),
  items: z.array(actionProgramItemInputSchema).optional().default([]),
  payments: z.array(actionProgramPaymentSchema).optional().default([]),
});

export const actionProgramIdSchema = z.object({
  id: z.string(),
});

export type ActionProgramPaymentInput = z.infer<typeof actionProgramPaymentSchema>;
export type ActionProgramSkuInput = z.infer<typeof actionProgramSkuInputSchema>;
export type ActionProgramItemInput = z.infer<typeof actionProgramItemInputSchema>;
export type CreateActionProgramInput = z.infer<typeof createActionProgramSchema>;
export type UpdateActionProgramInput = z.infer<typeof updateActionProgramSchema>;
export type ActionProgramIdInput = z.infer<typeof actionProgramIdSchema>;
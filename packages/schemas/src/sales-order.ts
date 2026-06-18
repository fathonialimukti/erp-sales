import { z } from 'zod';
import { createListInputSchema } from './common';

// --- Sales Order Item (used in form array) ---

export const salesOrderItemSchema = z.object({
  skuId: z.string().min(1, 'Product is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  taxPercent: z.number().min(0).max(100).optional().nullable(),
  lineTotal: z.number().positive('Line total must be positive'),
  notes: z.string().optional(),
});

// --- Sales Order Main ---

export const salesOrderListInputSchema = createListInputSchema({
  customerId: z.string().optional(),
  outletId: z.string().optional(),
  areaId: z.string().optional(),
  approvalStatus: z.string().optional(),
});

export const createSalesOrderSchema = z.object({
  documentNumber: z.string().optional(),
  date: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  outletId: z.string().optional().nullable(),
  areaId: z.string().min(1, 'Area is required'),
  currency: z.string().default('IDR'),
  paymentTerms: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().default('MANUAL'),
  subtotal: z.number().optional().nullable(),
  discountTotal: z.number().optional().nullable(),
  taxTotal: z.number().optional().nullable(),
  grandTotal: z.number().optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

export const updateSalesOrderSchema = z.object({
  currentId: z.string(),
  documentNumber: z.string().optional(),
  date: z.string().optional(),
  customerId: z.string().min(1, 'Customer is required'),
  outletId: z.string().optional().nullable(),
  areaId: z.string().min(1, 'Area is required'),
  currency: z.string(),
  paymentTerms: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  source: z.string(),
  subtotal: z.number().optional().nullable(),
  discountTotal: z.number().optional().nullable(),
  taxTotal: z.number().optional().nullable(),
  grandTotal: z.number().optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

export const salesOrderIdSchema = z.object({
  id: z.string(),
});

export type SalesOrderItemInput = z.infer<typeof salesOrderItemSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
export type SalesOrderIdInput = z.infer<typeof salesOrderIdSchema>;
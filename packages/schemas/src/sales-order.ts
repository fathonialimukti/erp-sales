import { TRPCError } from '@trpc/server';
import * as z from 'zod';
import { createListInputSchema } from './common';

// --- Carton helpers (SPEC §Line semantics / §Validation) ---
// quantity stays in pieces everywhere: on the wire, in storage, and in money
// math. The carton is the implicit order unit, derived as quantity / packSize.

/**
 * The one pack-size message, defined once so the server gate and the agent
 * tool surface (SPEC §2.1 reply) cannot drift apart.
 */
export function cartonErrorMessage(skuName: string, packSize: number): string {
  return `${skuName} is only sold per carton of ${packSize} pcs`;
}

/**
 * Whole-carton rule. Throws a BAD_REQUEST TRPCError when `quantity` is not a
 * positive whole multiple of `packSize`. The message names the sku and its pack
 * size so a rep (or a buyer reading the AI's reply) can correct it. This is the
 * single server-side gate: create/update call it, AI extraction calls it, so no
 * write path can persist a broken-carton line.
 */
export function assertCartonMultiple(quantity: number, packSize: number, skuName: string): void {
  if (quantity <= 0 || quantity % packSize !== 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: cartonErrorMessage(skuName, packSize),
    });
  }
}

/**
 * Derived carton count: `quantity / packSize`. Call after assertCartonMultiple
 * (or on a value already known carton-valid) — the pieces value is the stored
 * one, this is purely for display: form, SO detail, and PDF.
 */
export function cartonCount(quantity: number, packSize: number): number {
  return quantity / packSize;
}

/**
 * The two nearest carton-valid quantities to `quantity`: the largest multiple of
 * `packSize` at or below it, and the next one above it (SPEC §2.1 — the agent
 * quotes both so the buyer can pick one). Call with a positive `quantity`; the
 * lower bound is clamped at 0 so a non-positive input cannot yield a negative
 * "valid" multiple.
 */
export function nearestCartonMultiples(
  quantity: number,
  packSize: number,
): { lower: number; upper: number } {
  const cartonsBelow = Math.max(0, Math.floor(quantity / packSize));
  return {
    lower: cartonsBelow * packSize,
    upper: (cartonsBelow + 1) * packSize,
  };
}

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
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.enum(['createdAt', 'date', 'grandTotal', 'documentNumber']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const createSalesOrderSchema = z.object({
  documentNumber: z.string().optional(),
  date: z.string().optional(),
  outletId: z.string().min(1, 'Outlet is required'),
  currency: z.string().default('USD'),
  paymentTerms: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().default('MANUAL'),
  subtotal: z.number().optional().nullable(),
  discountTotal: z.number().optional().nullable(),
  taxTotal: z.number().optional().nullable(),
  grandTotal: z.number().optional().nullable(),
  actionProgramId: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

export const updateSalesOrderSchema = z.object({
  currentId: z.string(),
  documentNumber: z.string().optional(),
  date: z.string().optional(),
  outletId: z.string().min(1, 'Outlet is required'),
  currency: z.string(),
  paymentTerms: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  source: z.string(),
  subtotal: z.number().optional().nullable(),
  discountTotal: z.number().optional().nullable(),
  taxTotal: z.number().optional().nullable(),
  grandTotal: z.number().optional().nullable(),
  actionProgramId: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, 'At least one item is required'),
});

export const salesOrderIdSchema = z.object({
  id: z.string(),
});

export type SalesOrderItemInput = z.infer<typeof salesOrderItemSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type UpdateSalesOrderInput = z.infer<typeof updateSalesOrderSchema>;
export type SalesOrderIdInput = z.infer<typeof salesOrderIdSchema>;
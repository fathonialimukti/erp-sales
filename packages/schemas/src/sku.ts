import * as z from 'zod';
import { createListInputSchema } from './common';

export const skuListInputSchema = createListInputSchema({
  categoryId: z.string().optional(),
});

export const createSkuSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  basePrice: z.number().positive().optional().nullable(),
  baseUnit: z.string().default('pcs'),
  // pcs per carton; 1 = piece-only SKU (SPEC §Data model)
  packSize: z.number().int().min(1).default(1),
  status: z.string().default('ACTIVE'),
});

export const updateSkuSchema = z.object({
  currentId: z.string(),
  code: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  basePrice: z.number().positive().optional().nullable(),
  baseUnit: z.string(),
  // pcs per carton; 1 = piece-only SKU (SPEC §Data model)
  packSize: z.number().int().min(1).default(1),
  status: z.string(),
});

export const skuIdSchema = z.object({
  id: z.string(),
});

export type CreateSkuInput = z.infer<typeof createSkuSchema>;
export type UpdateSkuInput = z.infer<typeof updateSkuSchema>;
export type SkuIdInput = z.infer<typeof skuIdSchema>;
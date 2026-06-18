import { z } from 'zod';
import { createListInputSchema } from './common';

export const skuCategoryListInputSchema = createListInputSchema();

export const createSkuCategorySchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

export const updateSkuCategorySchema = z.object({
  currentId: z.string(),
  code: z.string().optional(),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

export const skuCategoryIdSchema = z.object({
  id: z.string(),
});

export type CreateSkuCategoryInput = z.infer<typeof createSkuCategorySchema>;
export type UpdateSkuCategoryInput = z.infer<typeof updateSkuCategorySchema>;
export type SkuCategoryIdInput = z.infer<typeof skuCategoryIdSchema>;
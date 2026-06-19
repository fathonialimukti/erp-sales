import { z } from 'zod';
import { createListInputSchema } from './common';

export const regionListInputSchema = createListInputSchema();

export const createRegionSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Region name is required'),
});

export const updateRegionSchema = z.object({
  currentId: z.string(),
  code: z.string().optional(),
  name: z.string().min(1, 'Region name is required'),
});

export const regionIdSchema = z.object({
  id: z.string(),
});

export type CreateRegionInput = z.infer<typeof createRegionSchema>;
export type UpdateRegionInput = z.infer<typeof updateRegionSchema>;
export type RegionIdInput = z.infer<typeof regionIdSchema>;
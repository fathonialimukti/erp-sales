import { z } from 'zod';
import { createListInputSchema } from './common';

export const areaListInputSchema = createListInputSchema({
  regionId: z.string().optional(),
});

export const createAreaSchema = z.object({
  regionId: z.string().min(1, 'Region is required'),
  code: z.string().optional(),
  name: z.string().min(1, 'Area name is required'),
});

export const updateAreaSchema = z.object({
  currentId: z.string(),
  regionId: z.string().min(1, 'Region is required'),
  code: z.string().optional(),
  name: z.string().min(1, 'Area name is required'),
});

export const areaIdSchema = z.object({
  id: z.string(),
});

export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type AreaIdInput = z.infer<typeof areaIdSchema>;
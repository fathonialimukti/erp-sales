import { z } from 'zod';
import { createListInputSchema } from './common';

export const outletListInputSchema = createListInputSchema({
  customerId: z.string().optional(),
  areaId: z.string().optional(),
});

export const createOutletSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  areaId: z.string().min(1, 'Area is required'),
  code: z.string().optional(),
  name: z.string().min(1, 'Outlet name is required'),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  status: z.string().default('ACTIVE'),
});

export const updateOutletSchema = z.object({
  currentId: z.string(),
  customerId: z.string().min(1, 'Customer is required'),
  areaId: z.string().min(1, 'Area is required'),
  code: z.string().optional(),
  name: z.string().min(1, 'Outlet name is required'),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  status: z.string().default('ACTIVE'),
});

export const outletIdSchema = z.object({
  id: z.string(),
});

export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;
export type OutletIdInput = z.infer<typeof outletIdSchema>;
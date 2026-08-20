import * as z from 'zod';
import { createListInputSchema } from './common';

export const vendorListInputSchema = createListInputSchema({
  status: z.string().optional(),
});

export const createVendorSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Vendor name is required'),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export const updateVendorSchema = z.object({
  currentId: z.string(),
  code: z.string().optional(),
  name: z.string().min(1, 'Vendor name is required'),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
});

export const vendorIdSchema = z.object({
  id: z.string(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type VendorIdInput = z.infer<typeof vendorIdSchema>;

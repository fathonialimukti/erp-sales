import * as z from 'zod';
import { createListInputSchema } from './common';

export const customerListInputSchema = createListInputSchema({});

export const createCustomerSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Customer name is required'),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().positive().optional().nullable(),
  status: z.string().default('ACTIVE'),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  currentId: z.string(),
  code: z.string().optional(),
  name: z.string().min(1, 'Customer name is required'),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  creditLimit: z.number().positive().optional().nullable(),
  status: z.string().default('ACTIVE'),
  billingAddress: z.string().optional(),
  notes: z.string().optional(),
});

export const customerIdSchema = z.object({
  id: z.string(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerIdInput = z.infer<typeof customerIdSchema>;
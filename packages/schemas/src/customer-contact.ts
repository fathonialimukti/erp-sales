import * as z from 'zod';

export const createCustomerContactSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  outletId: z.string().optional().nullable(),
  name: z.string().min(1, 'Contact name is required'),
  title: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const updateCustomerContactSchema = z.object({
  currentId: z.string(),
  customerId: z.string().min(1, 'Customer is required'),
  outletId: z.string().optional().nullable(),
  name: z.string().min(1, 'Contact name is required'),
  title: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const customerContactIdSchema = z.object({
  id: z.string(),
});

export type CreateCustomerContactInput = z.infer<typeof createCustomerContactSchema>;
export type UpdateCustomerContactInput = z.infer<typeof updateCustomerContactSchema>;
export type CustomerContactIdInput = z.infer<typeof customerContactIdSchema>;
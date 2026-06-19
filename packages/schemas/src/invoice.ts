import { z } from 'zod';
import { createListInputSchema } from './common';

export const invoiceListInputSchema = createListInputSchema({
  customerId: z.string().optional(),
  salesOrderId: z.string().optional(),
  status: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  documentNumber: z.string().optional(),
  salesOrderId: z.string().min(1, 'Sales order is required'),
  customerId: z.string().min(1, 'Customer is required'),
  date: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.string().default('DRAFT'),
  currency: z.string().default('IDR'),
  subtotal: z.number(),
  taxTotal: z.number(),
  grandTotal: z.number(),
  balanceDue: z.number(),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  currentId: z.string(),
  documentNumber: z.string().optional(),
  salesOrderId: z.string().min(1, 'Sales order is required'),
  customerId: z.string().min(1, 'Customer is required'),
  date: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.string(),
  currency: z.string(),
  subtotal: z.number(),
  taxTotal: z.number(),
  grandTotal: z.number(),
  balanceDue: z.number(),
  notes: z.string().optional(),
});

export const invoiceIdSchema = z.object({
  id: z.string(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type InvoiceIdInput = z.infer<typeof invoiceIdSchema>;
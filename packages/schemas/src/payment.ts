import { z } from 'zod';

export const createPaymentSchema = z.object({
  salesOrderId: z.string().min(1, 'Sales order is required'),
  customerId: z.string().min(1, 'Customer is required'),
  date: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const paymentIdSchema = z.object({
  id: z.string(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type PaymentIdInput = z.infer<typeof paymentIdSchema>;
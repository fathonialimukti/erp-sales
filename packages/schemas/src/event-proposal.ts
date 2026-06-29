import { z } from 'zod';
import { createListInputSchema } from './common';

export const eventProposalListInputSchema = createListInputSchema({
  areaId: z.string().optional(),
  approvalStatus: z.string().optional(),
});

// --- Payment sub-record ---
export const eventProposalPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// --- SKU sub-record (rich model with qty/price/tax) ---
export const eventProposalSkuInputSchema = z.object({
  skuId: z.string().min(1, 'SKU is required'),
  quantity: z.number().positive('Quantity must be positive'),
  price: z.number().nonnegative('Price must be non-negative'),
  tax: z.number().nonnegative('Tax must be non-negative').default(0),
  total: z.number().nonnegative('Total must be non-negative'),
  notes: z.string().optional(),
});

// --- Create ---
export const createEventProposalSchema = z.object({
  documentNumber: z.string().optional(),
  name: z.string().min(1, 'Event name is required'),
  eventType: z.string().optional(),
  description: z.string().optional(),
  venue: z.string().optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  eventEndDate: z.string().optional(),
  organizerName: z.string().optional(),
  organizerContact: z.string().optional(),
  areaId: z.string().min(1, 'Area is required'),
  observationDays: z.number().int().default(90),
  proposedBudget: z.number().positive().optional().nullable(),
  currency: z.string().default('IDR'),
  skus: z.array(eventProposalSkuInputSchema).optional().default([]),
  payments: z.array(eventProposalPaymentSchema).optional().default([]),
});

// --- Update ---
export const updateEventProposalSchema = z.object({
  currentId: z.string(),
  documentNumber: z.string().optional(),
  name: z.string().min(1, 'Event name is required'),
  eventType: z.string().optional(),
  description: z.string().optional(),
  venue: z.string().optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  eventEndDate: z.string().optional(),
  organizerName: z.string().optional(),
  organizerContact: z.string().optional(),
  areaId: z.string().min(1, 'Area is required'),
  observationDays: z.number().int().default(90),
  proposedBudget: z.number().positive().optional().nullable(),
  currency: z.string(),
  skus: z.array(eventProposalSkuInputSchema).optional().default([]),
  payments: z.array(eventProposalPaymentSchema).optional().default([]),
});

export const eventProposalIdSchema = z.object({
  id: z.string(),
});

export type EventProposalPaymentInput = z.infer<typeof eventProposalPaymentSchema>;
export type EventProposalSkuInput = z.infer<typeof eventProposalSkuInputSchema>;
export type CreateEventProposalInput = z.infer<typeof createEventProposalSchema>;
export type UpdateEventProposalInput = z.infer<typeof updateEventProposalSchema>;
export type EventProposalIdInput = z.infer<typeof eventProposalIdSchema>;
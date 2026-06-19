import { z } from 'zod';
import { createListInputSchema } from './common';

export const visitLogListInputSchema = createListInputSchema({
  salesmanId: z.string().optional(),
  outletId: z.string().optional(),
  approvalStatus: z.string().optional(),
});

export const createVisitLogSchema = z.object({
  salesmanId: z.string().min(1, 'Salesman is required'),
  outletId: z.string().min(1, 'Outlet is required'),
  date: z.string().min(1, 'Date is required'),
  checkInAt: z.string().optional(),
  checkOutAt: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  photos: z.any().optional(),
  feedback: z.string().optional(),
  salesOrderId: z.string().optional().nullable(),
});

export const updateVisitLogSchema = z.object({
  currentId: z.string(),
  salesmanId: z.string().min(1, 'Salesman is required'),
  outletId: z.string().min(1, 'Outlet is required'),
  date: z.string().min(1, 'Date is required'),
  checkInAt: z.string().optional(),
  checkOutAt: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
  photos: z.any().optional(),
  feedback: z.string().optional(),
  salesOrderId: z.string().optional().nullable(),
});

export const visitLogIdSchema = z.object({
  id: z.string(),
});

export type CreateVisitLogInput = z.infer<typeof createVisitLogSchema>;
export type UpdateVisitLogInput = z.infer<typeof updateVisitLogSchema>;
export type VisitLogIdInput = z.infer<typeof visitLogIdSchema>;
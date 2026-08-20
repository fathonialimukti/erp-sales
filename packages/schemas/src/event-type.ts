import * as z from 'zod';
import { createListInputSchema } from './common';

export const eventTypeListInputSchema = createListInputSchema();

export const createEventTypeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const updateEventTypeSchema = z.object({
  currentId: z.string(),
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const eventTypeIdSchema = z.object({
  id: z.string(),
});

export type CreateEventTypeInput = z.infer<typeof createEventTypeSchema>;
export type UpdateEventTypeInput = z.infer<typeof updateEventTypeSchema>;
export type EventTypeIdInput = z.infer<typeof eventTypeIdSchema>;

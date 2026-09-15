import * as z from 'zod';
import { createListInputSchema } from './common';

// Contract levels are lowercase; the AppLog table stores uppercase
// (DEBUG|INFO|WARN|ERROR). The router maps between the two.
export const applicationLogLevelSchema = z.enum(['info', 'warn', 'error', 'debug']);

export const listApplicationLogSchema = createListInputSchema({
  level: applicationLogLevelSchema.optional(),
  source: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const applicationLogIdSchema = z.object({
  id: z.string(),
});

// Read-model shape returned by trpcClient.applicationLog.{list, detail}:
// `source` maps to AppLog.module, `meta` maps to AppLog.detail.
export const applicationLogSchema = z.object({
  id: z.string(),
  level: applicationLogLevelSchema,
  message: z.string(),
  meta: z.unknown().optional(),
  source: z.string().optional(),
  createdAt: z.date(),
});

export type ApplicationLogLevel = z.infer<typeof applicationLogLevelSchema>;
export type ListApplicationLogInput = z.infer<typeof listApplicationLogSchema>;
export type ApplicationLogIdInput = z.infer<typeof applicationLogIdSchema>;
export type ApplicationLog = z.infer<typeof applicationLogSchema>;

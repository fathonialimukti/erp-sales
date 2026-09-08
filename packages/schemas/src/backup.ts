import * as z from 'zod';
import { createListInputSchema } from './common';

export const backupListInputSchema = createListInputSchema();

export const backupIdInputSchema = z.object({
  id: z.string().min(1),
});

export const backupCreateInputSchema = z.object({
  note: z.string().max(200).optional(),
});

export const backupEnvelopeSchema = z.object({
  meta: z.object({
    schemaVersion: z.string(),
    createdAt: z.string(),
    tableCounts: z.record(z.string(), z.number()),
  }),
  data: z.record(z.string(), z.array(z.unknown())),
});

export type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>;

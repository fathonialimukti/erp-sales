import * as z from 'zod';

// Field definition for a form-request widget (SPEC §3)
export const chatWidgetFieldSchema = z
  .object({
    key: z.string().min(1), // identifier returned in values
    label: z.string().min(1), // already-localized by the AI at generation time
    type: z.enum(['text', 'textarea', 'number', 'select', 'date', 'checkbox']),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(), // select only
    placeholder: z.string().optional(),
  })
  .refine((v) => v.type !== 'select' || (v.options?.length ?? 0) > 0, {
    message: 'select fields must carry options (min 1)',
  });

// form-request widget (stored on assistant message)
export const chatFormRequestWidgetSchema = z.object({
  type: z.literal('form-request'),
  id: z.string().ulid(), // widget id
  title: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(chatWidgetFieldSchema).min(1),
  status: z.enum(['pending', 'submitted', 'cancelled']).default('pending'),
});

// confirm-action widget (stored on assistant message)
export const chatConfirmActionWidgetSchema = z
  .object({
    type: z.literal('confirm-action'),
    id: z.string().ulid(),
    title: z.string().min(1),
    description: z.string().optional(),
    action: z.object({
      kind: z.literal('run-sql'),
      sql: z.string().min(1),
      readOnly: z.boolean(),
    }),
    requiresBackupAck: z.boolean(), // true for writes, false for reads
    confirmationId: z.string().ulid(), // links to the server-side gate record (§4)
    status: z.enum(['pending', 'confirmed', 'rejected', 'executed', 'failed']).default('pending'),
  })
  .refine((v) => v.requiresBackupAck || v.action.readOnly, {
    message: 'requiresBackupAck: false requires action.readOnly: true',
  });

// widget union stored on assistant messages
export const chatWidgetSchema = z.discriminatedUnion('type', [
  chatFormRequestWidgetSchema,
  chatConfirmActionWidgetSchema,
]);

// user turn payloads
export const chatFormResponseSchema = z.object({
  widgetId: z.string(),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export const chatConfirmationSchema = z.object({
  widgetId: z.string(),
  confirmationId: z.string(),
  decision: z.enum(['confirm', 'reject']),
});

// execution result snapshot (SPEC §6) — stored on the gate record and fed back to the AI
export const chatActionResultSchema = z.object({
  confirmationId: z.string(),
  status: z.enum(['executed', 'failed']),
  sql: z.string(), // echo of the exact executed SQL
  rowCount: z.number().optional(), // affected (write) or returned (select)
  rows: z.array(z.unknown()).optional(), // select only: first 20 rows, values truncated
  truncated: z.boolean(), // more rows existed than shown
  error: z
    .object({
      message: z.string().min(1),
      rolledBack: z.literal(true),
    })
    .optional(),
  durationMs: z.number(),
});

export type ChatWidgetField = z.infer<typeof chatWidgetFieldSchema>;
export type ChatFormRequestWidget = z.infer<typeof chatFormRequestWidgetSchema>;
export type ChatConfirmActionWidget = z.infer<typeof chatConfirmActionWidgetSchema>;
export type ChatWidget = z.infer<typeof chatWidgetSchema>;
export type ChatFormResponse = z.infer<typeof chatFormResponseSchema>;
export type ChatConfirmation = z.infer<typeof chatConfirmationSchema>;
export type ChatActionResult = z.infer<typeof chatActionResultSchema>;

import * as z from 'zod';
import { createListInputSchema } from './common';

export const emailConversationStatusSchema = z.enum(['OPEN', 'PENDING', 'RESOLVED', 'SPAM']);
export const emailConversationPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const emailMessageDirectionSchema = z.enum(['INBOUND', 'OUTBOUND']);

export const emailCrmListInputSchema = createListInputSchema({
  status: emailConversationStatusSchema.optional(),
  priority: emailConversationPrioritySchema.optional(),
  customerId: z.string().optional(),
});

export const createEmailConversationSchema = z.object({
  email: z.email(),
  subject: z.string().optional(),
  status: emailConversationStatusSchema.default('OPEN'),
  priority: emailConversationPrioritySchema.default('NORMAL'),
  sentiment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customerId: z.string().optional().nullable(),
});

export const updateEmailConversationSchema = z.object({
  currentId: z.string(),
  email: z.email().optional(),
  subject: z.string().optional().nullable(),
  status: emailConversationStatusSchema.optional(),
  priority: emailConversationPrioritySchema.optional(),
  sentiment: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  customerId: z.string().optional().nullable(),
});

export const emailConversationIdSchema = z.object({
  id: z.string(),
});

export const createEmailMessageSchema = z.object({
  conversationId: z.string(),
  body: z.string().min(1),
  direction: emailMessageDirectionSchema.default('OUTBOUND'),
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
});

export const emailInboundPayloadSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  messageId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.string().optional(),
  date: z.string().optional(),
  rawSize: z.number().optional(),
});

export const suggestEmailReplySchema = z.object({
  conversationId: z.string(),
  instruction: z.string().optional(),
  save: z.boolean().optional().default(false),
});

export const createDraftOrderFromEmailSchema = z.object({
  conversationId: z.string(),
  outletId: z.string(),
  items: z
    .array(
      z.object({
        skuId: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
      }),
    )
    .min(1),
  notes: z.string().optional(),
});

export const sendEmailMessageSchema = z
  .object({
    conversationId: z.string(),
    body: z.string().min(1).optional(),
    htmlBody: z.string().min(1).optional(),
    subject: z.string().optional(),
  })
  .refine((v) => Boolean(v.body?.trim() || v.htmlBody?.trim()), {
    message: 'body or htmlBody required',
  });

export const retryEmailAgentSchema = z.object({
  conversationId: z.string(),
});

export type CreateEmailConversationInput = z.infer<typeof createEmailConversationSchema>;
export type UpdateEmailConversationInput = z.infer<typeof updateEmailConversationSchema>;
export type EmailInboundPayload = z.infer<typeof emailInboundPayloadSchema>;
export type CreateDraftOrderFromEmailInput = z.infer<typeof createDraftOrderFromEmailSchema>;
export type SendEmailMessageInput = z.infer<typeof sendEmailMessageSchema>;
export type RetryEmailAgentInput = z.infer<typeof retryEmailAgentSchema>;

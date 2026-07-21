import * as z from 'zod';
import { createListInputSchema } from './common';

export const knowledgeBaseListInputSchema = createListInputSchema();

export const createKnowledgeBaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  source: z.string().min(1, 'Source is required'),
});

export const updateKnowledgeBaseSchema = z.object({
  currentId: z.string(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  source: z.string().min(1, 'Source is required'),
});

export const knowledgeBaseIdSchema = z.object({
  id: z.string(),
});

export type CreateKnowledgeBaseInput = z.infer<typeof createKnowledgeBaseSchema>;
export type UpdateKnowledgeBaseInput = z.infer<typeof updateKnowledgeBaseSchema>;
export type KnowledgeBaseIdInput = z.infer<typeof knowledgeBaseIdSchema>;

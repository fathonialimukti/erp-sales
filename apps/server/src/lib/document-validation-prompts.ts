import { z } from 'zod';

export const aiValidationResultSchema = z.object({
  valid: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  analysis: z.string(),
});

export type AiValidationResult = z.infer<typeof aiValidationResultSchema>;

export interface DocumentValidationContext {
  documentType: string;
  documentNumber?: string | null;
  documentData: Record<string, unknown>;
  lineItems?: Array<Record<string, unknown>>;
  financialSummary?: {
    subtotal?: number | null;
    discountTotal?: number | null;
    taxTotal?: number | null;
    grandTotal?: number | null;
  };
}

export interface DocumentValidationPrompt {
  systemPrompt: string;
  buildUserPrompt: (context: DocumentValidationContext) => string;
  validationCriteria: string[];
}

/**
 * Sales Order validation prompt
 */
export const salesOrderValidationPrompt: DocumentValidationPrompt = {
  systemPrompt: `You are an AI validation agent. Analyze the document and provide validation results.

Check for:
1. Data completeness
2. Reasonable values
3. Logical consistency

Provide structured output with: valid, score (0-100), issues, recommendations, riskLevel (LOW/MEDIUM/HIGH), analysis.`,

  buildUserPrompt: (context) => {
    return `Validate this sales order:
${JSON.stringify(context.documentData, null, 2)}

Line items: ${JSON.stringify(context.lineItems, null, 2)}
Financial summary: ${JSON.stringify(context.financialSummary, null, 2)}`;
  },

  validationCriteria: ['Data completeness', 'Reasonable values', 'Logical consistency'],
};

/**
 * Action Program validation prompt
 */
export const actionProgramValidationPrompt: DocumentValidationPrompt = {
  systemPrompt: `You are an AI validation agent. Analyze the document and provide validation results.

Check for:
1. Data completeness
2. Reasonable values
3. Logical consistency

Provide structured output with: valid, score (0-100), issues, recommendations, riskLevel (LOW/MEDIUM/HIGH), analysis.`,

  buildUserPrompt: (context) => {
    return `Validate this action program:
${JSON.stringify(context.documentData, null, 2)}

Items: ${JSON.stringify(context.lineItems, null, 2)}`;
  },

  validationCriteria: ['Data completeness', 'Reasonable values', 'Logical consistency'],
};

/**
 * Event Proposal validation prompt
 */
export const eventProposalValidationPrompt: DocumentValidationPrompt = {
  systemPrompt: `You are an AI validation agent. Analyze the document and provide validation results.

Check for:
1. Data completeness
2. Reasonable values
3. Logical consistency

Provide structured output with: valid, score (0-100), issues, recommendations, riskLevel (LOW/MEDIUM/HIGH), analysis.`,

  buildUserPrompt: (context) => {
    return `Validate this event proposal:
${JSON.stringify(context.documentData, null, 2)}

Items: ${JSON.stringify(context.lineItems, null, 2)}`;
  },

  validationCriteria: ['Data completeness', 'Reasonable values', 'Logical consistency'],
};

/**
 * Visit Log validation prompt
 */
export const visitLogValidationPrompt: DocumentValidationPrompt = {
  systemPrompt: `You are an AI validation agent. Analyze the document and provide validation results.

Check for:
1. Data completeness
2. Reasonable values
3. Logical consistency

Provide structured output with: valid, score (0-100), issues, recommendations, riskLevel (LOW/MEDIUM/HIGH), analysis.`,

  buildUserPrompt: (context) => {
    return `Validate this visit log:
${JSON.stringify(context.documentData, null, 2)}`;
  },

  validationCriteria: ['Data completeness', 'Reasonable values', 'Logical consistency'],
};

/**
 * Registry of all document validation prompts
 */
export const documentValidationPrompts: Record<string, DocumentValidationPrompt> = {
  'sales-order': salesOrderValidationPrompt,
  'action-program': actionProgramValidationPrompt,
  'event-proposal': eventProposalValidationPrompt,
  'visit-log': visitLogValidationPrompt,
};

/**
 * Get validation prompt for a document type
 */
export function getValidationPrompt(documentType: string): DocumentValidationPrompt | null {
  return documentValidationPrompts[documentType] ?? null;
}

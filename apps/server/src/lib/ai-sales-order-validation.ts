import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateText, Output } from 'ai';
import * as z from 'zod';
import { getChatModel } from './ai-provider.js';
import { prisma } from './prisma.js';
import { formatKnowledgeHits, searchKnowledgeChunks } from './rag.js';

/** Knowledge source (md basename) holding the static validation rules. */
const PROMPT_SOURCE = 'sales-order-validation';

const PROMPT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  `../knowledge/${PROMPT_SOURCE}.md`,
);

/** Read once per process. */
let promptPromise: Promise<string> | undefined;

const loadValidationPrompt = (): Promise<string> => {
  promptPromise ??= readFile(PROMPT_PATH, 'utf-8').then((text) => text.trimEnd());
  return promptPromise;
};

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  analysis: string;
}

const aiValidationResultSchema = z.object({
  valid: z.boolean(),
  score: z.number().min(0).max(100),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  analysis: z.string(),
});

export async function runAiValidation(orderId: string): Promise<ValidationResult> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          sku: { select: { id: true, name: true, code: true, baseUnit: true } },
        },
      },
      customer: { select: { id: true, name: true } },
      outlet: { select: { id: true, name: true } },
      area: { select: { id: true, name: true } },
    },
  });

  if (!order) {
    throw new Error('Sales order not found');
  }

  // Retrieve relevant knowledge base chunks for validation context.
  // Skip chunks ingested from the prompt file itself — they are already in `instructions`.
  const ragQuery = `sales order validation pricing discount approval ${order.customer?.name ?? ''} ${order.items.map(i => i.sku.name).join(' ')}`;
  const ragHits = await searchKnowledgeChunks(ragQuery, 5, { excludeSources: [PROMPT_SOURCE] });
  const ragContext = formatKnowledgeHits(ragHits);

  const systemPrompt = `${await loadValidationPrompt()}

## Retrieved Knowledge
${ragContext}`;

  const userPrompt = `Analyze this sales order:

**Order Details:**
- Document Number: ${order.documentNumber ?? 'N/A'}
- Date: ${order.date.toISOString()}
- Customer: ${order.customer?.name ?? 'N/A'}
- Outlet: ${order.outlet?.name ?? 'N/A'}
- Area: ${order.area.name}
- Currency: ${order.currency}
- Payment Terms: ${order.paymentTerms ?? 'N/A'}
- Expected Delivery: ${order.expectedDeliveryDate?.toISOString() ?? 'N/A'}
- Notes: ${order.notes ?? 'N/A'}

**Financial Summary:**
- Subtotal: ${order.subtotal?.toString() ?? '0'}
- Discount Total: ${order.discountTotal?.toString() ?? '0'}
- Tax Total: ${order.taxTotal?.toString() ?? '0'}
- Grand Total: ${order.grandTotal?.toString() ?? '0'}

**Line Items (${order.items.length}):**
${order.items.map((item, idx) => `
${idx + 1}. ${item.sku.name} (${item.sku.code ?? 'N/A'})
   - Quantity: ${item.quantity.toString()} ${item.sku.baseUnit}
   - Unit Price: ${item.unitPrice.toString()}
   - Discount: ${item.discountPercent?.toString() ?? '0'}%
   - Tax: ${item.taxPercent?.toString() ?? '0'}%
   - Line Total: ${item.lineTotal.toString()}
   - Notes: ${item.notes ?? 'N/A'}
`).join('\n')}

Provide your validation analysis in the required JSON format.`;

  const { output } = await generateText({
    model: await getChatModel(prisma),
    instructions: systemPrompt,
    prompt: userPrompt,
    output: Output.object({
      schema: aiValidationResultSchema,
    }),
  });

  if (!output) {
    throw new Error('AI validation failed to produce output');
  }

  return output as ValidationResult;
}

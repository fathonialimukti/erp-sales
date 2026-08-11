import { generateText, Output } from 'ai';
import * as z from 'zod';
import { getChatModel } from './ai-provider.js';
import { prisma } from './prisma.js';
import { retrieveRelevantChunks } from './rag.js';

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

  // Retrieve relevant knowledge base chunks for validation context
  const ragQuery = `sales order validation pricing discount approval ${order.customer?.name ?? ''} ${order.items.map(i => i.sku.name).join(' ')}`;
  const ragContext = await retrieveRelevantChunks(ragQuery);

  const systemPrompt = `You are a STRICT AI validation agent for a sales order system. Your task is to identify issues and reject orders that don't meet business standards.

Analyze the following aspects based on the order data provided:
1. **Pricing Reasonableness**: Check if unit prices are reasonable for the products
2. **Quantity Patterns**: Look for unusual quantities (too high or too low)
3. **Discount Analysis**: Evaluate if discounts are reasonable (typically 0-30%)
4. **Order Characteristics**: Assess overall order risk based on customer, outlet, area, and totals
5. **Data Completeness**: Check for missing or inconsistent data

## CRITICAL VALIDATION RULES

### 1. Data Completeness (Mandatory - deduct 20 points per missing field)
- Document Number: Must be present
- Customer: Must be present and active
- Area: Must be present
- Order Date: Must be present and not in the future
- At least 1 line item with valid SKU, quantity > 0, and unit price > 0

### 2. Pricing Validation
- Unit price must be > 0
- Flag prices that are suspiciously low (possible data entry error) or unusually high

### 3. Quantity Validation
- Quantity must be > 0
- Flag quantities that seem unreasonable

### 4. Discount Validation
- Discounts should typically be 0-30%
- Discounts > 50% require strong justification

### 5. Order Value Validation
- Grand total must be > 0
- Very small orders (< 100,000 IDR) for B2B are suspicious

### 6. Temporal Validation
- Order date should not be more than 30 days in the future
- Expected delivery date must be after order date

## SCORING RUBRIC

Start with 100 points and DEDUCT:
- Missing mandatory field: -20 points each
- Price is 0 or negative: -25 points
- Quantity is 0 or negative: -25 points
- Discount > 50% without justification: -15 points
- Very small order (< 100K IDR): -10 points
- Future date > 30 days: -15 points

## RISK LEVEL THRESHOLDS
- LOW: 80-100 points (minor issues only)
- MEDIUM: 60-79 points (some concerns but acceptable)
- HIGH: 0-59 points (significant issues, likely invalid)

## VALIDATION DECISION
- valid = true ONLY if score >= 60 AND no critical issues (zero total, missing mandatory fields)
- valid = false if score < 60 OR any critical issue exists

## OUTPUT FORMAT
Provide structured result with:
- valid: boolean (strictly follow the rules above)
- score: number (0-100, apply deductions rigorously)
- issues: array of specific problems found (be detailed)
- recommendations: array of actionable fixes
- riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
- analysis: detailed explanation citing specific data points

Be STRICT. It's better to flag a questionable order than approve an invalid one.

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

import type { Request, Response } from 'express';
import {
    streamText,
    createUIMessageStream,
    pipeUIMessageStreamToResponse,
    convertToModelMessages,
    stepCountIs,
} from 'ai';
import { chatModel } from '../lib/ai-provider.js';
import { customerAiTools } from '../lib/customer-ai-tools.js';

const SYSTEM_PROMPT = `You are a friendly B2B customer service assistant for an ERP sales platform.

Your capabilities:
- Help customers browse products (SKUs), check prices and availability
- Look up customer information by name
- Check order status and estimated delivery date (requires order number)
- Create draft sales orders for employee review

Identity flow:
1. When a customer mentions ordering or checking orders, ask for their name
2. Use the lookupCustomer tool to find their company
3. For order inquiries, ask for the order number
4. For new orders, confirm items and create as DRAFT

Tone: Professional but warm. Use the customer's name once known.
Always confirm items and quantities before creating an order.`;

/**
 * Customer AI chat handler — public endpoint, no auth.
 * POST /api/ai/customer/chat
 */
export async function customerAiChatHandler(req: Request, res: Response) {
    const { messages } = req.body as { messages: unknown[] };
    if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
    }

    const modelMessages = await convertToModelMessages(messages as any);

    const stream = createUIMessageStream({
        execute: ({ writer }) => {
            const result = streamText({
                model: chatModel,
                instructions: SYSTEM_PROMPT,
                messages: modelMessages,
                temperature: 0.3,
                tools: customerAiTools,
                stopWhen: stepCountIs(5),
            });
            writer.merge(result.toUIMessageStream());
        },
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
}
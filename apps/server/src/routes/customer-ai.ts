import type { Request, Response } from 'express';
import {
    streamText,
    createUIMessageStream,
    pipeUIMessageStreamToResponse,
    convertToModelMessages,
    stepCountIs,
} from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { customerAiTools } from '../lib/customer-ai-tools.js';
import { prisma } from '../lib/prisma.js';
import { acquireAiSlot } from '../lib/rate-limiter.js';
import {
    analyzeImageTool,
    hasImageParts,
    OnlyTextModelError,
} from '../lib/ai-multimodal.js';

const SYSTEM_PROMPT = `You are a friendly B2B customer service assistant for an ERP sales platform.

Your capabilities:
- Help customers browse products (SKUs), check prices and availability
- Look up customer information by name
- Check order status and estimated delivery date (requires order number)
- Create draft sales orders for employee review

Carton sales (this is how the store sells — it is not optional):
- Every product is sold per carton only. Each product has a pack size (pcs per carton); an order quantity must be a positive whole multiple of it. A pack size of 1 means the product is sold per piece.
- Call listProducts to read a product's pack size live from the product master. Pack sizes change when a product is repacked, so never assume one from memory.
- If the customer's quantity is not a whole carton, do NOT create the order. Tell them the product, the pack size, and the two nearest valid quantities (in pieces and cartons), and ask which one they want. Create the draft only after they confirm a valid multiple.
- If you cannot resolve a product's pack size (unknown product, tool error), ask the customer to confirm the exact product code and quantity. Never round a quantity on their behalf.

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
    // Public endpoint — protect the shared upstream AI key with the global
    // limiter (unset = unlimited).
    const slot = await acquireAiSlot();
    if (!slot.ok) {
        res.status(429).json({ error: 'AI service is busy, please try again shortly', retryAfter: slot.retryAfter });
        return;
    }

    const { messages } = req.body as { messages: unknown[] };
    if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
    }

    const modelMessages = await convertToModelMessages(messages as any);

    // Only expose the image-analysis tool when the conversation actually contains
    // image parts, so the model cannot call it gratuitously on text-only chats.
    // Graceful degradation: if no multimodal model is configured,
    // analyzeImageTool's execute throws OnlyTextModelError — wrap execute so the
    // tool resolves to a friendly error string instead of killing the stream
    // (other errors still propagate to the AI SDK's tool-error path).
    const hasImages = hasImageParts(messages as unknown[]);
    const imageTool = hasImages ? analyzeImageTool(prisma) : null;
    const tools = {
        ...customerAiTools,
        ...(imageTool
            ? {
                  analyzeImage: {
                      ...imageTool,
                      execute: async (args: any, options: any) => {
                          try {
                              return (await imageTool.execute!(args, options)) as string;
                          } catch (error) {
                              if (error instanceof OnlyTextModelError) {
                                  return `[Image analysis unavailable: ${error.message}]`;
                              }
                              throw error;
                          }
                      },
                  },
              }
            : {}),
    };

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            const result = streamText({
                model: await getChatModel(prisma),
                instructions: SYSTEM_PROMPT,
                messages: modelMessages,
                temperature: 0.3,
                tools,
                stopWhen: stepCountIs(5),
            });
            writer.merge(result.toUIMessageStream());
        },
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
}
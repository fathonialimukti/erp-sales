import type { Request, Response } from 'express';
import { generateObject } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { withAuth } from '../lib/express-auth.js';
import { prisma } from '../lib/prisma.js';
import { createSalesOrderSchema } from '@repo/schemas/sales-order';
import { buildCartonPromptContext } from '../lib/carton-pack-size.js';

const EXTRACT_SYSTEM = `You are a data-entry assistant for a Sales ERP system.
You convert a free-text or pasted sales order description into a structured order object.

Rules:
- Map the text to the provided schema fields. Use snake_case-free field names as in the schema.
- For items, infer skuId only if an explicit SKU code is present; otherwise leave skuId undefined and put the product name in a notes field.
- quantity and unitPrice must be positive numbers when present.
- Compute lineTotal = quantity * unitPrice when both are present; otherwise leave undefined.
- currency defaults to "USD" when not specified.
- Do NOT invent customerId/outletId ULIDs — leave them undefined unless the text contains an explicit ID.
- Return only the structured object; do not add fields not in the schema.

Carton rules:
- Products are sold per carton only. The pack size (pcs per carton) of each product is listed in the PRODUCT PACK SIZES section of the prompt, read live from the product master.
- quantity is in pieces. When the buyer states cartons ("2 carton", "2 dus"), multiply by that product's pack size.
- When the stated quantity is NOT a whole multiple of the pack size, keep the exact stated quantity in quantity and record the mismatch in that item's notes (e.g. "requested 50 pcs; pack size 20 — needs a whole carton"). Never round or adjust it yourself.
- When a product is not in PRODUCT PACK SIZES, leave skuId undefined, keep the product name in notes, and do not guess a pack size.`;

export const aiExtractSalesOrderHandler = withAuth({ aiRateLimit: true }, async (req: Request, res: Response) => {
    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'text is required and must be a non-empty string' });
        return;
    }

    try {
        // SPEC §Email CRM agent prompt / extraction: pack sizes are injected
        // from live Sku records at prompt-build time so the extractor never
        // quotes a stale pack size after a repack.
        const cartonContext = await buildCartonPromptContext(prisma, text);

        const { object } = await generateObject({
            model: await getChatModel(prisma),
            instructions: EXTRACT_SYSTEM,
            prompt: `${text}\n\n${cartonContext}`,
            schema: createSalesOrderSchema,
            temperature: 0,
        });
        res.json({ data: object });
    } catch (error) {
        res.status(502).json({
            error: 'Extraction failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

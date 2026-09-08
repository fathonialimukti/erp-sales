import type { Request, Response } from 'express';
import * as z from 'zod';
import { generateObject } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { withAuth } from '../lib/express-auth.js';
import { prisma } from '../lib/prisma.js';



const formFillSchema = z.record(z.string(), z.unknown());

const FORM_FILL_SYSTEM = `You are a form-fill assistant for a Sales ERP system used by a B2B sales team.
You help a salesperson complete an ERP form quickly and accurately.

You receive:
- A form section identifier.
- The user's instruction (may be empty).
- The current form context JSON: current field values and which fields are required.
- Selectable options maps (e.g. regionList, areaList, customerList, outletList, skuList, userList, statusList) of allowed values.

Rules:
- Return ONLY fields present in the form's field list from the context JSON. Never invent fields.
- Prefer values that exist in the provided options lists (use the real ids/names exactly as given).
- For select fields, use one of the exact option values provided.
- Fill sensible defaults for empty fields based on the instruction and business context.
- Never fabricate ids that do not exist in the provided options.
- Return the fields as a flat JSON object (no wrapper). Omit any empty/unset fields.`;

export const aiFormFillHandler = withAuth({ aiRateLimit: true }, async (req: Request, res: Response) => {

    const { section, instruction, contextJson, options } = req.body as {
        section?: string;
        instruction?: string;
        contextJson?: string;
        options?: Record<string, unknown[]>;
    };
    if (!section || typeof section !== 'string') {
        res.status(400).json({ error: 'section is required' });
        return;
    }

    const promptLines = [
        `Form section: ${section}`,
        instruction ? `User instruction: ${instruction}` : null,
        contextJson ? `Current form context JSON:\n${contextJson}` : null,
        options && Object.keys(options).length > 0
            ? `Selectable options:\n${Object.entries(options)
                  .map(([key, list]) => `${key}: ${JSON.stringify(list)}`)
                  .join('\n')}`
            : null,
    ].filter(Boolean);

    try {
        const { object } = await generateObject({
            model: await getChatModel(prisma),
            instructions: FORM_FILL_SYSTEM,
            prompt: promptLines.join('\n\n'),
            schema: formFillSchema,
            temperature: 0.2,
        });
        res.json({ fields: object });
    } catch (error) {
        res.status(500).json({
            error: 'AI fill failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

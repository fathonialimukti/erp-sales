import type { Request, Response } from 'express';
import { parse as parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { generateObject } from 'ai';
import { chatModel } from '../lib/ai-provider.js';
import { getJwtSecret } from '../lib/jwt-secret.js';
import { createSalesOrderSchema } from '@repo/schemas/sales-order';

const JWT_SECRET = getJwtSecret();

// ponytail: reuse the exact auth block from ai.ts — no new auth logic.
function extractToken(req: Request): string | null {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) return cookies.access_token;
    }
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length);
    return null;
}

const EXTRACT_SYSTEM = `You are a data-entry assistant for a Sales ERP system.
You convert a free-text or pasted sales order description into a structured order object.

Rules:
- Map the text to the provided schema fields. Use snake_case-free field names as in the schema.
- For items, infer skuId only if an explicit SKU code is present; otherwise leave skuId undefined and put the product name in a notes field.
- quantity and unitPrice must be positive numbers when present.
- Compute lineTotal = quantity * unitPrice when both are present; otherwise leave undefined.
- currency defaults to "IDR" when not specified.
- Do NOT invent customerId/outletId ULIDs — leave them undefined unless the text contains an explicit ID.
- Return only the structured object; do not add fields not in the schema.`;

export async function aiExtractSalesOrderHandler(req: Request, res: Response) {
    const token = extractToken(req);
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        jwt.verify(token, JWT_SECRET);
    } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    const { text } = req.body as { text?: string };
    if (!text || typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'text is required and must be a non-empty string' });
        return;
    }

    try {
        const { object } = await generateObject({
            model: chatModel,
            system: EXTRACT_SYSTEM,
            prompt: text,
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
}

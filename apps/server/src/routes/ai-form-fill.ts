import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import * as z from 'zod';
import { generateObject } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { getJwtSecret } from '../lib/jwt-secret.js';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = getJwtSecret();

// Reuse the auth pattern form ai.ts / ai-extract.ts — parse cookie `access_token`
// or Bearer header, verify JWT, return null (and 401) if invalid.
function authUserId(req: Request, res: Response): string | null {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) {
            try {
                const payload = jwt.verify(cookies.access_token, JWT_SECRET) as jwt.JwtPayload;
                return payload?.userId ? String(payload.userId) : null;
            } catch {
                res.status(401).json({ error: 'Invalid token' });
                return null;
            }
        }
    }
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(auth.slice('Bearer '.length), JWT_SECRET) as jwt.JwtPayload;
            return payload?.userId ? String(payload.userId) : null;
        } catch {
            res.status(401).json({ error: 'Invalid token' });
            return null;
        }
    }
    res.status(401).json({ error: 'Unauthorized' });
    return null;
}

const formFillSchema = z.object({
    fields: z.record(z.string(), z.unknown()),
});

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
- Return "fields" as a JSON object; omit any empty/unset fields.`;

export async function aiFormFillHandler(req: Request, res: Response) {
    const userId = authUserId(req, res);
    if (!userId) return;

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
        res.json(object);
    } catch (error) {
        res.status(500).json({
            error: 'AI fill failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

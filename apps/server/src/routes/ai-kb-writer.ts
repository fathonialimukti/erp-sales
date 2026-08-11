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

const schema = z.object({
    title: z.string(),
    content: z.string(),
    source: z.string(),
});

const KB_WRITER_SYSTEM = `You are a knowledge-base author for a B2B field-sales ERP. Given raw text (a support thread, conversation, or notes), produce a clean knowledge entry. Rules: (1) title: short, specific, searchable (max ~10 words). (2) content: a well-structured Markdown snippet (headings/bullets ok) capturing the durable facts, policy, or how-to — remove conversational filler, greetings, and personal details. (3) source: a short label for where this came from (e.g. 'Support thread', 'Email', 'SOP', or the instruction-provided source). (4) Keep content under ~300 words. (5) If the user provided an instruction, honor it (e.g. 'write in Indonesian', 'focus on the return policy').`;

export async function aiKbWriterHandler(req: Request, res: Response) {
    const userId = authUserId(req, res);
    if (!userId) return;

    const { text, instruction } = req.body as {
        text?: string;
        instruction?: string;
    };
    if (typeof text !== 'string' || text.trim().length === 0) {
        res.status(400).json({ error: 'text is required' });
        return;
    }

    const promptLines = [
        `Raw text:\n${text}`,
        instruction ? `User instruction: ${instruction}` : null,
    ].filter(Boolean);

    try {
        const { object } = await generateObject({
            model: await getChatModel(prisma),
            instructions: KB_WRITER_SYSTEM,
            prompt: promptLines.join('\n\n'),
            schema,
            temperature: 0.2,
        });
        res.json({ data: object });
    } catch (error) {
        res.status(500).json({
            error: 'KB writer failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
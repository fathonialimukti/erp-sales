import type { Request, Response } from 'express';
import * as z from 'zod';
import { generateObject } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { withAuth } from '../lib/express-auth.js';
import { prisma } from '../lib/prisma.js';



const schema = z.object({
    title: z.string(),
    content: z.string(),
    source: z.string(),
});

const KB_WRITER_SYSTEM = `You are a knowledge-base author for a B2B field-sales ERP. Given raw text (a support thread, conversation, or notes), produce a clean knowledge entry. Rules: (1) title: short, specific, searchable (max ~10 words). (2) content: a well-structured Markdown snippet (headings/bullets ok) capturing the durable facts, policy, or how-to — remove conversational filler, greetings, and personal details. (3) source: a short label for where this came from (e.g. 'Support thread', 'Email', 'SOP', or the instruction-provided source). (4) Keep content under ~300 words. (5) If the user provided an instruction, honor it (e.g. 'write in Indonesian', 'focus on the return policy').`;

export const aiKbWriterHandler = withAuth({ aiRateLimit: true }, async (req: Request, res: Response) => {

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
});

import type { Request, Response } from 'express';
import { generateText } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { withAuth } from '../lib/express-auth.js';
import { prisma } from '../lib/prisma.js';



const REPORT_NARRATE_INSTRUCTIONS = `You are a concise business analyst for a B2B field-sales ERP. Given a report summary with KPIs and period-over-period deltas, write a 3-paragraph Markdown narrative: (1) What's going well / what's up. (2) What's down or concerning. (3) What to watch / recommended next actions (up to 3). Use the actual numbers provided. Never invent numbers not in the input. Business language, English or Indonesian matching the report if discernible. No raw JSON.`;

export const aiReportNarrateHandler = withAuth({ aiRateLimit: true }, async (req: Request, res: Response) => {

    const { reportType, filters, summaryJson, contextJson } = req.body as {
        reportType?: unknown;
        filters?: unknown;
        summaryJson?: string;
        contextJson?: string;
    };
    if (typeof reportType !== 'string' || !reportType) {
        res.status(400).json({ error: 'reportType is required' });
        return;
    }

    const promptLines = [
        `Report type: ${reportType}`,
        filters && Object.keys(filters as object).length > 0 ? `Filters: ${JSON.stringify(filters)}` : null,
        summaryJson ? `Report summary JSON (KPI values + deltas):\n${summaryJson}` : null,
        contextJson ? `Additional context:\n${contextJson}` : null,
    ].filter(Boolean);

    try {
        const { text } = await generateText({
            model: await getChatModel(prisma),
            instructions: REPORT_NARRATE_INSTRUCTIONS,
            prompt: promptLines.join('\n\n'),
            temperature: 0.3,
        });

        res.json({ narrative: text.trim() });
    } catch (error) {
        res.status(500).json({
            error: 'Report narrate failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

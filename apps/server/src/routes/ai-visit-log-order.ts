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

const visitLogOrderSchema = z.object({
    visitLogId: z.string(),
});

const visitLogOrderResultSchema = z.object({
    outletId: z.string(),
    items: z.array(
        z.object({
            skuId: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number().nonnegative(),
            lineTotal: z.number().nonnegative(),
            notes: z.string().optional(),
        })
    ).min(1),
    notes: z.string().optional(),
});

const VISIT_LOG_ORDER_SYSTEM = `You turn a field salesperson's visit notes into a structured sales order draft. Rules: (1) Only use SKU ids, names, codes, and base prices from the provided SKU catalog. (2) Map spoken product names/codes to catalog SKUs; if ambiguous, pick the closest match and note it. (3) Use the visit log's outlet id for outletId — never invent one. (4) quantity and unitPrice must be positive when present; default unitPrice to the SKU basePrice when the notes don't state a price. (5) lineTotal = quantity * unitPrice rounded. (6) Do NOT invent SKUs not in the catalog. (7) Return only the structured object.`;

export async function aiVisitLogOrderHandler(req: Request, res: Response) {
    const userId = authUserId(req, res);
    if (!userId) return;

    const parsed = visitLogOrderSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'visitLogId is required' });
        return;
    }

    const visitLog = await prisma.visitLog.findUnique({
        where: { id: parsed.data.visitLogId },
        include: {
            outlet: {
                include: { customer: true, area: true },
            },
            salesman: true,
        },
    });
    if (!visitLog) {
        res.status(404).json({ error: 'Visit log not found' });
        return;
    }

    const skus = await prisma.sku.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, code: true, name: true, basePrice: true, baseUnit: true, status: true },
    });

    const prompt = [
        `Visit log:`,
        `- Outlet: ${visitLog.outlet.name} (id: ${visitLog.outlet.id})`,
        `- Customer: ${visitLog.outlet.customer.name}`,
        `- Date: ${visitLog.date.toISOString()}`,
        `- Purpose: ${visitLog.purpose ?? '(none)'}`,
        `- Notes: ${visitLog.notes ?? '(none)'}`,
        '',
        `SKU catalog:`,
        ...skus.map(
            (sku) =>
                `${sku.id} | ${sku.code ?? ''} | ${sku.name} | ${sku.basePrice?.toString() ?? ''} | ${sku.baseUnit}`
        ),
    ].join('\n');

    try {
        const { object } = await generateObject({
            model: await getChatModel(prisma),
            instructions: VISIT_LOG_ORDER_SYSTEM,
            prompt,
            schema: visitLogOrderResultSchema,
            temperature: 0.1,
        });
        res.json({ data: object });
    } catch (error) {
        res.status(500).json({
            error: 'Visit order extraction failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

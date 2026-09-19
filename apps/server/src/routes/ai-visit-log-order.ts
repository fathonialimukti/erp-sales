import type { Request, Response } from 'express';
import * as z from 'zod';
import { generateObject } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { withAuth } from '../lib/express-auth.js';
import { prisma } from '../lib/prisma.js';

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

const VISIT_LOG_ORDER_SYSTEM = `You turn a field salesperson's visit notes into a structured sales order draft. Rules: (1) Only use SKU ids, names, codes, and base prices from the provided SKU catalog. (2) Map spoken product names/codes to catalog SKUs; if ambiguous, pick the closest match and note it. (3) Use the visit log's outlet id for outletId — never invent one. (4) quantity and unitPrice must be positive when present; default unitPrice to the SKU basePrice when the notes don't state a price. (5) lineTotal = quantity * unitPrice rounded. (6) Do NOT invent SKUs not in the catalog. (7) Products are sold per carton only: quantity is in pieces and must be a positive whole multiple of the SKU's pack size as listed in the catalog. When the notes state cartons, multiply by the pack size. When the stated quantity is not a whole multiple, keep the exact quantity and record the mismatch in the item notes — never round it yourself. (8) Return only the structured object.`;

export const aiVisitLogOrderHandler = withAuth({ aiRateLimit: true }, async (req: Request, res: Response) => {

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
        select: { id: true, code: true, name: true, basePrice: true, baseUnit: true, packSize: true, status: true },
    });

    const prompt = [
        `Visit log:`,
        `- Outlet: ${visitLog.outlet.name} (id: ${visitLog.outlet.id})`,
        `- Customer: ${visitLog.outlet.customer.name}`,
        `- Date: ${visitLog.date.toISOString()}`,
        `- Purpose: ${visitLog.purpose ?? '(none)'}`,
        `- Notes: ${visitLog.notes ?? '(none)'}`,
        '',
        `SKU catalog (packSize = pcs per carton; quantity must be a whole multiple of it):`,
        ...skus.map(
            (sku) =>
                `${sku.id} | ${sku.code ?? ''} | ${sku.name} | ${sku.basePrice?.toString() ?? ''} | ${sku.baseUnit} | packSize ${sku.packSize}`
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
});

import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { generateText } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../lib/jwt-secret.js';

const JWT_SECRET = getJwtSecret();

// Reuse the auth pattern from ai-form-fill.ts — parse cookie `access_token`
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

const CUSTOMER_360_INSTRUCTIONS = `You are a sales manager's pre-meeting assistant. Produce a scannable Markdown brief for a customer meeting with sections: **Profile** (name, code, outlets, contacts), **Money** (approved revenue, order count, average order value, open orders), **Activity** (recent orders, visits), **Risks & Opportunities** (up to 3 bullets, e.g. open orders needing follow-up, low visit frequency, top SKU concentration). Use the actual numbers provided; never invent. Business language, English or Indonesian matching the customer name/context if discernible. No raw JSON.`;

const toNumber = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
};

export async function aiCustomer360Handler(req: Request, res: Response) {
    const userId = authUserId(req, res);
    if (!userId) return;

    const { customerId } = req.body as { customerId?: unknown };
    if (typeof customerId !== 'string' || !customerId) {
        res.status(400).json({ error: 'customerId is required' });
        return;
    }

    try {
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                id: true,
                code: true,
                name: true,
                status: true,
                outlets: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        area: { select: { name: true } },
                    },
                },
                contacts: {
                    select: { name: true, title: true, email: true, phone: true, isPrimary: true },
                },
            },
        });
        if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
            return;
        }

        const [approvedAgg, openAgg, latestOrder, topSkuRows, visitCount] = await Promise.all([
            prisma.salesOrder.aggregate({
                where: { customerId, approvalStatus: 'APPROVED' },
                _sum: { grandTotal: true },
                _count: { _all: true },
            }),
            prisma.salesOrder.aggregate({
                where: { customerId, approvalStatus: { in: ['DRAFT', 'PROPOSED'] } },
                _count: { _all: true },
            }),
            prisma.salesOrder.findFirst({
                where: { customerId },
                orderBy: { date: 'desc' },
                select: { documentNumber: true, date: true },
            }),
            prisma.salesOrderItem.groupBy({
                by: ['skuId'],
                where: { salesOrder: { customerId, approvalStatus: 'APPROVED' } },
                _sum: { lineTotal: true },
                orderBy: { _sum: { lineTotal: 'desc' } },
                take: 3,
            }),
            prisma.visitLog.count({ where: { outlet: { customerId } } }),
        ]);

        const skuIds = topSkuRows.map((r) => r.skuId).filter((id): id is string => id !== null);
        const skus = skuIds.length > 0
            ? await prisma.sku.findMany({ where: { id: { in: skuIds } }, select: { id: true, name: true, code: true } })
            : [];
        const skuName = new Map(skus.map((s) => [s.id, s.code ? `${s.code} · ${s.name}` : s.name]));
        const approvedRevenue = toNumber(approvedAgg._sum?.grandTotal);
        const approvedCount = approvedAgg._count._all;
        const openCount = openAgg._count._all;
        const avgOrderValue = approvedCount > 0 ? approvedRevenue / approvedCount : 0;

        const contextLines = [
            `Customer: ${customer.name}${customer.code ? ` (code: ${customer.code})` : ''}${customer.status ? ` — status: ${customer.status}` : ''}`,
            customer.outlets.length > 0
                ? `Outlets:\n${customer.outlets
                      .map((o) => `- ${o.name}${o.code ? ` (${o.code})` : ''}${o.area?.name ? ` — area: ${o.area.name}` : ''}`)
                      .join('\n')}`
                : 'Outlets: none',
            customer.contacts.length > 0
                ? `Contacts:\n${customer.contacts
                      .map(
                          (c) =>
                              `- ${c.name}${c.title ? `, ${c.title}` : ''}${c.isPrimary ? ' (primary)' : ''}${c.email ? ` — ${c.email}` : ''}${c.phone ? ` — ${c.phone}` : ''}`
                      )
                      .join('\n')}`
                : 'Contacts: none',
            `Approved revenue: ${approvedRevenue.toLocaleString('en-US')} (${approvedCount} approved order(s))`,
            `Average order value: ${avgOrderValue.toLocaleString('en-US')}`,
            `Open orders (DRAFT/PROPOSED): ${openCount}`,
            latestOrder
                ? `Latest order: ${latestOrder.documentNumber ?? 'n/a'} on ${latestOrder.date.toISOString().slice(0, 10)}`
                : 'Latest order: none',
            topSkuRows.length > 0
                ? `Top SKUs by revenue:\n${topSkuRows
                      .map((r) => `- ${skuName.get(r.skuId) ?? 'Unknown'} — ${toNumber(r._sum?.lineTotal).toLocaleString('en-US')}`)
                      .join('\n')}`
                : 'Top SKUs: none',
            `Visit logs: ${visitCount}`,
        ];

        const { text } = await generateText({
            model: await getChatModel(prisma),
            instructions: CUSTOMER_360_INSTRUCTIONS,
            prompt: contextLines.join('\n\n'),
            temperature: 0.3,
        });

        res.json({ brief: text.trim() });
    } catch (error) {
        res.status(500).json({
            error: 'Customer brief failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
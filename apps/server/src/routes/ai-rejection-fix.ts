import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { generateText } from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { getJwtSecret } from '../lib/jwt-secret.js';
import { prisma } from '../lib/prisma.js';

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

const REJECTION_FIX_INSTRUCTIONS = `You are a sales-order quality assistant. A manager rejected a draft/proposed sales order. Based on the rejection reason and the order's current contents, produce a concise Markdown checklist of concrete actions the rep should take to fix the order and resubmit. Rules: (1) Address the actual rejection reason first. (2) Reference real order fields/items (item names, line numbers, amounts). (3) If a reason mentions price, margin, quantity, missing info, or dates, give a specific concrete fix (e.g. 'Raise line 3 unit price from Rp 5,000 to Rp 6,500'). (4) Never invent SKUs not in the order. (5) Keep it under ~250 words, bullet points, business language, English or Indonesian matching the reason.`;

function fmtMoney(value: { toString(): string } | null | undefined): string | null {
    return value !== null && value !== undefined ? Number(value).toLocaleString('en-US') : null;
}

function fmtDate(value: Date | null | undefined): string | null {
    return value ? value.toISOString().slice(0, 10) : null;
}

// Find the latest rejection entry in the approval history JSON.
// Entries are { process, name, dateTime, message }; a rejection is either
// process === 'Reject' or a message that indicates rejection.
function latestRejectionReason(history: unknown): string {
    if (!Array.isArray(history) || history.length === 0) return 'No specific reason given';
    const entries = history as { process?: unknown; name?: unknown; dateTime?: unknown; message?: unknown }[];
    const rejection = [...entries]
        .reverse()
        .find(
            (h) =>
                String(h.process ?? '').toLowerCase() === 'reject' ||
                /reject|rejected|ditolak|menolak/i.test(String(h.message ?? ''))
        );
    const message = rejection?.message;
    return typeof message === 'string' && message.trim() ? message.trim() : 'No specific reason given';
}

export async function aiRejectionFixHandler(req: Request, res: Response) {
    const userId = authUserId(req, res);
    if (!userId) return;

    const { salesOrderId } = req.body as { salesOrderId?: unknown };
    if (typeof salesOrderId !== 'string' || !salesOrderId) {
        res.status(400).json({ error: 'salesOrderId is required' });
        return;
    }

    try {
        const order = await prisma.salesOrder.findUnique({
            where: { id: salesOrderId },
            include: {
                customer: true,
                outlet: true,
                area: true,
                createdBy: { select: { id: true, name: true } },
                items: {
                    include: { sku: { select: { id: true, code: true, name: true, basePrice: true, baseUnit: true } } },
                    orderBy: { sortOrder: 'asc' },
                },
                approvedBy: { select: { id: true, name: true } },
            },
        });
        if (!order) {
            res.status(404).json({ error: 'Sales order not found' });
            return;
        }

        const rejectionReason = latestRejectionReason(order.approvalHistory);

        const itemLines = order.items
            .map(
                (i, idx) =>
                    `- Line ${idx + 1}: ${i.sku.name} (${i.sku.code}) — qty ${Number(i.quantity)}, unit price ${fmtMoney(i.unitPrice)}, line total ${fmtMoney(i.lineTotal)}`
            )
            .join('\n');

        const prompt = [
            `Sales order ${order.documentNumber ?? order.id}`,
            `Customer: ${order.customer?.name ?? '-'} | Outlet: ${order.outlet.name} | Area: ${order.area.name}`,
            `Date: ${fmtDate(order.date)} | Expected delivery: ${fmtDate(order.expectedDeliveryDate)}`,
            `Approval status: ${order.approvalStatus} | Created by: ${order.createdBy.name}`,
            `Subtotal: ${fmtMoney(order.subtotal)} | Discount: ${fmtMoney(order.discountTotal)} | Tax: ${fmtMoney(order.taxTotal)} | Grand total: ${fmtMoney(order.grandTotal)} (${order.currency})`,
            `Rejection reason: ${rejectionReason}`,
            `Items (${order.items.length}):\n${itemLines}`,
            order.notes ? `Notes: ${order.notes}` : null,
        ]
            .filter((l): l is string => Boolean(l))
            .join('\n');

        const { text } = await generateText({
            model: await getChatModel(prisma),
            instructions: REJECTION_FIX_INSTRUCTIONS,
            prompt,
            temperature: 0.3,
        });

        res.json({ fixes: text.trim() });
    } catch (error) {
        res.status(500).json({
            error: 'Fix suggestions failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

import type { Request, Response } from 'express';
import { parse as parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { Prisma } from '../prisma/generated/client';
import { prisma } from '../lib/prisma.js';
import { streamSalesOrderPdf, type SalesOrderPdfRecord } from '../lib/sales-order-pdf.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key-change-this';

/**
 * GET /api/sales-order/:id/pdf
 *
 * Streams a sales-order PDF inline so the browser's native PDF
 * viewer renders it (preview + print + download). Auth is enforced
 * via the same cookie/bearer scheme used by tRPC.
 */
export async function salesOrderPdfHandler(req: Request, res: Response) {
    // --- Auth ---
    // Cookie is httpOnly + cross-origin (client on :10021, server on :10022),
    // so a new browser tab can't send it. Accept the token from either the
    // cookie, the Authorization header, or a ?token= query param.
    let token: string | null = null;
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) token = cookies.access_token;
    }
    if (!token) {
        const auth = req.headers.authorization;
        if (auth?.startsWith('Bearer ')) token = auth.slice('Bearer '.length);
    }
    if (!token) {
        const queryToken = req.query.token;
        if (typeof queryToken === 'string') token = queryToken;
    }
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    let userId: string;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        if (!payload?.userId) throw new Error('Invalid token payload');
        userId = String(payload.userId);
    } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    // --- Load record (same shape as salesOrder.detail) ---
    const record = await prisma.salesOrder.findUnique({
        where: { id: String(req.params.id) },
        include: {
            customer: { select: { id: true, name: true } },
            outlet: { select: { id: true, name: true } },
            area: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
            items: {
                include: { sku: { select: { id: true, name: true, code: true, baseUnit: true } } },
                orderBy: { sortOrder: 'asc' as const },
            },
        },
    });

    if (!record) {
        res.status(404).json({ error: 'Sales order not found' });
        return;
    }

    // --- Permission check (sales-order@read) ---
    // Mirrors the hasPermission middleware: Permission.name stores the
    // full "resource@action" string.
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: { include: { permission: { select: { name: true } } } },
                },
            },
        },
    });
    const userPerms = user?.role?.permissions.map((rp) => rp.permission.name) ?? [];
    if (!userPerms.includes('sales-order@read')) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    // --- Stream PDF ---
    const pdfRecord: SalesOrderPdfRecord = {
        id: record.id,
        documentNumber: record.documentNumber,
        date: record.date,
        currency: record.currency,
        paymentTerms: record.paymentTerms,
        customer: (record as any).customer,
        outlet: (record as any).outlet,
        area: (record as any).area,
        createdBy: (record as any).createdBy,
        approvedBy: (record as any).approvedBy,
        approvalStatus: record.approvalStatus,
        subtotal: record.subtotal ? Number(record.subtotal) : null,
        discountTotal: record.discountTotal ? Number(record.discountTotal) : null,
        taxTotal: record.taxTotal ? Number(record.taxTotal) : null,
        grandTotal: record.grandTotal ? Number(record.grandTotal) : null,
        notes: record.notes,
        expectedDeliveryDate: record.expectedDeliveryDate,
        items: (record as any).items.map((it: any) => ({
            id: it.id,
            sku: it.sku,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            discountPercent: it.discountPercent ? Number(it.discountPercent) : null,
            taxPercent: it.taxPercent ? Number(it.taxPercent) : null,
            lineTotal: Number(it.lineTotal),
            notes: it.notes,
        })),
    };

    streamSalesOrderPdf(res, pdfRecord);
}

import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { streamSalesOrderPdf, type SalesOrderPdfRecord } from '../lib/sales-order-pdf.js';
import { withAuth } from '../lib/express-auth.js';

/**
 * GET /api/sales-order/:id/pdf
 *
 * Streams a sales-order PDF inline so the browser's native PDF
 * viewer renders it (preview + print + download). Auth is enforced
 * via the shared cookie/bearer middleware (same scheme as tRPC).
 */
export const salesOrderPdfHandler = withAuth(
    { permission: 'sales-order@read' },
    async (req: Request, res: Response) => {
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
);

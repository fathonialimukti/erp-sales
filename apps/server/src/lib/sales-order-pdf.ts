import PDFDocument from 'pdfkit';
import type { Response } from 'express';

/**
 * Sales Order PDF generator.
 *
 * Produces an A4 PDF that mirrors the on-screen `SalesOrderPrint`
 * component (iOS-style document: brand header, meta grid, items
 * table, totals, signatures, footer).
 *
 * The PDF is streamed directly to the Express `Response` so the
 * browser's native PDF viewer renders it inline (preview) with
 * print/download controls — no client-side deps required.
 */

export interface SalesOrderPdfItem {
    id: string;
    sku: { id: string; name: string; code: string | null; baseUnit: string };
    quantity: number;
    unitPrice: number;
    discountPercent: number | null;
    taxPercent: number | null;
    lineTotal: number;
    notes: string | null;
}

export interface SalesOrderPdfRecord {
    id: string;
    documentNumber: string | null;
    date: Date;
    currency: string;
    paymentTerms: string | null;
    customer: { id: string; name: string };
    outlet: { id: string; name: string } | null;
    area: { id: string; name: string };
    createdBy: { id: string; name: string } | null;
    approvedBy: { id: string; name: string } | null;
    approvalStatus: string;
    subtotal: number | null;
    discountTotal: number | null;
    taxTotal: number | null;
    grandTotal: number | null;
    notes: string | null;
    expectedDeliveryDate: Date | null;
    items: SalesOrderPdfItem[];
}

// A4 portrait in PDF points (1pt = 1/72 inch). A4 = 595.28 x 841.89 pt.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40; // ~14mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Palette — mirrors the on-screen print theme (slate / dark ink).
const INK = '#0B0B14';
const MUTED = '#64748B';
const SLATE_200 = '#E2E8F0';
const SLATE_300 = '#CBD5E1';
const SLATE_900 = '#0f172a';
const SURFACE = '#F1F5F9';
const SURFACE_SOFT = '#F8FAFC';

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(v);

const formatDate = (d: Date | null | undefined) => {
    if (!d) return '—';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(d instanceof Date ? d : new Date(d));
};

const formatDateTime = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);

const docLabel = (r: SalesOrderPdfRecord) =>
    r.documentNumber ?? `SO #${r.id.slice(0, 8).toUpperCase()}`;

/**
 * Stream a sales-order PDF to the Express response.
 * Inline disposition → browser shows native PDF viewer (preview).
 */
export const streamSalesOrderPdf = (res: Response, record: SalesOrderPdfRecord) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${docLabel(record)}.pdf"`);

    const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
            Title: `Sales Order ${docLabel(record)}`,
            Author: 'ERP Sales',
            Subject: `Sales order ${docLabel(record)}`,
        },
    });

    doc.pipe(res);
    drawDocument(doc, record);
    doc.end();
};

const drawDocument = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord) => {
    drawHeader(doc, r);
    drawMetaGrid(doc, r);
    drawItemsTable(doc, r);
    drawNotes(doc, r);
    drawSignatures(doc, r);
    drawFooter(doc, r);
};

const drawHeader = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord) => {
    // Brand mark — gradient rounded square (approximated with solid fill).
    const markSize = 36;
    const markX = MARGIN;
    const markY = MARGIN;
    doc.roundedRect(markX, markY, markSize, markSize, 9).fill('#7C3AED');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18);
    doc.text('S', markX, markY + 8, {
        width: markSize,
        align: 'center',
    });

    // Brand text
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(16);
    doc.text('ERP Sales', markX + markSize + 8, markY + 2, { continued: false });
    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8);
    doc.text('SALES OS', markX + markSize + 8, markY + 22, { continued: false });

    // Title block (right-aligned)
    const titleX = PAGE_WIDTH - MARGIN - 220;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(24);
    doc.text('Sales Order', titleX, MARGIN, {
        width: 220,
        align: 'right',
    });
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10);
    doc.text(docLabel(r), { width: 220, align: 'right' });

    // Status pill
    const statusColors: Record<string, [string, string]> = {
        DRAFT: ['#E2E8F0', '#475569'],
        AI_VALIDATED: ['#E0E7FF', '#4338CA'],
        PROPOSED: ['#DBEAFE', '#1D4ED8'],
        APPROVED: ['#D1FAE5', '#047857'],
        REJECTED: ['#FEE2E2', '#B91C1C'],
    };
    const [bg, fg] = statusColors[r.approvalStatus] ?? ['#E2E8F0', '#475569'];
    const statusLabel = r.approvalStatus;
    doc.font('Helvetica-Bold').fontSize(8);
    const pillWidth = doc.widthOfString(statusLabel) + 16;
    const pillX = PAGE_WIDTH - MARGIN - pillWidth;
    const pillY = MARGIN + 48;
    doc.roundedRect(pillX, pillY, pillWidth, 16, 4).fill(bg);
    doc.fillColor(fg).font('Helvetica-Bold').fontSize(8);
    doc.text(statusLabel, pillX, pillY + 4, {
        width: pillWidth,
        align: 'center',
    });

    // Header divider
    const dividerY = MARGIN + 80;
    doc.moveTo(MARGIN, dividerY).lineTo(PAGE_WIDTH - MARGIN, dividerY)
        .strokeColor(INK).lineWidth(0.5).stroke();
};

const drawMetaGrid = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord) => {
    const startY = MARGIN + 96;
    const cols = 4;
    const colWidth = CONTENT_WIDTH / cols;
    const rowHeight = 28;

    const cells: { label: string; value: string }[] = [
        { label: 'DOCUMENT NUMBER', value: docLabel(r) },
        { label: 'ORDER DATE', value: formatDate(r.date) },
        { label: 'STATUS', value: r.approvalStatus },
        { label: 'CURRENCY', value: r.currency },
        { label: 'BILL TO', value: r.customer.name },
        ...(r.outlet ? [{ label: 'OUTLET', value: r.outlet.name }] : []),
        { label: 'AREA', value: r.area.name },
        ...(r.expectedDeliveryDate
            ? [{ label: 'EXPECTED DELIVERY', value: formatDate(r.expectedDeliveryDate) }]
            : []),
        ...(r.paymentTerms ? [{ label: 'PAYMENT TERMS', value: r.paymentTerms }] : []),
    ];

    cells.forEach((cell, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = MARGIN + col * colWidth;
        const y = startY + row * rowHeight;

        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7);
        doc.text(cell.label, x, y, { width: colWidth - 8 });
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(10);
        doc.text(cell.value, x, y + 11, { width: colWidth - 8 });
    });

    // Track consumed height for the next section.
    const rows = Math.ceil(cells.length / cols);
    doc.y = startY + rows * rowHeight + 12;
};

const drawItemsTable = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord) => {
    const startY = doc.y + 4;

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10);
    doc.text('LINE ITEMS', MARGIN, startY);
    doc.y = startY + 16;

    // Column widths (percentages of content width).
    const cols = [
        { key: 'sku', label: 'CODE', width: 0.14, align: 'left' as const },
        { key: 'product', label: 'PRODUCT', width: 0.30, align: 'left' as const },
        { key: 'qty', label: 'QTY', width: 0.11, align: 'right' as const },
        { key: 'unit', label: 'UNIT PRICE', width: 0.15, align: 'right' as const },
        { key: 'disc', label: 'DISC %', width: 0.10, align: 'right' as const },
        { key: 'tax', label: 'TAX %', width: 0.10, align: 'right' as const },
        { key: 'total', label: 'LINE TOTAL', width: 0.10, align: 'right' as const },
    ];

    const colX = cols.reduce<{ x: number; width: number; align: 'left' | 'right' }[]>((acc, c, i) => {
        const prev = acc[i - 1];
        const x = i === 0 || !prev ? MARGIN : prev.x + prev.width;
        acc.push({ x, width: c.width * CONTENT_WIDTH, align: c.align });
        return acc;
    }, []);

    // Header row
    const headerY = doc.y;
    doc.rect(MARGIN, headerY, CONTENT_WIDTH, 18).fill(SURFACE);
    cols.forEach((c, i) => {
        doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(7);
        const pad = 6;
        const col = colX[i];
        if (!col) return;
        if (c.align === 'right') {
            doc.text(c.label, col.x, headerY + 5, {
                width: col.width - pad,
                align: 'right',
            });
        } else {
            doc.text(c.label, col.x + pad, headerY + 5, {
                width: col.width - pad * 2,
                align: 'left',
            });
        }
    });
    doc.y = headerY + 18;

    // Body rows
    r.items.forEach((it, idx) => {
        const rowY = doc.y;
        const rowHeight = 22 + (it.notes ? 12 : 0);

        // Page break if needed
        if (rowY + rowHeight > PAGE_HEIGHT - MARGIN - 200) {
            doc.addPage();
            doc.y = MARGIN;
            return;
        }

        if (idx % 2 === 1) {
            doc.rect(MARGIN, rowY, CONTENT_WIDTH, rowHeight).fill(SURFACE_SOFT);
        }

        const pad = 6;
        doc.fillColor(INK);

        // Code
        const codeCol = colX[0];
        if (codeCol) {
            doc.font('Helvetica').fontSize(8.5);
            doc.text(it.sku.code ?? '—', codeCol.x + pad, rowY + 6, {
                width: codeCol.width - pad * 2,
            });
        }

        // Product
        const productCol = colX[1];
        if (productCol) {
            doc.font('Helvetica-Bold').fontSize(9.5);
            doc.text(it.sku.name, productCol.x + pad, rowY + 4, {
                width: productCol.width - pad * 2,
            });
            if (it.notes) {
                doc.fillColor(MUTED).font('Helvetica').fontSize(8);
                doc.text(it.notes, productCol.x + pad, rowY + 16, {
                    width: productCol.width - pad * 2,
                });
            }
        }

        // Numeric cells
        doc.fillColor(INK).font('Helvetica').fontSize(9.5);
        const numText = (i: number, text: string, bold = false) => {
            const col = colX[i];
            if (!col) return;
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5);
            doc.text(text, col.x, rowY + 6, {
                width: col.width - pad,
                align: 'right',
            });
        };
        numText(2, `${it.quantity} ${it.sku.baseUnit}`);
        numText(3, formatCurrency(it.unitPrice));
        numText(4, `${it.discountPercent ?? 0}%`);
        numText(5, `${it.taxPercent ?? 0}%`);
        numText(6, formatCurrency(it.lineTotal), true);

        doc.y = rowY + rowHeight;
    });

    // Bottom border for table body
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y)
        .strokeColor(SLATE_300).lineWidth(0.5).stroke();
    doc.y += 8;

    drawTotals(doc, r);
};

const drawTotals = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord) => {
    const labelX = MARGIN;
    const valueX = PAGE_WIDTH - MARGIN - 140;
    const valueWidth = 140;
    const rowHeight = 18;

    const rows: { label: string; value: string; strong?: boolean }[] = [
        { label: 'Subtotal', value: formatCurrency(r.subtotal ?? 0) },
        { label: 'Discount', value: `−${formatCurrency(r.discountTotal ?? 0)}` },
        { label: 'Tax', value: formatCurrency(r.taxTotal ?? 0) },
        { label: 'Grand Total', value: formatCurrency(r.grandTotal ?? 0), strong: true },
    ];

    rows.forEach((row, i) => {
        const y = doc.y;
        if (row.strong) {
            // Top border (double weight) for grand total
            doc.moveTo(labelX, y).lineTo(PAGE_WIDTH - MARGIN, y)
                .strokeColor(INK).lineWidth(1).stroke();
            doc.rect(labelX, y, CONTENT_WIDTH, rowHeight).fill(INK);
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11);
            doc.text(row.label, labelX + 6, y + 5, { width: valueX - labelX - 6 });
            doc.text(row.value, valueX, y + 5, {
                width: valueWidth - 6,
                align: 'right',
            });
        } else {
            doc.fillColor(SLATE_900).font('Helvetica-Bold').fontSize(9.5);
            doc.text(row.label, labelX + 6, y + 4, { width: valueX - labelX - 6, align: 'right' });
            doc.fillColor(INK).font('Helvetica-Bold').fontSize(9.5);
            doc.text(row.value, valueX, y + 4, {
                width: valueWidth - 6,
                align: 'right',
            });
        }
        doc.y = y + rowHeight;
    });
    doc.y += 12;
};

const drawNotes = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord) => {
    if (!r.notes) return;
    const startY = doc.y + 4;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(10);
    doc.text('NOTES', MARGIN, startY);
    doc.y = startY + 16;

    const notesY = doc.y;
    doc.font('Helvetica').fontSize(9.5).fillColor(SLATE_900);
    const textOpts = { width: CONTENT_WIDTH - 16, height: 60 } as const;
    doc.text(r.notes, MARGIN + 8, notesY + 4, textOpts);
    // Left accent bar
    doc.rect(MARGIN, notesY, 3, 50).fill(SLATE_300);
    doc.y = notesY + 60;
};

const drawSignatures = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord) => {
    const startY = doc.y + 24;
    const colWidth = CONTENT_WIDTH / 3;
    const gap = 12;

    const blocks = [
        { label: 'ISSUED BY', name: r.createdBy?.name ?? '—' },
        { label: 'APPROVED BY', name: r.approvedBy?.name ?? '—' },
        { label: 'RECEIVED BY', name: '' },
    ];

    blocks.forEach((b, i) => {
        const x = MARGIN + i * (colWidth + gap);
        // Signature line
        doc.moveTo(x, startY + 30).lineTo(x + colWidth - gap, startY + 30)
            .strokeColor(INK).lineWidth(0.5).stroke();
        // Name
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(9);
        doc.text(b.name || ' ', x, startY + 34, {
            width: colWidth - gap,
            align: 'center',
        });
        // Label
        doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7);
        doc.text(b.label, x, startY + 48, {
            width: colWidth - gap,
            align: 'center',
        });
    });

    doc.y = startY + 70;
};

const drawFooter = (doc: PDFKit.PDFDocument, _r: SalesOrderPdfRecord) => {
    const y = PAGE_HEIGHT - MARGIN - 20;
    doc.moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y)
        .strokeColor(SLATE_300).lineWidth(0.5).stroke();

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(8);
    doc.text('Thank you for your business.', MARGIN, y + 6, {
        width: CONTENT_WIDTH / 2,
    });
    doc.fillColor(MUTED).font('Helvetica').fontSize(8);
    doc.text(
        `Printed on ${formatDateTime(new Date())}`,
        PAGE_WIDTH / 2,
        y + 6,
        { width: CONTENT_WIDTH / 2 - MARGIN, align: 'right' },
    );
};

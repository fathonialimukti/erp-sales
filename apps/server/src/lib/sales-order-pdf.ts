import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import { getCompanyIdentity } from './company-identity.js';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type ServerLocale } from './locale.js';
import { logger } from './logger.js';
import {
    PRINT_BORDER,
    PRINT_INK,
    PRINT_MUTED,
    PRINT_PAPER,
    PRINT_PRIMARY,
    PRINT_WASH_NEUTRAL,
    PRINT_WASH_SOFT,
    printStatusColors,
} from './print-palette.js';

/**
 * Sales Order PDF generator.
 *
 * Produces an A4 PDF that mirrors the on-screen `SalesOrderPrint`
 * component (document letterhead, meta grid, items table, totals,
 * signatures, footer on every page). Print colors come exclusively
 * from `print-palette.ts`; the letterhead comes from
 * `company-identity.ts`.
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
// Footer strip (divider + two text lines) kept clear on EVERY page.
const FOOTER_RESERVE = 46;
const usableBottom = () => PAGE_HEIGHT - MARGIN - FOOTER_RESERVE;

// =============================================
// Localized label dictionary (en + id)
// =============================================

export interface PdfLabels {
    documentTitle: string;
    documentNumber: string;
    orderDate: string;
    statusLabel: string;
    currency: string;
    billTo: string;
    outlet: string;
    area: string;
    expectedDelivery: string;
    paymentTerms: string;
    lineItems: string;
    columns: {
        code: string;
        product: string;
        qty: string;
        unitPrice: string;
        discPercent: string;
        taxPercent: string;
        lineTotal: string;
    };
    subtotal: string;
    discount: string;
    tax: string;
    grandTotal: string;
    notes: string;
    issuedBy: string;
    approvedBy: string;
    receivedBy: string;
    thankYou: string;
    /** `{date}` placeholder. */
    printedOn: string;
    /** `{page}` and `{total}` placeholders. */
    pageOf: string;
    phoneLabel: string;
    taxIdLabel: string;
    emptyLineItems: string;
    /** Raw approval-status enum → translated label. */
    statusNames: Record<string, string>;
}

export const pdfLabels: Record<ServerLocale, PdfLabels> = {
    en: {
        documentTitle: 'Sales Order',
        documentNumber: 'DOCUMENT NUMBER',
        orderDate: 'ORDER DATE',
        statusLabel: 'STATUS',
        currency: 'CURRENCY',
        billTo: 'BILL TO',
        outlet: 'OUTLET',
        area: 'AREA',
        expectedDelivery: 'EXPECTED DELIVERY',
        paymentTerms: 'PAYMENT TERMS',
        lineItems: 'LINE ITEMS',
        columns: {
            code: 'CODE',
            product: 'PRODUCT',
            qty: 'QTY',
            unitPrice: 'UNIT PRICE',
            discPercent: 'DISC %',
            taxPercent: 'TAX %',
            lineTotal: 'LINE TOTAL',
        },
        subtotal: 'Subtotal',
        discount: 'Discount',
        tax: 'Tax',
        grandTotal: 'Grand Total',
        notes: 'NOTES',
        issuedBy: 'ISSUED BY',
        approvedBy: 'APPROVED BY',
        receivedBy: 'RECEIVED BY',
        thankYou: 'Thank you for your business.',
        printedOn: 'Printed on {date}',
        pageOf: 'Page {page} of {total}',
        phoneLabel: 'Phone',
        taxIdLabel: 'Tax ID',
        emptyLineItems: 'No line items.',
        statusNames: {
            DRAFT: 'Draft',
            AI_VALIDATED: 'AI Validated',
            PROPOSED: 'Proposed',
            APPROVED: 'Approved',
            REJECTED: 'Rejected',
        },
    },
    id: {
        documentTitle: 'Pesanan Penjualan',
        documentNumber: 'NOMOR DOKUMEN',
        orderDate: 'TANGGAL PESANAN',
        statusLabel: 'STATUS',
        currency: 'MATA UANG',
        billTo: 'DITAGIH KEPADA',
        outlet: 'OUTLET',
        area: 'AREA',
        expectedDelivery: 'ESTIMASI PENGIRIMAN',
        paymentTerms: 'TERMIN PEMBAYARAN',
        lineItems: 'RINCIAN ITEM',
        columns: {
            code: 'KODE',
            product: 'PRODUK',
            qty: 'JUMLAH',
            unitPrice: 'HARGA SATUAN',
            discPercent: 'DISKON %',
            taxPercent: 'PAJAK %',
            lineTotal: 'TOTAL BARIS',
        },
        subtotal: 'Subtotal',
        discount: 'Diskon',
        tax: 'Pajak',
        grandTotal: 'Total Keseluruhan',
        notes: 'CATATAN',
        issuedBy: 'DITERBITKAN OLEH',
        approvedBy: 'DISETUJUI OLEH',
        receivedBy: 'DITERIMA OLEH',
        thankYou: 'Terima kasih atas kepercayaan Anda.',
        printedOn: 'Dicetak pada {date}',
        pageOf: 'Halaman {page} dari {total}',
        phoneLabel: 'Telepon',
        taxIdLabel: 'NPWP',
        emptyLineItems: 'Tidak ada item.',
        statusNames: {
            DRAFT: 'Draf',
            AI_VALIDATED: 'Tervalidasi AI',
            PROPOSED: 'Diajukan',
            APPROVED: 'Disetujui',
            REJECTED: 'Ditolak',
        },
    },
};

export const labelsFor = (locale: ServerLocale): PdfLabels => pdfLabels[locale] ?? pdfLabels.en;

/**
 * `?locale=en|id` contract: missing or invalid values default to `en`.
 * Strict on purpose — no partial matches like `id-ID`.
 */
export const parsePdfLocale = (raw: unknown): ServerLocale => {
    const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    return (SUPPORTED_LOCALES as string[]).includes(value) ? (value as ServerLocale) : DEFAULT_LOCALE;
};

// =============================================
// Formatters
// =============================================

const localeForCurrency = (currency: string): string => {
    switch (currency.toUpperCase()) {
        case 'USD':
            return 'en-US';
        case 'IDR':
            return 'id-ID';
        case 'PHP':
            return 'en-PH';
        case 'SGD':
            return 'en-SG';
        case 'MYR':
            return 'ms-MY';
        default:
            return 'en-US';
    }
};

/** Per-currency digits: 0 for IDR magnitudes, 2 for everything else. */
export const fractionDigitsForCurrency = (currency: string): number =>
    currency.toUpperCase() === 'IDR' ? 0 : 2;

export const formatCurrency = (v: number, currency: string): string => {
    const digits = fractionDigitsForCurrency(currency);
    return new Intl.NumberFormat(localeForCurrency(currency), {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(v);
};

const formatDate = (d: Date | null | undefined, locale: ServerLocale) => {
    if (!d) return '—';
    const date = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const formatDateTime = (d: Date, locale: ServerLocale) =>
    new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);

const docLabel = (r: SalesOrderPdfRecord) =>
    r.documentNumber ?? `SO-${r.id.slice(0, 8).toUpperCase()}`;

// =============================================
// Content-Disposition filename sanitization
// =============================================

/**
 * ASCII-safe filename fragment: keeps letters/digits/dot/dash/underscore,
 * folds everything else into single dashes, and falls back to a fixed name.
 * Document numbers like `SO/2026 #12` must not end up in HTTP headers raw.
 */
export const sanitizeAsciiFilename = (raw: string): string => {
    const cleaned = raw
        .normalize('NFKD')
        .replace(/[^\x20-\x7E]/g, '') // drop non-ASCII (accents fold via NFKD first)
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '');
    return cleaned || 'sales-order';
};

export const pdfFilenameFor = (r: SalesOrderPdfRecord): string =>
    `${sanitizeAsciiFilename(docLabel(r))}.pdf`;

// =============================================
// Streaming
// =============================================

/**
 * Stream a sales-order PDF to the Express response.
 * Inline disposition → browser shows native PDF viewer (preview).
 *
 * Failure handling: once `pipe()` has flushed, a 200 is already on the wire —
 * a thrown draw error must NOT leave the client with a truncated 200, so the
 * response is destroyed (client sees a network error). Before any flush,
 * a real 500 is still possible.
 */
export const streamSalesOrderPdf = (
    res: Response,
    record: SalesOrderPdfRecord,
    locale: ServerLocale = DEFAULT_LOCALE,
): void => {
    const labels = labelsFor(locale);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${pdfFilenameFor(record)}"`);

    const doc = new PDFDocument({
        size: [PAGE_WIDTH, PAGE_HEIGHT],
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        bufferPages: true, // footers with "Page X of Y" are written on every page at the end
        info: {
            Title: `${labels.documentTitle} ${docLabel(record)}`,
            Author: 'B2B CRM',
            Subject: `${labels.documentTitle} ${docLabel(record)}`,
        },
    });

    const fail = (error: unknown) => {
        logger.error('sales-order PDF generation failed', {
            error: error instanceof Error ? error.message : String(error),
            salesOrderId: record.id,
        });
        try {
            doc.destroy();
        } catch {
            // already destroyed
        }
        if (!res.headersSent) {
            if (!res.writableEnded) res.status(500).json({ error: 'Failed to generate PDF' });
        } else {
            res.destroy();
        }
    };
    doc.on('error', fail);

    try {
        doc.pipe(res);
        drawDocument(doc, record, labels, locale);
        doc.end();
    } catch (error) {
        fail(error);
    }
};

// =============================================
// Drawing
// =============================================

const drawDocument = (
    doc: PDFKit.PDFDocument,
    r: SalesOrderPdfRecord,
    labels: PdfLabels,
    locale: ServerLocale,
) => {
    drawHeader(doc, r, labels);
    drawMetaGrid(doc, r, labels, locale);
    drawItemsTable(doc, r, labels);
    drawTotals(doc, r, labels);
    drawNotes(doc, r, labels);
    drawSignatures(doc, r, labels);
    drawFooters(doc, labels, locale);
};

/** Trim with an ellipsis so single-line letterhead text never overlaps the title block. */
const fitText = (doc: PDFKit.PDFDocument, text: string, maxWidth: number): string => {
    if (doc.widthOfString(text) <= maxWidth) return text;
    let fitted = text;
    while (fitted.length > 1 && doc.widthOfString(`${fitted}…`) > maxWidth) {
        fitted = fitted.slice(0, -1);
    }
    return `${fitted.trimEnd()}…`;
};

const drawHeader = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord, labels: PdfLabels) => {
    const identity = getCompanyIdentity();

    // Brand mark — Aurora Azure rounded square (print palette, no CSS runtime).
    const markSize = 36;
    const markX = MARGIN;
    const markY = MARGIN;
    doc.roundedRect(markX, markY, markSize, markSize, 9).fill(PRINT_PRIMARY);
    doc.fillColor(PRINT_PAPER).font('Helvetica-Bold').fontSize(18);
    doc.text(identity.name.charAt(0).toUpperCase(), markX, markY + 8, {
        width: markSize,
        align: 'center',
    });

    // Company name + identity block (letterhead).
    const textX = markX + markSize + 8;
    const textWidth = 240;
    doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(16);
    doc.text(fitText(doc, identity.name, textWidth), textX, markY + 2);

    const contactBits = [
        identity.phone ? `${labels.phoneLabel}: ${identity.phone}` : '',
        identity.taxId ? `${labels.taxIdLabel}: ${identity.taxId}` : '',
    ].filter(Boolean);
    const infoLines = [...identity.addressLines.slice(0, 2), contactBits.join(' · ')].filter(Boolean).slice(0, 3);
    doc.fillColor(PRINT_MUTED).font('Helvetica').fontSize(7.5);
    infoLines.forEach((line, i) => {
        doc.text(fitText(doc, line, textWidth), textX, markY + 24 + i * 10);
    });

    // Title block (right-aligned)
    const titleX = PAGE_WIDTH - MARGIN - 220;
    doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(24);
    doc.text(labels.documentTitle, titleX, MARGIN, {
        width: 220,
        align: 'right',
    });
    doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(10);
    doc.text(docLabel(r), { width: 220, align: 'right' });

    // Status pill — design-law chip colors + translated label (never color alone).
    const { bg, fg } = printStatusColors(r.approvalStatus);
    const statusLabel = labels.statusNames[r.approvalStatus] ?? r.approvalStatus;
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
        .strokeColor(PRINT_INK).lineWidth(0.5).stroke();
};

const drawMetaGrid = (
    doc: PDFKit.PDFDocument,
    r: SalesOrderPdfRecord,
    labels: PdfLabels,
    locale: ServerLocale,
) => {
    const cols = 4;
    const colWidth = CONTENT_WIDTH / cols;
    const cellWidth = colWidth - 8;
    let y = MARGIN + 96;

    const cells: { label: string; value: string }[] = [
        { label: labels.documentNumber, value: docLabel(r) },
        { label: labels.orderDate, value: formatDate(r.date, locale) },
        { label: labels.statusLabel, value: labels.statusNames[r.approvalStatus] ?? r.approvalStatus },
        { label: labels.currency, value: r.currency },
        { label: labels.billTo, value: r.customer.name },
        ...(r.outlet ? [{ label: labels.outlet, value: r.outlet.name }] : []),
        { label: labels.area, value: r.area.name },
        ...(r.expectedDeliveryDate
            ? [{ label: labels.expectedDelivery, value: formatDate(r.expectedDeliveryDate, locale) }]
            : []),
        ...(r.paymentTerms ? [{ label: labels.paymentTerms, value: r.paymentTerms }] : []),
    ];

    // Measured rows — fixed heights clipped wrapped customer names.
    for (let i = 0; i < cells.length; i += cols) {
        const rowCells = cells.slice(i, i + cols);
        doc.font('Helvetica-Bold').fontSize(10);
        const rowHeight = Math.max(
            ...rowCells.map((cell) => 13 + 2 + doc.heightOfString(cell.value, { width: cellWidth })),
            24,
        );

        rowCells.forEach((cell, j) => {
            const x = MARGIN + j * colWidth;
            doc.fillColor(PRINT_MUTED).font('Helvetica-Bold').fontSize(7);
            doc.text(cell.label, x, y, { width: cellWidth });
            doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(10);
            doc.text(cell.value, x, y + 13, { width: cellWidth });
        });

        y += rowHeight;
    }

    doc.y = y + 12;
};

// --- Items table geometry ---
// LINE TOTAL sized for IDR magnitudes (e.g. "Rp 12.345.678.890" fits without wrapping).
const ITEM_COLS = [
    { label: 'code', width: 0.12, align: 'left' as const },
    { label: 'product', width: 0.29, align: 'left' as const },
    { label: 'qty', width: 0.09, align: 'right' as const },
    { label: 'unitPrice', width: 0.16, align: 'right' as const },
    { label: 'discPercent', width: 0.07, align: 'right' as const },
    { label: 'taxPercent', width: 0.07, align: 'right' as const },
    { label: 'lineTotal', width: 0.2, align: 'right' as const },
] as const;

const ITEM_HEADER_HEIGHT = 20;
const ITEM_PAD = 6;

const buildItemColumnX = () =>
    ITEM_COLS.reduce<{ x: number; width: number; align: 'left' | 'right' }[]>((acc, c, i) => {
        const prev = acc[i - 1];
        const x = i === 0 || !prev ? MARGIN : prev.x + prev.width;
        acc.push({ x, width: c.width * CONTENT_WIDTH, align: c.align });
        return acc;
    }, []);

const drawItemsHeaderRow = (doc: PDFKit.PDFDocument, labels: PdfLabels) => {
    const y = doc.y;
    doc.rect(MARGIN, y, CONTENT_WIDTH, ITEM_HEADER_HEIGHT).fill(PRINT_WASH_NEUTRAL);
    const colX = buildItemColumnX();
    ITEM_COLS.forEach((c, i) => {
        const col = colX[i];
        if (!col) return;
        doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(7);
        const text = labels.columns[c.label];
        if (c.align === 'right') {
            doc.text(text, col.x, y + 6, { width: col.width - ITEM_PAD, align: 'right' });
        } else {
            doc.text(text, col.x + ITEM_PAD, y + 6, { width: col.width - ITEM_PAD * 2, align: 'left' });
        }
    });
    doc.y = y + ITEM_HEADER_HEIGHT;
};

interface ItemRowLayout {
    height: number;
    code: string;
    qty: string;
    unit: string;
    disc: string;
    tax: string;
    total: string;
}

/** Row height measured via heightOfString so wrapped text can't overlap the next row. */
const measureItemRow = (
    doc: PDFKit.PDFDocument,
    it: SalesOrderPdfItem,
    r: SalesOrderPdfRecord,
    colX: { width: number }[],
): ItemRowLayout => {
    const code = it.sku.code ?? '—';
    const qty = `${it.quantity} ${it.sku.baseUnit}`;
    const unit = formatCurrency(it.unitPrice, r.currency);
    const disc = `${it.discountPercent ?? 0}%`;
    const tax = `${it.taxPercent ?? 0}%`;
    const total = formatCurrency(it.lineTotal, r.currency);

    doc.font('Helvetica').fontSize(8.5);
    const codeH = doc.heightOfString(code, { width: colX[0]!.width - ITEM_PAD * 2 });

    doc.font('Helvetica-Bold').fontSize(9.5);
    let productH = doc.heightOfString(it.sku.name, { width: colX[1]!.width - ITEM_PAD * 2 });
    if (it.notes) {
        doc.font('Helvetica').fontSize(8);
        productH += 3 + doc.heightOfString(it.notes, { width: colX[1]!.width - ITEM_PAD * 2 });
    }

    doc.font('Helvetica').fontSize(9.5);
    const numericH = Math.max(
        doc.heightOfString(qty, { width: colX[2]!.width - ITEM_PAD }),
        doc.heightOfString(unit, { width: colX[3]!.width - ITEM_PAD }),
        doc.heightOfString(disc, { width: colX[4]!.width - ITEM_PAD }),
        doc.heightOfString(tax, { width: colX[5]!.width - ITEM_PAD }),
        doc.heightOfString(total, { width: colX[6]!.width - ITEM_PAD }),
    );

    return { height: Math.max(codeH, productH, numericH) + 10, code, qty, unit, disc, tax, total };
};

const drawItemRow = (
    doc: PDFKit.PDFDocument,
    it: SalesOrderPdfItem,
    layout: ItemRowLayout,
    colX: { x: number; width: number }[],
    stripe: number,
) => {
    const rowY = doc.y;
    if (stripe % 2 === 1) {
        doc.rect(MARGIN, rowY, CONTENT_WIDTH, layout.height).fill(PRINT_WASH_SOFT);
    }

    doc.fillColor(PRINT_INK).font('Helvetica').fontSize(8.5);
    doc.text(layout.code, colX[0]!.x + ITEM_PAD, rowY + 5, { width: colX[0]!.width - ITEM_PAD * 2 });

    doc.font('Helvetica-Bold').fontSize(9.5);
    doc.text(it.sku.name, colX[1]!.x + ITEM_PAD, rowY + 4, { width: colX[1]!.width - ITEM_PAD * 2 });
    if (it.notes) {
        // Measure with the SAME font the name was drawn in, so notes sit directly below it.
        const nameH = doc.heightOfString(it.sku.name, { width: colX[1]!.width - ITEM_PAD * 2 });
        doc.fillColor(PRINT_MUTED).font('Helvetica').fontSize(8);
        doc.text(it.notes, colX[1]!.x + ITEM_PAD, rowY + 4 + nameH + 3, {
            width: colX[1]!.width - ITEM_PAD * 2,
        });
    }

    doc.fillColor(PRINT_INK);
    const numText = (i: number, text: string, bold = false) => {
        const col = colX[i];
        if (!col) return;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5);
        doc.text(text, col.x, rowY + 5, { width: col.width - ITEM_PAD, align: 'right' });
    };
    numText(2, layout.qty);
    numText(3, layout.unit);
    numText(4, layout.disc);
    numText(5, layout.tax);
    numText(6, layout.total, true);

    doc.y = rowY + layout.height;
};

const drawItemsTable = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord, labels: PdfLabels) => {
    const startY = doc.y + 4;

    doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(10);
    doc.text(labels.lineItems, MARGIN, startY);
    doc.y = startY + 16;

    const colX = buildItemColumnX();
    drawItemsHeaderRow(doc, labels);

    let stripe = 0;
    for (const it of r.items) {
        const layout = measureItemRow(doc, it, r, colX);

        // Page break: carry the pending row to the next page instead of
        // dropping it (the old early-`return` lost one item per break) and
        // re-emit the table header so multi-page tables stay readable.
        // No 200pt dead reserve — rows fill every page down to the footer strip.
        if (doc.y + layout.height > usableBottom() && doc.y > MARGIN + ITEM_HEADER_HEIGHT) {
            doc.addPage();
            drawItemsHeaderRow(doc, labels);
        }

        drawItemRow(doc, it, layout, colX, stripe);
        stripe++;
    }

    // Guard row for orders without line items.
    if (r.items.length === 0) {
        const guardY = doc.y;
        doc.rect(MARGIN, guardY, CONTENT_WIDTH, 24).fill(PRINT_WASH_SOFT);
        doc.fillColor(PRINT_MUTED).font('Helvetica-Oblique').fontSize(9);
        doc.text(labels.emptyLineItems, MARGIN + ITEM_PAD, guardY + 8, { width: CONTENT_WIDTH - ITEM_PAD * 2 });
        doc.y = guardY + 24;
    }

    // Bottom border for table body
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y)
        .strokeColor(PRINT_BORDER).lineWidth(0.5).stroke();
    doc.y += 8;
};

const TOTALS_HEIGHT = 4 * 18;

const drawTotals = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord, labels: PdfLabels) => {
    // Totals draw as one block — break to a fresh page rather than splitting
    // the block across the footer strip.
    if (doc.y + TOTALS_HEIGHT > usableBottom()) {
        doc.addPage();
        doc.y = MARGIN;
    }

    const labelX = MARGIN;
    const valueX = PAGE_WIDTH - MARGIN - 140;
    const valueWidth = 140;
    const rowHeight = 18;

    const rows: { label: string; value: string; strong?: boolean }[] = [
        { label: labels.subtotal, value: formatCurrency(r.subtotal ?? 0, r.currency) },
        { label: labels.discount, value: `−${formatCurrency(r.discountTotal ?? 0, r.currency)}` },
        { label: labels.tax, value: formatCurrency(r.taxTotal ?? 0, r.currency) },
        { label: labels.grandTotal, value: formatCurrency(r.grandTotal ?? 0, r.currency), strong: true },
    ];

    rows.forEach((row) => {
        const y = doc.y;
        if (row.strong) {
            // Top border (double weight) for grand total
            doc.moveTo(labelX, y).lineTo(PAGE_WIDTH - MARGIN, y)
                .strokeColor(PRINT_INK).lineWidth(1).stroke();
            doc.rect(labelX, y, CONTENT_WIDTH, rowHeight).fill(PRINT_INK);
            doc.fillColor(PRINT_PAPER).font('Helvetica-Bold').fontSize(11);
            doc.text(row.label, labelX + 6, y + 5, { width: valueX - labelX - 6 });
            doc.text(row.value, valueX, y + 5, {
                width: valueWidth - 6,
                align: 'right',
            });
        } else {
            doc.fillColor(PRINT_MUTED).font('Helvetica-Bold').fontSize(9.5);
            doc.text(row.label, labelX + 6, y + 4, { width: valueX - labelX - 6, align: 'right' });
            doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(9.5);
            doc.text(row.value, valueX, y + 4, {
                width: valueWidth - 6,
                align: 'right',
            });
        }
        doc.y = y + rowHeight;
    });
    doc.y += 12;
};

const drawNotes = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord, labels: PdfLabels) => {
    if (!r.notes) return;

    doc.font('Helvetica').fontSize(9.5);
    const textHeight = doc.heightOfString(r.notes, { width: CONTENT_WIDTH - 16 });
    const blockHeight = 16 + textHeight + 10;
    if (doc.y + blockHeight > usableBottom()) {
        doc.addPage();
        doc.y = MARGIN;
    }

    const startY = doc.y + 4;
    doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(10);
    doc.text(labels.notes, MARGIN, startY);

    const notesY = startY + 16;
    doc.font('Helvetica').fontSize(9.5).fillColor(PRINT_INK);
    doc.text(r.notes, MARGIN + 8, notesY + 4, { width: CONTENT_WIDTH - 16 });
    // Left accent bar
    doc.rect(MARGIN, notesY, 3, textHeight + 8).fill(PRINT_BORDER);
    doc.y = notesY + textHeight + 10;
};

const SIGNATURES_BLOCK_HEIGHT = 24 + 70;

const drawSignatures = (doc: PDFKit.PDFDocument, r: SalesOrderPdfRecord, labels: PdfLabels) => {
    if (doc.y + SIGNATURES_BLOCK_HEIGHT > usableBottom()) {
        doc.addPage();
        doc.y = MARGIN;
    }

    const startY = doc.y + 24;
    const colWidth = CONTENT_WIDTH / 3;
    const gap = 12;

    const blocks = [
        { label: labels.issuedBy, name: r.createdBy?.name ?? '—' },
        { label: labels.approvedBy, name: r.approvedBy?.name ?? '—' },
        { label: labels.receivedBy, name: '' },
    ];

    blocks.forEach((b, i) => {
        const x = MARGIN + i * (colWidth + gap);
        // Signature line
        doc.moveTo(x, startY + 30).lineTo(x + colWidth - gap, startY + 30)
            .strokeColor(PRINT_INK).lineWidth(0.5).stroke();
        // Name
        doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(9);
        doc.text(b.name || ' ', x, startY + 34, {
            width: colWidth - gap,
            align: 'center',
        });
        // Label
        doc.fillColor(PRINT_MUTED).font('Helvetica-Bold').fontSize(7);
        doc.text(b.label, x, startY + 48, {
            width: colWidth - gap,
            align: 'center',
        });
    });

    doc.y = startY + 70;
};

/**
 * Footer on EVERY page: divider + thank-you + "Page X of Y" + print timestamp.
 * Uses the page buffer (bufferPages) after all content has been drawn.
 */
const drawFooters = (doc: PDFKit.PDFDocument, labels: PdfLabels, locale: ServerLocale) => {
    const printedAt = labels.printedOn.replace('{date}', formatDateTime(new Date(), locale));
    const dividerY = PAGE_HEIGHT - MARGIN - 34;
    const range = doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.moveTo(MARGIN, dividerY).lineTo(PAGE_WIDTH - MARGIN, dividerY)
            .strokeColor(PRINT_BORDER).lineWidth(0.5).stroke();

        doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(8);
        doc.text(labels.thankYou, MARGIN, dividerY + 5, { width: CONTENT_WIDTH / 2 - 10 });

        const pageOf = labels.pageOf.replace('{page}', String(i + 1)).replace('{total}', String(range.count));
        doc.fillColor(PRINT_INK).font('Helvetica-Bold').fontSize(8);
        doc.text(pageOf, PAGE_WIDTH / 2, dividerY + 5, {
            width: CONTENT_WIDTH / 2 - MARGIN,
            align: 'right',
        });

        doc.fillColor(PRINT_MUTED).font('Helvetica').fontSize(8);
        doc.text(printedAt, PAGE_WIDTH / 2, dividerY + 16, {
            width: CONTENT_WIDTH / 2 - MARGIN,
            align: 'right',
        });
    }
};

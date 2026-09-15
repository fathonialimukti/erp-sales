import { jsPDF } from "jspdf";
import autoTable, { type CellInput } from "jspdf-autotable";

import {
  baselineOffsetMm,
  PDF_BORDER,
  PDF_CONTENT_WIDTH,
  PDF_FOOTER_RULE_Y,
  PDF_FOOTER_TEXT_BASELINE,
  PDF_INK,
  PDF_MUTED,
  PDF_PAGE,
  PDF_PAPER,
  PDF_PRIMARY,
  PDF_STATUS_TONES,
  PDF_WASH_NEUTRAL,
  PDF_WASH_SOFT,
  ptToMm,
  type DocumentPdfStatusTone,
  type PdfRgb,
} from "./pdfTheme.js";

export type { DocumentPdfStatusTone } from "./pdfTheme.js";

/**
 * Spec-driven formal-document renderer for the client-side jsPDF
 * pipeline (docs/plans/jspdf-documents — Task J-T1). THE single place
 * where document craft lives: the three migration sheets (J-T2/J-T3/J-T4)
 * only map their data into a `DocumentPdfSpec`.
 *
 * Layout grammar mirrors the `print-document` CSS foundation it replaces
 * (styles/print-document.css + PrintDocumentParts.tsx): letterhead
 * (brand plate + company identity · doc title/number/status pill right,
 * ink rule below) → 4-col meta grid → titled sections / autoTable blocks
 * (zebra WASH_SOFT, repeated header row per page, right-aligned tabular
 * numeric columns, subtotal foot) → grand-total ink band → signature
 * blocks → footer rule + printed-on stamp + "Page X of Y" on every page.
 *
 * Rules baked in:
 *  - ZERO i18n: every label/string arrives in the spec pre-resolved by
 *    the caller via `intl.formatMessage` at build time ("Page X of Y"
 *    is frozen pipeline chrome — override via `footer.pageIndicator`).
 *  - PDF bytes use ONLY the frozen palette mirror (lib/pdf/pdfTheme.ts,
 *    KEEP IN SYNC with apps/server/src/lib/print-palette.ts).
 *  - Relative imports only (no `@/` alias) — config-less root vitest.
 *  - No canvas sources in this app (no images at all) — the reference
 *    app's 50 ms paint timer is QR-specific and intentionally absent.
 */

// ---------------------------------------------------------------------------
// Spec types
// ---------------------------------------------------------------------------

/**
 * Mirrors the frozen `settings.companyIdentity` server contract
 * (apps/server/src/lib/company-identity.ts): `{ name, addressLines,
 * phone, taxId }` — no input, no extra permission.
 */
export interface PdfCompanyIdentity {
  name: string;
  addressLines: string[];
  phone: string;
  taxId: string;
}

/** Letterhead — brand block left, title/number/status right. */
export interface DocumentPdfLetterhead {
  /**
   * Company identity (`settings.companyIdentity`); `null` while
   * unavailable renders the generic product-branding fallback.
   */
  identity: PdfCompanyIdentity | null;
  /** Brand-mark initial while identity is unavailable (per document: "A", "E", …). */
  fallbackInitial: string;
  /** Brand name while identity is unavailable — already intl'd by the caller. */
  fallbackName: string;
  /** Tagline shown while identity is unavailable — already intl'd. */
  fallbackTagline: string;
  /** Pre-intl'd contact labels ("Phone", "Tax ID") — the caller owns i18n. */
  phoneLabel: string;
  taxIdLabel: string;
  /** Document title (e.g. "Action Program") — already intl'd. */
  title: string;
  /** Document number line (e.g. "AP #01A2B3C4"). */
  documentNumber: string;
  /** Status pill; `null` omits it. Label pre-intl'd, tone via `documentStatusTone`. */
  status: { label: string; tone: DocumentPdfStatusTone } | null;
}

/** Meta-grid cell: uppercase muted label over a bold ink value. */
export interface DocumentPdfMetaItem {
  label: string;
  value: string;
}

/** Table cell: pre-formatted text with optional emphasis. */
export interface DocumentPdfTableCell {
  text: string;
  align?: "left" | "right";
  bold?: boolean;
}

export interface DocumentPdfTableSpec {
  /** Section heading drawn above the table (pre-intl'd). */
  title?: string;
  /** Header labels — one per column. */
  columns: string[];
  /** Relative column widths — normalized across the content width. */
  widths: number[];
  /** Indices of right-aligned numeric columns (tabular money/qty). */
  numericColumns?: number[];
  rows: DocumentPdfTableCell[][];
  /** Bold subtotal row: label spans all but the last column, value right. */
  subtotal?: { label: string; value: string };
  /** Explicit empty row instead of a bare header over zero rows (pre-intl'd). */
  emptyMessage?: string;
}

/** Flowing body block — order between blocks is preserved. */
export type DocumentPdfBlock =
  | { kind: "section"; title: string; body: string }
  | { kind: "table"; table: DocumentPdfTableSpec }
  | { kind: "grandTotal"; label: string; value: string };

/** Signature block: pen space + rule + name + role label (+ optional meta). */
export interface DocumentPdfSignature {
  label: string;
  /** Name under the rule; empty/undefined renders an empty name row. */
  name?: string;
  /** Optional extra line under the label (e.g. an approval date), pre-intl'd. */
  meta?: string;
}

export interface DocumentPdfSpec {
  letterhead: DocumentPdfLetterhead;
  /** 4-col meta grid drawn directly under the letterhead. */
  meta: DocumentPdfMetaItem[];
  /** Ordered body blocks (sections / tables / grand-total band). */
  blocks: DocumentPdfBlock[];
  signatures: DocumentPdfSignature[];
  /**
   * Footer — `printedOn` pre-intl'd ("Printed on {date}"). The page
   * indicator defaults to the frozen "Page X of Y" chrome; callers may
   * localize via `pageIndicator`.
   */
  footer: {
    printedOn: string;
    pageIndicator?: (page: number, total: number) => string;
  };
}

// ---------------------------------------------------------------------------
// Layout constants (pt, mirroring the print-document.css type scale)
// ---------------------------------------------------------------------------

const T_TITLE = 24;
const T_BRAND_NAME = 14;
const T_BRAND_LINE = 7.5;
const T_TAGLINE = 8;
const T_META_LABEL = 7;
const T_META_VALUE = 10;
const T_SECTION_TITLE = 10;
const T_SECTION_BODY = 9.5;
const T_TABLE_HEAD = 7;
const T_TABLE_BODY = 9.5;
const T_GRAND_LABEL = 10;
const T_GRAND_VALUE = 12;
const T_SIGNATURE_NAME = 9;
const T_SIGNATURE_LABEL = 7;
const T_FOOTER = 8;

const BODY_LINE_HEIGHT = 1.45;
const SECTION_BODY_LINE_HEIGHT = 1.5;
const BRAND_LINE_HEIGHT = 1.3;

/** 0.5pt hairline from the CSS borders, in mm (jsPDF line-width unit). */
const HAIRLINE = 0.18;

const SECTION_GAP = 8; // mm — ap-print__section margin-top
const META_GRID_GAP_X = ptToMm(12);
const META_GRID_GAP_Y = ptToMm(6);
const META_GRID_COLUMNS = 4;
const META_GRID_MARGIN_BOTTOM = 8; // mm
const SIGNATURE_GAP = ptToMm(12);
const SIGNATURE_MARGIN_TOP = 12; // mm
const BLOCK_GAP = ptToMm(6);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const setFillColor = (doc: jsPDF, c: PdfRgb) => doc.setFillColor(c[0], c[1], c[2]);
const setTextColor = (doc: jsPDF, c: PdfRgb) => doc.setTextColor(c[0], c[1], c[2]);
const setDrawColor = (doc: jsPDF, c: PdfRgb) => doc.setDrawColor(c[0], c[1], c[2]);

/** Wrapped line count under the current font/size. */
const wrapCount = (doc: jsPDF, text: string, widthMm: number): number =>
  doc.splitTextToSize(text, widthMm).length;

const drawInkRule = (doc: jsPDF, y: number) => {
  setDrawColor(doc, PDF_INK);
  doc.setLineWidth(HAIRLINE);
  doc.line(PDF_PAGE.marginLeft, y, PDF_PAGE.width - PDF_PAGE.marginRight, y);
};

/**
 * jspdf-autotable assigns `doc.lastAutoTable` at runtime (its README's
 * `doc.lastAutoTable.finalY` sugar); the v5 bundle does not re-declare
 * the jsPDF augmentation, so mirror the consumed shape locally.
 */
interface AutoTableDocument extends jsPDF {
  lastAutoTable?: { finalY?: number } | false;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

/**
 * Build the formal document as jsPDF bytes. Synchronous and side-effect
 * free (no DOM, no fetch) — the lifecycle (blob URL, preview, print,
 * download) lives in usePdfDocument.ts.
 */
export const buildDocumentPdf = (spec: DocumentPdfSpec): jsPDF => {
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });
  doc.setFont("helvetica", "normal");

  const contentBottom = PDF_PAGE.height - PDF_PAGE.marginBottom;
  const contentRight = PDF_PAGE.width - PDF_PAGE.marginRight;
  // Explicit `number` — PDF_PAGE is `as const`, so the literal initializer
  // would otherwise pin `y` to `14` and poison every `y +=`.
  let y: number = PDF_PAGE.marginTop;

  /** Keep-together guard: page-break when `needed` mm don't fit. */
  const ensureSpace = (needed: number) => {
    if (y + needed > contentBottom) {
      doc.addPage();
      y = PDF_PAGE.marginTop;
    }
  };

  // ------------------------------------------------------------- Letterhead
  const lh = spec.letterhead;
  const headerTop = y;

  // Right block first: its measured width bounds the left brand text.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(T_TITLE);
  const titleLines = doc.splitTextToSize(lh.title, PDF_CONTENT_WIDTH / 2) as string[];
  let titleWidth = 0;
  for (const line of titleLines) {
    titleWidth = Math.max(titleWidth, doc.getTextWidth(line));
  }
  doc.setFontSize(10);
  const numberWidth = doc.getTextWidth(lh.documentNumber);

  let pillWidth = 0;
  let pillHeight = 0;
  if (lh.status) {
    doc.setFontSize(T_TAGLINE);
    pillWidth = doc.getTextWidth(lh.status.label.toUpperCase()) + ptToMm(16);
    pillHeight = ptToMm(12); // 8pt label + 2pt padding top/bottom
  }
  const rightBlockWidth = Math.max(titleWidth, numberWidth, pillWidth, ptToMm(80));

  // Right block: title / number / status pill, right-aligned.
  let rightY = headerTop;
  doc.setFont("helvetica", "bold");
  setTextColor(doc, PDF_INK);
  doc.setFontSize(T_TITLE);
  for (const line of titleLines) {
    doc.text(line, contentRight, rightY + baselineOffsetMm(T_TITLE), {
      align: "right",
    });
    rightY += ptToMm(T_TITLE); // line-height 1 (CSS)
  }
  rightY += ptToMm(2);
  doc.setFontSize(10);
  doc.text(lh.documentNumber, contentRight, rightY + baselineOffsetMm(10), {
    align: "right",
  });
  rightY += ptToMm(10);

  if (lh.status) {
    const tone = PDF_STATUS_TONES[lh.status.tone];
    const pillX = contentRight - pillWidth;
    const pillY = rightY + ptToMm(2);
    setFillColor(doc, tone.bg);
    doc.roundedRect(pillX, pillY, pillWidth, pillHeight, ptToMm(4), ptToMm(4), "F");
    doc.setFontSize(T_TAGLINE);
    setTextColor(doc, tone.fg);
    doc.text(
      lh.status.label.toUpperCase(),
      pillX + pillWidth / 2,
      pillY + pillHeight / 2 + ptToMm(8) * 0.35,
      { align: "center" },
    );
    rightY = pillY + pillHeight;
  }
  const rightBlockBottom = rightY + ptToMm(2);

  // Left brand block (PrintDocumentParts.Letterhead grammar).
  const brandX = PDF_PAGE.marginLeft;
  const brandPlate = ptToMm(36);
  const brandTextX = brandX + brandPlate + ptToMm(8);
  const brandTextWidth = Math.max(
    contentRight - rightBlockWidth - ptToMm(12) - brandTextX,
    ptToMm(40),
  );

  const initial = (
    lh.identity?.name?.trim()?.charAt(0) || lh.fallbackInitial
  ).toUpperCase();
  setFillColor(doc, PDF_PRIMARY);
  doc.roundedRect(brandX, headerTop, brandPlate, brandPlate, ptToMm(9), ptToMm(9), "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setTextColor(doc, PDF_PAPER);
  doc.text(
    initial,
    brandX + brandPlate / 2,
    headerTop + brandPlate / 2 + ptToMm(18) * 0.35,
    { align: "center" },
  );

  let brandY = headerTop + ptToMm(1); // optical align with the plate top
  const brandLine = (text: string, sizePt: number, color: PdfRgb, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(sizePt);
    setTextColor(doc, color);
    const lines = doc.splitTextToSize(text, brandTextWidth) as string[];
    for (const line of lines) {
      doc.text(line, brandTextX, brandY + baselineOffsetMm(sizePt));
      brandY += ptToMm(sizePt) * BRAND_LINE_HEIGHT;
    }
  };

  brandLine(lh.identity?.name || lh.fallbackName, T_BRAND_NAME, PDF_INK, true);
  for (const line of (lh.identity?.addressLines ?? []).slice(0, 2)) {
    brandLine(line, T_BRAND_LINE, PDF_MUTED);
  }
  const contactBits: string[] = [];
  if (lh.identity?.phone) {
    contactBits.push(`${lh.phoneLabel}: ${lh.identity.phone}`);
  }
  if (lh.identity?.taxId) {
    contactBits.push(`${lh.taxIdLabel}: ${lh.identity.taxId}`);
  }
  if (contactBits.length > 0) {
    brandLine(contactBits.join(" · "), T_BRAND_LINE, PDF_MUTED);
  }
  if (!lh.identity) {
    brandY += ptToMm(2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T_TAGLINE);
    setTextColor(doc, PDF_PRIMARY);
    doc.text(lh.fallbackTagline.toUpperCase(), brandTextX, brandY + baselineOffsetMm(T_TAGLINE));
    brandY += ptToMm(T_TAGLINE) * BRAND_LINE_HEIGHT;
  }

  // Ink rule below the letterhead (padding-bottom 6mm · margin-bottom 8mm).
  const ruleY = Math.max(rightBlockBottom, brandY) + 6;
  drawInkRule(doc, ruleY);
  y = ruleY + 8;

  // -------------------------------------------------------------- Meta grid
  if (spec.meta.length > 0) {
    const colWidth =
      (PDF_CONTENT_WIDTH - (META_GRID_COLUMNS - 1) * META_GRID_GAP_X) /
      META_GRID_COLUMNS;

    // Pre-measure rows — the grid stays whole (CSS break-inside: avoid).
    // Measure under the VALUE font (10pt bold) — the style the drawing
    // loop below wraps with; a stale size would skew the row heights.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T_META_VALUE);
    const rows: DocumentPdfMetaItem[][] = [];
    for (let i = 0; i < spec.meta.length; i += META_GRID_COLUMNS) {
      rows.push(spec.meta.slice(i, i + META_GRID_COLUMNS));
    }
    const rowHeights = rows.map((row) =>
      Math.max(
        ...row.map(
          (item) =>
            baselineOffsetMm(T_META_LABEL) +
            ptToMm(1) +
            wrapCount(doc, item.value, colWidth) *
              ptToMm(T_META_VALUE) *
              BODY_LINE_HEIGHT,
        ),
      ),
    );
    const gridHeight =
      rowHeights.reduce((a, b) => a + b, 0) + (rows.length - 1) * META_GRID_GAP_Y;
    ensureSpace(gridHeight + META_GRID_MARGIN_BOTTOM);

    rows.forEach((row, rowIndex) => {
      row.forEach((item, col) => {
        const x = PDF_PAGE.marginLeft + col * (colWidth + META_GRID_GAP_X);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(T_META_LABEL);
        setTextColor(doc, PDF_MUTED);
        doc.text(item.label.toUpperCase(), x, y + baselineOffsetMm(T_META_LABEL), {
          charSpace: 0.2,
        });
        doc.setFontSize(T_META_VALUE);
        setTextColor(doc, PDF_INK);
        const valueLines = doc.splitTextToSize(item.value, colWidth) as string[];
        valueLines.forEach((line, lineIndex) => {
          doc.text(
            line,
            x,
            y +
              baselineOffsetMm(T_META_LABEL) +
              ptToMm(1) +
              baselineOffsetMm(T_META_VALUE) +
              lineIndex * ptToMm(T_META_VALUE) * BODY_LINE_HEIGHT,
          );
        });
      });
      y += rowHeights[rowIndex] + META_GRID_GAP_Y;
    });
    y += META_GRID_MARGIN_BOTTOM - META_GRID_GAP_Y;
  }

  // ------------------------------------------------------------ Body blocks
  const drawSectionTitle = (title: string) => {
    ensureSpace(ptToMm(T_SECTION_TITLE) * 2 + ptToMm(T_SECTION_BODY) * 3);
    if (y !== PDF_PAGE.marginTop) y += SECTION_GAP;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(T_SECTION_TITLE);
    setTextColor(doc, PDF_INK);
    doc.text(title.toUpperCase(), PDF_PAGE.marginLeft, y + baselineOffsetMm(T_SECTION_TITLE), {
      charSpace: 0.15,
    });
    y += ptToMm(T_SECTION_TITLE) + ptToMm(4);
  };

  const drawSectionBody = (body: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T_SECTION_BODY);
    setTextColor(doc, PDF_INK);
    const lines = doc.splitTextToSize(body, PDF_CONTENT_WIDTH) as string[];
    const lineStep = ptToMm(T_SECTION_BODY) * SECTION_BODY_LINE_HEIGHT;
    for (const line of lines) {
      if (y + lineStep > contentBottom) {
        doc.addPage();
        y = PDF_PAGE.marginTop;
      }
      doc.text(line, PDF_PAGE.marginLeft, y + baselineOffsetMm(T_SECTION_BODY));
      y += lineStep;
    }
  };

  const drawTable = (table: DocumentPdfTableSpec) => {
    if (table.title) drawSectionTitle(table.title);

    const widthSum = table.widths.reduce((a, b) => a + b, 0) || table.columns.length;
    const numeric = new Set(table.numericColumns ?? []);
    const columnStyles: Record<
      number,
      { cellWidth: number; halign: "left" | "right" }
    > = {};
    table.columns.forEach((_, index) => {
      columnStyles[index] = {
        cellWidth: ((table.widths[index] ?? 1) / widthSum) * PDF_CONTENT_WIDTH,
        halign: numeric.has(index) ? "right" : "left",
      };
    });

    // Typed permissively (autoTable's RowInput/CellDef) so the guard row
    // and the mapped data rows share one array type.
    const bodyRows: CellInput[][] = table.rows.map((row) =>
      row.map((cell, index) => ({
        content: cell.text,
        styles: {
          fontStyle: cell.bold ? ("bold" as const) : ("normal" as const),
          halign: (cell.align ?? (numeric.has(index) ? "right" : "left")) as
            | "left"
            | "right",
        },
      })),
    );
    if (table.rows.length === 0) {
      // Explicit guard row instead of a bare header over zero rows.
      bodyRows.push([
        {
          content: table.emptyMessage ?? "—",
          colSpan: table.columns.length,
          styles: {
            halign: "center" as const,
            fontStyle: "italic" as const,
            textColor: PDF_MUTED,
            fillColor: PDF_WASH_SOFT,
          },
        },
      ]);
    }

    const subtotalCell = {
      halign: "right" as const,
      fontStyle: "bold" as const,
      textColor: PDF_INK,
    };
    const foot = table.subtotal
      ? [
          table.columns.length >= 2
            ? [
                { content: table.subtotal.label, colSpan: table.columns.length - 1, styles: subtotalCell },
                { content: table.subtotal.value, styles: subtotalCell },
              ]
            : [
                {
                  content: `${table.subtotal.label} ${table.subtotal.value}`,
                  colSpan: table.columns.length,
                  styles: subtotalCell,
                },
              ],
        ]
      : undefined;

    autoTable(doc, {
      head: [table.columns],
      body: bodyRows,
      foot,
      startY: y,
      margin: {
        top: PDF_PAGE.marginTop,
        bottom: PDF_PAGE.marginBottom,
        left: PDF_PAGE.marginLeft,
        right: PDF_PAGE.marginRight,
      },
      tableWidth: PDF_CONTENT_WIDTH,
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: T_TABLE_BODY,
        textColor: PDF_INK,
        lineColor: PDF_BORDER,
        lineWidth: { top: 0, bottom: HAIRLINE, left: 0, right: 0 },
        cellPadding: { vertical: ptToMm(6), horizontal: ptToMm(6) },
      },
      headStyles: {
        fillColor: PDF_WASH_NEUTRAL,
        textColor: PDF_INK,
        fontStyle: "bold",
        fontSize: T_TABLE_HEAD,
        lineWidth: { top: HAIRLINE, bottom: HAIRLINE, left: 0, right: 0 },
        cellPadding: { top: ptToMm(4), bottom: ptToMm(4), horizontal: ptToMm(6) },
      },
      alternateRowStyles: { fillColor: PDF_WASH_SOFT },
      footStyles: {
        fontSize: T_TABLE_BODY,
        lineWidth: { top: HAIRLINE, bottom: 0, left: 0, right: 0 },
        cellPadding: { vertical: ptToMm(4), horizontal: ptToMm(6) },
      },
      columnStyles,
      rowPageBreak: "avoid",
    });

    // Header row repeats on every fragmented page (autoTable native);
    // the cursor resumes after the table's last body/foot row.
    const after = (doc as AutoTableDocument).lastAutoTable;
    y = (after && typeof after.finalY === "number" ? after.finalY : y) + BLOCK_GAP;
  };

  const drawGrandTotal = (label: string, value: string) => {
    const bandHeight = ptToMm(12) + ptToMm(12); // 12pt value + 6pt padding top/bottom
    ensureSpace(bandHeight + BLOCK_GAP);
    if (y !== PDF_PAGE.marginTop) y += ptToMm(6); // margin-top 6pt
    setFillColor(doc, PDF_INK);
    setDrawColor(doc, PDF_INK);
    doc.setLineWidth(0.35); // 1pt border fallback if background graphics are off
    doc.rect(PDF_PAGE.marginLeft, y, PDF_CONTENT_WIDTH, bandHeight, "FD");
    doc.setFont("helvetica", "bold");
    setTextColor(doc, PDF_PAPER);
    doc.setFontSize(T_GRAND_LABEL);
    doc.text(
      label.toUpperCase(),
      PDF_PAGE.marginLeft + ptToMm(8),
      y + bandHeight / 2 + ptToMm(T_GRAND_LABEL) * 0.35,
      { charSpace: 0.15 },
    );
    doc.setFontSize(T_GRAND_VALUE);
    doc.text(
      value,
      contentRight - ptToMm(8),
      y + bandHeight / 2 + ptToMm(T_GRAND_VALUE) * 0.35,
      { align: "right" },
    );
    y += bandHeight;
  };

  for (const block of spec.blocks) {
    if (block.kind === "section") {
      drawSectionTitle(block.title);
      drawSectionBody(block.body);
    } else if (block.kind === "table") {
      drawTable(block.table);
    } else {
      drawGrandTotal(block.label, block.value);
    }
  }

  // ------------------------------------------------------------- Signatures
  if (spec.signatures.length > 0) {
    const columns = Math.min(spec.signatures.length, 3);
    const sigWidth = (PDF_CONTENT_WIDTH - (columns - 1) * SIGNATURE_GAP) / columns;
    const sigHeights = spec.signatures.map(
      (sig) =>
        ptToMm(24) + // pen space (CSS padding-top)
        ptToMm(4) +
        ptToMm(T_SIGNATURE_NAME) +
        ptToMm(2) +
        ptToMm(T_SIGNATURE_LABEL) +
        (sig.meta ? ptToMm(2) + ptToMm(7.5) : 0),
    );
    ensureSpace(Math.max(...sigHeights) + SIGNATURE_MARGIN_TOP);
    if (y !== PDF_PAGE.marginTop) y += SIGNATURE_MARGIN_TOP;

    spec.signatures.forEach((sig, index) => {
      const x = PDF_PAGE.marginLeft + index * (sigWidth + SIGNATURE_GAP);
      const ruleY = y + ptToMm(24);
      setDrawColor(doc, PDF_INK);
      doc.setLineWidth(HAIRLINE);
      doc.line(x, ruleY, x + sigWidth, ruleY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(T_SIGNATURE_NAME);
      setTextColor(doc, PDF_INK);
      doc.text(sig.name ?? "", x + sigWidth / 2, ruleY + ptToMm(4) + baselineOffsetMm(T_SIGNATURE_NAME), {
        align: "center",
      });
      doc.setFontSize(T_SIGNATURE_LABEL);
      setTextColor(doc, PDF_MUTED);
      doc.text(
        sig.label.toUpperCase(),
        x + sigWidth / 2,
        ruleY +
          ptToMm(4) +
          ptToMm(T_SIGNATURE_NAME) +
          ptToMm(2) +
          baselineOffsetMm(T_SIGNATURE_LABEL),
        { align: "center" },
      );
      if (sig.meta) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(
          sig.meta,
          x + sigWidth / 2,
          ruleY +
            ptToMm(4) +
            ptToMm(T_SIGNATURE_NAME) +
            ptToMm(2) +
            ptToMm(T_SIGNATURE_LABEL) +
            ptToMm(2) +
            baselineOffsetMm(7.5),
          { align: "center" },
        );
      }
    });
    y += Math.max(...sigHeights);
  }

  // ------------------------------------------------- Footer pass (all pages)
  const total = doc.getNumberOfPages();
  const pageIndicator = (page: number) =>
    spec.footer.pageIndicator
      ? spec.footer.pageIndicator(page, total)
      : `Page ${page} of ${total}`;

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    setDrawColor(doc, PDF_BORDER);
    doc.setLineWidth(HAIRLINE);
    doc.line(PDF_PAGE.marginLeft, PDF_FOOTER_RULE_Y, contentRight, PDF_FOOTER_RULE_Y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(T_FOOTER);
    setTextColor(doc, PDF_MUTED);
    doc.text(lh.documentNumber, PDF_PAGE.marginLeft, PDF_FOOTER_TEXT_BASELINE);
    doc.text(
      `${spec.footer.printedOn} · ${pageIndicator(page)}`,
      contentRight,
      PDF_FOOTER_TEXT_BASELINE,
      { align: "right" },
    );
  }

  return doc;
};

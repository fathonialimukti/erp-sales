/**
 * Print ink palette + page geometry for the client-side jsPDF documents
 * (docs/plans/jspdf-documents — Task J-T1 foundation).
 *
 * The RGB values are a MIRROR of the canonical hex source
 * `apps/server/src/lib/print-palette.ts` — KEEP IN SYNC. A PDF has no CSS
 * runtime (live CSS variables would leak dark-mode values onto paper), so
 * the ink colors ship as RGB tuples derived from the same light-mode
 * OKLCH tokens named by docs/design-system/DESIGN.md. The screen chrome
 * (PdfDocumentModal) uses semantic Tailwind tokens instead — these
 * constants must never appear in JSX.
 *
 * Pure data + pure helpers only: no jsPDF imports, no DOM, no React —
 * relative imports (no `@/` alias) keep a config-less root vitest run
 * importable, same rationale as lib/print/print-format.ts.
 */

/** jsPDF RGB tuple (0–255 per channel) for setFillColor/setTextColor/setDrawColor. */
export type PdfRgb = [number, number, number];

const fromHex = (hex: string): PdfRgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// --- Ink (text / hairlines) — mirrors apps/server/src/lib/print-palette.ts ---
/** Body & heading text — `--foreground` (PRINT_INK #080D16). */
export const PDF_INK = fromHex("#080D16");
/** Secondary/meta text — deepened Aurora Azure (PRINT_MUTED #003B67). */
export const PDF_MUTED = fromHex("#003B67");
/** Hairlines & dividers — `--border` (PRINT_BORDER #D6DFE7). */
export const PDF_BORDER = fromHex("#D6DFE7");
/** Paper white (PRINT_PAPER #FFFFFF). */
export const PDF_PAPER = fromHex("#FFFFFF");

// --- Brand ---
/** Aurora Azure — `--primary` (PRINT_PRIMARY #0069A6). */
export const PDF_PRIMARY = fromHex("#0069A6");

// --- Semantic status colors (design law §2) ---
/** Approved / positive — `--success` (PRINT_SUCCESS #00A859). */
export const PDF_SUCCESS = fromHex("#00A859");
/** Caution — `--warning` (PRINT_WARNING #EF9900). */
export const PDF_WARNING = fromHex("#EF9900");
/** Rejected / destructive — `--destructive` (PRINT_DESTRUCTIVE #E7000B). */
export const PDF_DESTRUCTIVE = fromHex("#E7000B");

// --- Soft washes for status plates / table stripes ---
/** Neutral plate (Draft) — 50% border over white (PRINT_WASH_NEUTRAL #EAEFF3). */
export const PDF_WASH_NEUTRAL = fromHex("#EAEFF3");
/** Quiet stripe for row scanning (PRINT_WASH_SOFT #F4F7F9). */
export const PDF_WASH_SOFT = fromHex("#F4F7F9");
/** Primary wash — `bg-primary/10` equivalent (PRINT_WASH_PRIMARY #E6F0F6). */
export const PDF_WASH_PRIMARY = fromHex("#E6F0F6");
/** Success wash — `bg-success/15` equivalent (PRINT_WASH_SUCCESS #D9F2E6). */
export const PDF_WASH_SUCCESS = fromHex("#D9F2E6");
/** Destructive wash — `bg-destructive/10` equivalent (PRINT_WASH_DESTRUCTIVE #FDE6E7). */
export const PDF_WASH_DESTRUCTIVE = fromHex("#FDE6E7");

/**
 * Approval-status tone → pill colors (design law chip map: never color
 * alone — the label always travels with the tone in the spec).
 * DRAFT→neutral · VALIDATING/AI_VALIDATED/PROPOSED→primary ·
 * APPROVED→success · REJECTED→destructive.
 */
export type DocumentPdfStatusTone =
  | "neutral"
  | "primary"
  | "success"
  | "destructive";

export const PDF_STATUS_TONES: Record<
  DocumentPdfStatusTone,
  { bg: PdfRgb; fg: PdfRgb }
> = {
  neutral: { bg: PDF_WASH_NEUTRAL, fg: PDF_INK },
  primary: { bg: PDF_WASH_PRIMARY, fg: PDF_PRIMARY },
  success: { bg: PDF_WASH_SUCCESS, fg: PDF_SUCCESS },
  destructive: { bg: PDF_WASH_DESTRUCTIVE, fg: PDF_DESTRUCTIVE },
};

/** Raw approval-status enum → frozen print-status tone (neutral fallback). */
export const documentStatusTone = (status: string): DocumentPdfStatusTone => {
  switch (status.toUpperCase()) {
    case "VALIDATING":
    case "AI_VALIDATED":
    case "PROPOSED":
      return "primary";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "destructive";
    default:
      return "neutral";
  }
};

/**
 * A4 portrait geometry — mirrors the `@page` block of
 * styles/print-document.css: margins 14mm top/bottom, 12mm left/right.
 */
export const PDF_PAGE = {
  /** A4 width in mm. */
  width: 210,
  /** A4 height in mm. */
  height: 297,
  marginTop: 14,
  marginBottom: 14,
  marginLeft: 12,
  marginRight: 12,
} as const;

/** Usable line width between the left/right margins (210 − 24). */
export const PDF_CONTENT_WIDTH =
  PDF_PAGE.width - PDF_PAGE.marginLeft - PDF_PAGE.marginRight;

/**
 * Every-page footer baseline metrics: the rule sits inside the bottom
 * margin band, below the content area (content bottom = 283), so table
 * content and footer never collide.
 */
export const PDF_FOOTER_RULE_Y = PDF_PAGE.height - PDF_PAGE.marginBottom + 6;
export const PDF_FOOTER_TEXT_BASELINE =
  PDF_FOOTER_RULE_Y + 3.5;

/** mm per pt — jsPDF font sizes are pt even in mm-unit documents. */
export const ptToMm = (pt: number): number => (pt * 25.4) / 72;

/**
 * Baseline offset from the top of a text line (approx. ascent = 0.8em
 * covers Helvetica cap + accent height) for top-anchored text placement.
 */
export const baselineOffsetMm = (fontSizePt: number): number =>
  ptToMm(fontSizePt) * 0.8;

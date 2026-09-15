import type {
  DocumentPdfBlock,
  DocumentPdfSpec,
  DocumentPdfTableSpec,
  PdfCompanyIdentity,
} from "../../lib/pdf/documentPdf";
import { documentStatusTone } from "../../lib/pdf/pdfTheme";
import {
  formatDateTime,
  formatDocumentMoney,
  titleCase,
  toNum,
} from "../../lib/print/print-format";

/**
 * Event Proposal → jsPDF document mapping (docs/plans/jspdf-documents,
 * Task J-T3). Pure data module — no React, no DOM, no jsPDF — so a
 * config-less node vitest run can import it (relative imports only, no
 * `@/` aliases; `documentPdf` types arrive via `import type`, erased at
 * runtime). The rendering/pagination itself is the frozen shared renderer
 * (lib/pdf/documentPdf.ts); this module ONLY maps record data into a
 * `DocumentPdfSpec` with every label pre-resolved by the caller's
 * captured `intl` (the renderer does zero i18n).
 *
 * CONTENT is ported 1:1 from the deleted EventProposalPrintSheet:
 *  - Event dates are `@db.Date` columns (date-only semantics) and keep
 *    the sheet's UTC `formatDocumentDate`/`formatEventDateRange` — a
 *    host west of UTC must not shift the printed calendar day. (The
 *    footer's printed-on stamp is a real instant → local time, via
 *    formatDateTime in print-format.)
 *  - Table column widths are the frozen fractions from
 *    EventProposalPrintSheet.css (SKUs 16/44/10/15/15 · Misc
 *    34/20/10/18/18 · Vendors 40/35/25).
 *  - Per-row notes render as a second line inside the item cell (the
 *    sheet's `__note` div) — a `\n` in the cell text, which the shared
 *    autoTable renderer wraps natively.
 *  - Subtotals follow the stored row values the tables print; the grand
 *    total mirrors the server's committed `plannedCost`
 *    (budget-calc.ts: Σ sku.total + Σ misc qty×price + Σ vendor.amount)
 *    with the computed sum only as fallback — under the server's own
 *    invariant (misc.total = qty×price) the two always agree.
 *  - Signature trio: Proposed by / Area Manager / Director, the
 *    approvers carrying an "Approved on {date}" meta line.
 */

/** Wire shape of the `eventProposal.detail` payload the PDF renders. */
export interface EventProposalPdfRecord {
  id: string;
  documentNumber: string | null;
  name: string;
  description: string | null;
  venue: string | null;
  eventDate: string;
  eventEndDate: string | null;
  organizerName: string | null;
  organizerContact: string | null;
  observationDays: number;
  currency: string;
  approvalStatus: string;
  plannedCost: number;
  area: { id: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
  eventType: { id: string; code: string; name: string } | null;
  skus: {
    skuId: string;
    quantity: number;
    price: number;
    tax: number;
    total: number;
    notes: string | null;
    sku: { id: string; name: string; code: string | null };
  }[];
  miscItems: {
    id: string;
    name: string;
    category: string | null;
    quantity: number;
    price: number;
    total: number;
    notes: string | null;
  }[];
  vendors: {
    id: string;
    scope: string | null;
    amount: number;
    notes: string | null;
    vendor: { id: string; name: string };
  }[];
  areaManagerApprovedAt: string | null;
  directorApprovedAt: string | null;
}

// ---------------------------------------------------------------------------
// Calendar-date formatters (`@db.Date` columns — UTC, ported verbatim)
// ---------------------------------------------------------------------------

/**
 * Calendar-date formatting. Event dates are `@db.Date` columns (date-only
 * semantics), so they render in UTC — otherwise a host west of UTC would
 * print the previous calendar day. (The footer's printed-on timestamp is a
 * real instant and keeps local time — see formatDateTime in print-format.)
 */
export const formatDocumentDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
};

export const formatEventDateRange = (
  start: string | null | undefined,
  end: string | null | undefined,
): string => {
  if (!start) return "—";
  if (!end) return formatDocumentDate(start);
  return `${formatDocumentDate(start)} – ${formatDocumentDate(end)}`;
};

// ---------------------------------------------------------------------------
// Cost roll-up (ported verbatim)
// ---------------------------------------------------------------------------

/**
 * Cost summary for the totals rows + grand-total band.
 *
 * Subtotals follow the stored row values the tables print (skus.total,
 * vendors.amount). The grand total mirrors the server's committed
 * `plannedCost` (budget-calc.ts: Σ sku.total + Σ misc qty×price +
 * Σ vendor.amount); the computed sum is only a fallback if the field were
 * missing. Under the server's own invariant (misc.total = qty×price, enforced
 * on every save) the two always agree.
 */
export const buildCostSummary = (record: EventProposalPdfRecord) => {
  const skusSubtotal = record.skus.reduce((acc, s) => acc + toNum(s.total), 0);
  const miscSubtotal = record.miscItems.reduce((acc, m) => acc + toNum(m.total), 0);
  const vendorsSubtotal = record.vendors.reduce((acc, v) => acc + toNum(v.amount), 0);
  const computed = skusSubtotal + miscSubtotal + vendorsSubtotal;
  return {
    skusSubtotal,
    miscSubtotal,
    vendorsSubtotal,
    grandTotal: toNum(record.plannedCost) || computed,
  };
};

/** Document number with the sheet's `EP #<id8>` fallback. */
export const eventProposalDocumentNumber = (record: EventProposalPdfRecord): string =>
  record.documentNumber ?? `EP #${record.id.slice(0, 8).toUpperCase()}`;

// ---------------------------------------------------------------------------
// Labels (i18n seam — the caller captures `intl` and passes formatMessage)
// ---------------------------------------------------------------------------

/**
 * Minimal shape the page binds to its captured `intl.formatMessage`
 * (same `(id, defaultMessage, values)` helper the deleted sheet used).
 */
export type EventProposalPdfFormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number | boolean>,
) => string;

/**
 * Approval status → i18n label (never a raw enum). Unknown statuses fall
 * back to Title Case — including AI_VALIDATED, which has no dedicated
 * key in the frozen locale set (sheet behavior preserved).
 */
export const EVENT_PROPOSAL_PDF_STATUS_LABELS: Record<
  string,
  { id: string; defaultMessage: string }
> = {
  DRAFT: { id: "event_proposal.print.status.draft", defaultMessage: "Draft" },
  VALIDATING: {
    id: "event_proposal.print.status.validating",
    defaultMessage: "Validated",
  },
  PROPOSED: {
    id: "event_proposal.print.status.proposed",
    defaultMessage: "Pending Approval",
  },
  APPROVED: {
    id: "event_proposal.print.status.approved",
    defaultMessage: "Approved",
  },
  REJECTED: {
    id: "event_proposal.print.status.rejected",
    defaultMessage: "Rejected",
  },
};

/**
 * Every label the spec needs, pre-resolved through the caller's captured
 * `intl`. The `statusLabel`/`signatureApprovedOn` resolvers stay data-
 * dependent (status enum / approval date); `printedOn` is stamped at
 * labels-build time — i.e. when the PDF bytes are built, the natural
 * equivalent of the deleted sheet's render-time stamp.
 */
export interface EventProposalPdfLabels {
  fallbackName: string;
  fallbackTagline: string;
  phoneLabel: string;
  taxIdLabel: string;
  title: string;
  statusLabel: (status: string) => string;
  metaEvent: string;
  metaEventType: string;
  metaVenue: string;
  metaEventDate: string;
  metaArea: string;
  metaOrganizer: string;
  metaCurrency: string;
  metaObservationDays: string;
  descriptionTitle: string;
  skusTitle: string;
  colCode: string;
  colProduct: string;
  colQty: string;
  colPrice: string;
  colTotal: string;
  emptySkus: string;
  totalsSkus: string;
  sectionMisc: string;
  colItem: string;
  colCategory: string;
  emptyMisc: string;
  totalsMisc: string;
  sectionVendors: string;
  colVendor: string;
  colScope: string;
  emptyVendors: string;
  totalsVendors: string;
  totalsGrand: string;
  signatureProposer: string;
  signatureAreaManager: string;
  signatureDirector: string;
  signatureApprovedOn: (date: string) => string;
  printedOn: string;
}

export const buildEventProposalPdfLabels = (
  t: EventProposalPdfFormatMessage,
): EventProposalPdfLabels => ({
  fallbackName: t("nav.brand_name", "B2B CRM"),
  fallbackTagline: t("nav.brand_sub", "Sales OS"),
  phoneLabel: t("event_proposal.print.company_phone", "Phone"),
  taxIdLabel: t("event_proposal.print.company_tax_id", "Tax ID"),
  title: t("event_proposal.print.title", "Event Proposal"),
  statusLabel: (status) => {
    const entry = EVENT_PROPOSAL_PDF_STATUS_LABELS[status.toUpperCase()];
    return entry ? t(entry.id, entry.defaultMessage) : titleCase(status);
  },
  metaEvent: t("event_proposal.print.meta_event", "Event"),
  metaEventType: t("event_proposal.detail.type_label", "Event Type"),
  metaVenue: t("event_proposal.detail.venue_label", "Venue"),
  metaEventDate: t("event_proposal.detail.event_date_label", "Event Date"),
  metaArea: t("event_proposal.detail.area_label", "Area"),
  metaOrganizer: t("event_proposal.print.meta_organizer", "Organizer"),
  metaCurrency: t("event_proposal.print.meta_currency", "Currency"),
  metaObservationDays: t("event_proposal.print.meta_observation", "Observation days"),
  descriptionTitle: t("event_proposal.detail.description_label", "Description"),
  skusTitle: t("event_proposal.detail.skus_title", "SKUs"),
  colCode: t("event_proposal.print.col_code", "Code"),
  colProduct: t("event_proposal.print.col_product", "Product"),
  colQty: t("event_proposal.print.col_qty", "Qty"),
  colPrice: t("event_proposal.print.col_price", "Price"),
  colTotal: t("event_proposal.print.col_total", "Total"),
  emptySkus: t("event_proposal.print.empty_skus", "No SKUs."),
  totalsSkus: t("event_proposal.print.totals_skus", "SKUs subtotal"),
  sectionMisc: t("event_proposal.print.section_misc", "Miscellaneous items"),
  colItem: t("event_proposal.print.col_item", "Item"),
  colCategory: t("event_proposal.print.col_category", "Category"),
  emptyMisc: t("event_proposal.print.empty_misc", "No miscellaneous items."),
  totalsMisc: t("event_proposal.print.totals_misc", "Miscellaneous subtotal"),
  sectionVendors: t("event_proposal.print.section_vendors", "Vendors"),
  colVendor: t("event_proposal.print.col_vendor", "Vendor"),
  colScope: t("event_proposal.print.col_scope", "Scope"),
  emptyVendors: t("event_proposal.print.empty_vendors", "No vendors."),
  totalsVendors: t("event_proposal.print.totals_vendors", "Vendors subtotal"),
  totalsGrand: t("event_proposal.print.totals_grand", "Planned total"),
  signatureProposer: t("event_proposal.print.signature_proposer", "Proposed by"),
  signatureAreaManager: t(
    "event_proposal.print.signature_area_manager",
    "Area Manager",
  ),
  signatureDirector: t("event_proposal.print.signature_director", "Director"),
  signatureApprovedOn: (date) =>
    t("event_proposal.print.signature_approved_on", "Approved on {date}", { date }),
  printedOn: t("event_proposal.print.meta_printed", "Printed on {date}", {
    date: formatDateTime(new Date().toISOString()),
  }),
});

// ---------------------------------------------------------------------------
// Spec mapping
// ---------------------------------------------------------------------------

/** Item cell with the sheet's muted note line under the primary text. */
const withNotes = (text: string, notes: string | null): string =>
  notes ? `${text}\n${notes}` : text;

/**
 * Build the full document spec. Pure: same record + identity + labels in,
 * same spec out — the modal hands it the company identity it resolved.
 */
export const buildEventProposalPdfSpec = (
  record: EventProposalPdfRecord,
  identity: PdfCompanyIdentity | null,
  labels: EventProposalPdfLabels,
): DocumentPdfSpec => {
  const { skusSubtotal, miscSubtotal, vendorsSubtotal, grandTotal } =
    buildCostSummary(record);
  const docNumber = eventProposalDocumentNumber(record);

  const money = (value: unknown) => formatDocumentMoney(value, record.currency);

  const organizer = [record.organizerName, record.organizerContact]
    .filter(Boolean)
    .join(" · ");

  const blocks: DocumentPdfBlock[] = [];

  if (record.description) {
    blocks.push({
      kind: "section",
      title: labels.descriptionTitle,
      body: record.description,
    });
  }

  const skusTable: DocumentPdfTableSpec = {
    title: labels.skusTitle,
    columns: [
      labels.colCode,
      labels.colProduct,
      labels.colQty,
      labels.colPrice,
      labels.colTotal,
    ],
    // Frozen fractions from EventProposalPrintSheet.css (--skus table).
    widths: [0.16, 0.44, 0.1, 0.15, 0.15],
    numericColumns: [2, 3, 4],
    rows: record.skus.map((row) => [
      { text: row.sku.code ?? "—" },
      { text: withNotes(row.sku.name, row.notes) },
      { text: String(toNum(row.quantity)) },
      { text: money(row.price) },
      { text: money(row.total), bold: true },
    ]),
    subtotal: { label: labels.totalsSkus, value: money(skusSubtotal) },
    emptyMessage: labels.emptySkus,
  };
  blocks.push({ kind: "table", table: skusTable });

  const miscTable: DocumentPdfTableSpec = {
    title: labels.sectionMisc,
    columns: [
      labels.colItem,
      labels.colCategory,
      labels.colQty,
      labels.colPrice,
      labels.colTotal,
    ],
    // Frozen fractions from EventProposalPrintSheet.css (--misc table).
    widths: [0.34, 0.2, 0.1, 0.18, 0.18],
    numericColumns: [2, 3, 4],
    rows: record.miscItems.map((row) => [
      { text: withNotes(row.name, row.notes) },
      { text: row.category ?? "—" },
      { text: String(toNum(row.quantity)) },
      { text: money(row.price) },
      { text: money(row.total), bold: true },
    ]),
    subtotal: { label: labels.totalsMisc, value: money(miscSubtotal) },
    emptyMessage: labels.emptyMisc,
  };
  blocks.push({ kind: "table", table: miscTable });

  const vendorsTable: DocumentPdfTableSpec = {
    title: labels.sectionVendors,
    columns: [labels.colVendor, labels.colScope, labels.colTotal],
    // Frozen fractions from EventProposalPrintSheet.css (--vendors table).
    widths: [0.4, 0.35, 0.25],
    numericColumns: [2],
    rows: record.vendors.map((row) => [
      { text: withNotes(row.vendor.name, row.notes) },
      { text: row.scope ?? "—" },
      { text: money(row.amount), bold: true },
    ]),
    subtotal: { label: labels.totalsVendors, value: money(vendorsSubtotal) },
    emptyMessage: labels.emptyVendors,
  };
  blocks.push({ kind: "table", table: vendorsTable });

  // Grand total OUTSIDE the tables (the sheet's print-document__grand-band).
  blocks.push({
    kind: "grandTotal",
    label: labels.totalsGrand,
    value: money(grandTotal),
  });

  return {
    letterhead: {
      identity,
      fallbackInitial: "E",
      fallbackName: labels.fallbackName,
      fallbackTagline: labels.fallbackTagline,
      phoneLabel: labels.phoneLabel,
      taxIdLabel: labels.taxIdLabel,
      title: labels.title,
      documentNumber: docNumber,
      status: {
        label: labels.statusLabel(record.approvalStatus),
        tone: documentStatusTone(record.approvalStatus),
      },
    },
    meta: [
      { label: labels.metaEvent, value: record.name },
      { label: labels.metaEventType, value: record.eventType?.name ?? "—" },
      { label: labels.metaVenue, value: record.venue ?? "—" },
      {
        label: labels.metaEventDate,
        value: formatEventDateRange(record.eventDate, record.eventEndDate),
      },
      { label: labels.metaArea, value: record.area?.name ?? "—" },
      { label: labels.metaOrganizer, value: organizer || "—" },
      { label: labels.metaCurrency, value: record.currency },
      {
        label: labels.metaObservationDays,
        value: String(record.observationDays ?? 0),
      },
    ],
    blocks,
    signatures: [
      { label: labels.signatureProposer, name: record.createdBy?.name ?? "—" },
      {
        label: labels.signatureAreaManager,
        meta: record.areaManagerApprovedAt
          ? labels.signatureApprovedOn(formatDocumentDate(record.areaManagerApprovedAt))
          : undefined,
      },
      {
        label: labels.signatureDirector,
        meta: record.directorApprovedAt
          ? labels.signatureApprovedOn(formatDocumentDate(record.directorApprovedAt))
          : undefined,
      },
    ],
    footer: { printedOn: labels.printedOn },
  };
};

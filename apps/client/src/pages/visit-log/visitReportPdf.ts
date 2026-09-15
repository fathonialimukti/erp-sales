import type {
  DocumentPdfBlock,
  DocumentPdfSpec,
  PdfCompanyIdentity,
} from "../../lib/pdf/documentPdf";
import { documentStatusTone } from "../../lib/pdf/pdfTheme";
import { formatDateTime, titleCase } from "../../lib/print/print-format";

/**
 * Visit Report → DocumentPdfSpec mapping (docs/plans/jspdf-documents,
 * Task J-T4). Pure data module: no React, no DOM, no tRPC. The page
 * captures `intl` and binds the `(id, defaultMessage, values)` helper
 * into `buildVisitReportPdfLabels`, so the label keys/defaultMessages
 * live here (this module resolves them via the captured formatMessage)
 * while the spec builder consumes the pre-resolved bag as plain data —
 * the renderer does ZERO i18n.
 *
 * Document CONTENT is preserved 1:1 from the print sheet it replaces
 * (VisitReportPrintSheet.tsx, deleted in this task — only the rendering
 * engine changed): letterhead (identity / generic CRM fallback) → title
 * "Visit Report" + `VR #<id8>` doc number + approval-status pill →
 * 8-cell meta grid (timing + who/where) → purpose section (OMITTED when
 * null — deliberate) → notes + feedback sections (always printed, with
 * explicit empty states) → single "Visited by" signature → printed-on
 * footer. The visit domain has NO tabular line data and NO money, so
 * there are no table/grand-total blocks.
 *
 * Photos: the `VisitLog.photos` column is an opaque `Json?` blob with no
 * defined shape and no accessible URL serving — omitted from the
 * document (gap reported per the plan), not hacked around.
 *
 * Money: deliberately none. The linked sales order's `grandTotal` is not
 * printed because the visit domain carries no currency field; the
 * document links the order by document number instead.
 *
 * Import rules: relative imports only, no `@/` aliases, no DOM access —
 * a config-less node vitest run imports this module directly (the
 * documentPdf spec types arrive via `import type`, so jsPDF itself never
 * loads here).
 */

/**
 * Structural view of the `visitLog.detail` output — only the fields this
 * document prints (no invented fields; mirrors the router's include).
 * Dates arrive as ISO strings over the wire (no transformer); `Date` is
 * accepted too. `salesman.name` is typed nullable defensively.
 */
export interface VisitReportPdfRecord {
  id: string;
  date: string | Date;
  checkInAt: string | Date | null;
  checkOutAt: string | Date | null;
  approvalStatus: string;
  purpose: string | null;
  notes: string | null;
  feedback: string | null;
  salesman: { id: string; name: string | null } | null;
  outlet: {
    id: string;
    name: string;
    customer: { id: string; name: string } | null;
    area: { id: string; name: string } | null;
  } | null;
  salesOrder: { id: string; documentNumber: string | null } | null;
}

/*
 * Domain mapping helpers, exported for the scoped mapping tests. The
 * genuinely shared formatters (printed-on timestamp, enum Title Case)
 * live in lib/print/print-format.ts; this module keeps only what is
 * genuinely visit-specific.
 */

/**
 * Visit `date` is a `@db.Date` column (date-only semantics), so it
 * renders in UTC — otherwise a host west of UTC would print the previous
 * calendar day. (Check-in/out below are real instants and keep local
 * time; the footer's printed-on timestamp uses the shared formatDateTime.)
 */
export const formatVisitDate = (
  value: string | Date | null | undefined,
): string => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
};

/**
 * Check-in / check-out are real timestamps (DateTime, not `@db.Date`) —
 * they render in LOCAL time with the time-of-day the salesman clocked.
 */
export const formatVisitTimestamp = (
  value: string | Date | null | undefined,
): string => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
};

/**
 * Document number — the visit domain has no documentNumber column, so
 * the sheet's `VR #<id8>` fallback (uppercased first 8 ULID chars) IS
 * the document number. Also drives the download file name.
 */
export const visitReportDocumentNumber = (record: VisitReportPdfRecord): string =>
  `VR #${record.id.slice(0, 8).toUpperCase()}`;

// ---------------------------------------------------------------------------
// Labels (i18n seam — the caller captures `intl` and passes formatMessage)
// ---------------------------------------------------------------------------

/**
 * Minimal shape the page binds to its captured `intl.formatMessage`
 * (same `(id, defaultMessage, values)` helper the deleted sheet used).
 */
export type VisitReportPdfFormatMessage = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number | boolean>,
) => string;

/**
 * Approval status → i18n label (never a raw enum); reuses the existing
 * `visit_log.index.status_*` keys the index/detail chips already use —
 * the visit print block has no dedicated status keys of its own.
 */
export const VISIT_REPORT_PDF_STATUS_LABELS: Record<
  string,
  { id: string; defaultMessage: string }
> = {
  DRAFT: { id: "visit_log.index.status_draft", defaultMessage: "Draft" },
  VALIDATING: {
    id: "visit_log.index.status_validating",
    defaultMessage: "AI Processing",
  },
  PROPOSED: {
    id: "visit_log.index.status_proposed",
    defaultMessage: "Pending Approval",
  },
  APPROVED: {
    id: "visit_log.index.status_approved",
    defaultMessage: "Approved",
  },
  REJECTED: {
    id: "visit_log.index.status_rejected",
    defaultMessage: "Rejected",
  },
};

/**
 * Every label the spec needs, pre-resolved through the caller's captured
 * `intl`. The `statusLabel` resolver stays data-dependent (status enum);
 * `printedOn` is stamped at labels-build time — i.e. when the PDF bytes
 * are built, the natural equivalent of the deleted sheet's render-time
 * stamp.
 */
export interface VisitReportPdfLabels {
  fallbackName: string;
  fallbackTagline: string;
  phoneLabel: string;
  taxIdLabel: string;
  title: string;
  statusLabel: (status: string) => string;
  metaDate: string;
  metaSalesman: string;
  metaOutlet: string;
  metaCustomer: string;
  metaArea: string;
  metaCheckIn: string;
  metaCheckOut: string;
  metaLinkedOrder: string;
  purposeTitle: string;
  notesTitle: string;
  emptyNotes: string;
  feedbackTitle: string;
  emptyFeedback: string;
  signatureVisitedBy: string;
  printedOn: string;
}

export const buildVisitReportPdfLabels = (
  t: VisitReportPdfFormatMessage,
): VisitReportPdfLabels => ({
  fallbackName: t("nav.brand_name", "B2B CRM"),
  fallbackTagline: t("nav.brand_sub", "Sales OS"),
  phoneLabel: t("visit_log.print.company_phone", "Phone"),
  taxIdLabel: t("visit_log.print.company_tax_id", "Tax ID"),
  title: t("visit_log.print.title", "Visit Report"),
  statusLabel: (status) => {
    const entry = VISIT_REPORT_PDF_STATUS_LABELS[status.toUpperCase()];
    return entry ? t(entry.id, entry.defaultMessage) : titleCase(status);
  },
  metaDate: t("visit_log.detail.date_label", "Date"),
  metaSalesman: t("visit_log.detail.salesman_label", "Salesman"),
  metaOutlet: t("visit_log.detail.outlet_label", "Outlet"),
  metaCustomer: t("visit_log.print.meta_customer", "Customer"),
  metaArea: t("visit_log.print.meta_area", "Area"),
  metaCheckIn: t("visit_log.print.meta_check_in", "Check-in"),
  metaCheckOut: t("visit_log.print.meta_check_out", "Check-out"),
  metaLinkedOrder: t("visit_log.print.meta_linked_order", "Linked sales order"),
  purposeTitle: t("visit_log.detail.purpose_label", "Purpose"),
  notesTitle: t("visit_log.detail.notes_label", "Notes"),
  emptyNotes: t("visit_log.print.empty_notes", "No notes recorded."),
  feedbackTitle: t("visit_log.print.section_feedback", "Feedback"),
  emptyFeedback: t("visit_log.print.empty_feedback", "No feedback recorded."),
  signatureVisitedBy: t("visit_log.print.signature_visited_by", "Visited by"),
  printedOn: t("visit_log.print.printed_on", "Printed on {date}", {
    date: formatDateTime(new Date().toISOString()),
  }),
});

// ---------------------------------------------------------------------------
// Spec mapping
// ---------------------------------------------------------------------------

/**
 * Build the full document spec. Pure: same record + identity + labels
 * in, same spec out — the modal hands it the company identity it
 * resolved.
 */
export const buildVisitReportPdfSpec = (
  record: VisitReportPdfRecord,
  identity: PdfCompanyIdentity | null,
  labels: VisitReportPdfLabels,
): DocumentPdfSpec => {
  const docNumber = visitReportDocumentNumber(record);

  // Linked-order identifier follows the detail page's convention
  // (document number, falling back to the raw id).
  const linkedOrder = record.salesOrder
    ? (record.salesOrder.documentNumber ?? record.salesOrder.id)
    : "—";

  const blocks: DocumentPdfBlock[] = [];

  // Purpose (optional intent; omitted when unset — deliberate).
  if (record.purpose) {
    blocks.push({
      kind: "section",
      title: labels.purposeTitle,
      body: record.purpose,
    });
  }

  // Notes (the substance of a visit report — always printed, with an
  // explicit empty state when nothing was recorded).
  blocks.push({
    kind: "section",
    title: labels.notesTitle,
    body: record.notes ?? labels.emptyNotes,
  });

  // Feedback (the visit outcome — always printed).
  blocks.push({
    kind: "section",
    title: labels.feedbackTitle,
    body: record.feedback ?? labels.emptyFeedback,
  });

  return {
    letterhead: {
      identity,
      fallbackInitial: "V",
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
      { label: labels.metaDate, value: formatVisitDate(record.date) },
      { label: labels.metaSalesman, value: record.salesman?.name ?? "—" },
      { label: labels.metaOutlet, value: record.outlet?.name ?? "—" },
      {
        label: labels.metaCustomer,
        value: record.outlet?.customer?.name ?? "—",
      },
      { label: labels.metaArea, value: record.outlet?.area?.name ?? "—" },
      {
        label: labels.metaCheckIn,
        value: formatVisitTimestamp(record.checkInAt),
      },
      {
        label: labels.metaCheckOut,
        value: formatVisitTimestamp(record.checkOutAt),
      },
      { label: labels.metaLinkedOrder, value: linkedOrder },
    ],
    blocks,
    // The domain carries no outlet-acknowledgement field, so per the
    // content contract there is a single signer.
    signatures: [
      {
        label: labels.signatureVisitedBy,
        name: record.salesman?.name ?? "",
      },
    ],
    footer: { printedOn: labels.printedOn },
  };
};

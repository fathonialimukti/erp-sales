import { documentStatusTone } from "../../lib/pdf/pdfTheme.js";
import type {
  DocumentPdfBlock,
  DocumentPdfMetaItem,
  DocumentPdfSpec,
  DocumentPdfTableCell,
  PdfCompanyIdentity,
} from "../../lib/pdf/documentPdf.js";
import {
  formatDateTime,
  formatDocumentMoney,
  titleCase,
  toNum,
} from "../../lib/print/print-format.js";

/**
 * Action Program → DocumentPdfSpec mapping (docs/plans/jspdf-documents —
 * Task J-T2). The document's CONTENT is ported 1:1 from the deleted
 * print-CSS sheet (ActionProgramPrintSheet.tsx): same fields, same
 * totals logic (`computeProgramTotals` mirrors the server's
 * `computeActionProgramPlannedCost`), same empty guards, same signature
 * roles — only the rendering engine changed (renderer = lib/pdf/
 * documentPdf.ts, which owns layout/pagination and does ZERO i18n).
 *
 * Purity rules (same as lib/print/print-format.ts):
 *  - PURE functions only: no React, no DOM, no tRPC, no `@/` aliases —
 *    relative imports with `.js` extensions keep the config-less root
 *    node-env vitest run importable;
 *  - `documentPdf.js` is imported TYPE-ONLY so jspdf never loads in
 *    node tests; `pdfTheme.js` is pure data (no jsPDF import);
 *  - ALL labels arrive pre-resolved: the page captures
 *    `intl.formatMessage` and hands `buildActionProgramPdfLabels(t)`
 *    the translate fn (callers own i18n); the spec builder consumes the
 *    finished label bag.
 *
 * AP keeps its LOCAL `formatDate`/`formatQty` helpers (period instants
 * format in local time — the event proposal's date-only columns format
 * in UTC; unifying the two would shift one document's printed dates).
 */

/**
 * Structural view of the `actionProgram.detail` output — only the fields
 * this document prints (no invented fields; mirrors the router's
 * include). Money/quantity cells stay `unknown` because a Prisma
 * `Decimal` reaches the client as a number-like wire value — `toNum`
 * (lib/print/print-format.ts) coerces once. `startDate`/`endDate`/
 * `updatedAt` are `Date` at the type level and ISO strings on the wire
 * (no transformer on the tRPC client); the local `formatDate` and the
 * build-key helper accept both.
 */
export interface ActionProgramPdfRecord {
  id: string;
  documentNumber: string | null;
  name: string;
  description: string | null;
  startDate: Date | string;
  endDate: Date | string;
  budgetCurrency: string;
  plannedCost: unknown;
  approvalStatus: string;
  /** Not printed — identity of the build inputs (`<id>:<updatedAt>` build key). */
  updatedAt: Date | string;
  area: { id: string; name: string } | null;
  pic: { id: string; name: string | null } | null;
  createdBy: { id: string; name: string | null } | null;
  actionType: { id: string; code: string; name: string } | null;
  outlets: Array<{
    outletId: string;
    explanation: string | null;
    cost: unknown;
    outlet: { id: string; name: string; code: string | null } | null;
  }>;
  skus: Array<{
    skuId: string;
    quantity: unknown;
    price: unknown;
    discount: unknown;
    cost: unknown;
    notes: string | null;
    sku: { id: string; name: string; code: string | null } | null;
  }>;
  items: Array<{
    id: string;
    name: string;
    quantity: unknown;
    price: unknown;
    cost: unknown;
    notes: string | null;
  }>;
}

/**
 * The translate seam the page injects — the page's captured
 * `intl.formatMessage` wrapper matches this shape exactly.
 */
export type ActionProgramTranslate = (
  id: string,
  defaultMessage: string,
  values?: Record<string, string | number | boolean>,
) => string;

/**
 * Every user-visible string of the document, pre-resolved by the page
 * (`buildActionProgramPdfLabels`). The renderer receives finished
 * strings only.
 */
export interface ActionProgramPdfLabels {
  fallbackName: string;
  fallbackTagline: string;
  phoneLabel: string;
  taxIdLabel: string;
  title: string;
  /** Per-status labels keyed by UPPERCASE enum; unknown → Title Case. */
  statusLabels: Partial<Record<string, string>>;
  meta: {
    program: string;
    type: string;
    period: string;
    area: string;
    pic: string;
    preparedBy: string;
    status: string;
    currency: string;
  };
  descriptionTitle: string;
  outlets: {
    title: string;
    code: string;
    outlet: string;
    explanation: string;
    cost: string;
    empty: string;
    subtotal: string;
  };
  items: {
    title: string;
    item: string;
    qty: string;
    unitPrice: string;
    cost: string;
    empty: string;
    subtotal: string;
  };
  skus: {
    title: string;
    code: string;
    product: string;
    qty: string;
    price: string;
    disc: string;
    cost: string;
    empty: string;
    subtotal: string;
  };
  grandTotal: string;
  signatures: { preparedBy: string; pic: string; approvedBy: string };
  /** "Printed on {date}" with the instant captured at build time. */
  printedOn: string;
}

/** Resolve every document label through the page's captured intl. */
export const buildActionProgramPdfLabels = (
  t: ActionProgramTranslate,
): ActionProgramPdfLabels => ({
  fallbackName: t("nav.brand_name", "B2B CRM"),
  fallbackTagline: t("nav.brand_sub", "Sales OS"),
  phoneLabel: t("action_program.print.company_phone", "Phone"),
  taxIdLabel: t("action_program.print.company_tax_id", "Tax ID"),
  title: t("action_program.print.title", "Action Program"),
  statusLabels: {
    DRAFT: t("action_program.print.status.draft", "Draft"),
    VALIDATING: t("action_program.print.status.validating", "AI Processing"),
    PROPOSED: t("action_program.print.status.proposed", "Pending Approval"),
    APPROVED: t("action_program.print.status.approved", "Approved"),
    REJECTED: t("action_program.print.status.rejected", "Rejected"),
  },
  meta: {
    program: t("action_program.print.meta_program", "Program"),
    type: t("action_program.detail.type_label", "Type"),
    period: t("action_program.print.meta_period", "Period"),
    area: t("action_program.detail.area_label", "Area"),
    pic: t("action_program.detail.pic_label", "PIC"),
    preparedBy: t("action_program.print.prepared_by", "Prepared by"),
    status: t("action_program.detail.status_label", "Status"),
    currency: t("action_program.print.meta_currency", "Currency"),
  },
  descriptionTitle: t(
    "action_program.detail.description_label",
    "Description",
  ),
  outlets: {
    title: t("action_program.print.section_outlets", "Assigned outlets"),
    code: t("action_program.print.col_code", "Code"),
    outlet: t("action_program.print.col_outlet", "Outlet"),
    explanation: t("action_program.print.col_explanation", "Explanation"),
    cost: t("action_program.print.col_cost", "Cost"),
    empty: t("action_program.detail.no_outlets", "No outlets assigned"),
    subtotal: t("action_program.print.totals_outlets", "Outlets subtotal"),
  },
  items: {
    title: t("action_program.print.section_items", "Program items"),
    item: t("action_program.print.col_item", "Item"),
    qty: t("action_program.print.col_qty", "Qty"),
    unitPrice: t("action_program.print.col_unit_price", "Unit price"),
    cost: t("action_program.print.col_cost", "Cost"),
    empty: t("action_program.print.empty_items", "No program items."),
    subtotal: t("action_program.print.totals_items", "Items subtotal"),
  },
  skus: {
    title: t("action_program.print.section_skus", "SKU lines"),
    code: t("action_program.print.col_code", "Code"),
    product: t("action_program.print.col_product", "Product"),
    qty: t("action_program.print.col_qty", "Qty"),
    price: t("action_program.print.col_price", "Price"),
    disc: t("action_program.print.col_disc", "Disc"),
    cost: t("action_program.print.col_cost", "Cost"),
    empty: t("action_program.print.empty_skus", "No SKU lines."),
    subtotal: t("action_program.print.totals_skus", "SKUs subtotal"),
  },
  grandTotal: t("action_program.print.totals_grand", "Grand total"),
  signatures: {
    preparedBy: t("action_program.print.prepared_by", "Prepared by"),
    pic: t("action_program.detail.pic_label", "PIC"),
    approvedBy: t("action_program.print.approved_by", "Approved by"),
  },
  printedOn: t("action_program.print.printed_on", "Printed on {date}", {
    date: formatDateTime(new Date().toISOString()),
  }),
});

/*
 * Sheet-local helpers — the genuinely shared formatters (money, printed-on
 * timestamp, enum Title Case, Decimal coercion) live in lib/print/
 * print-format.ts. These two stay local because they are action-program
 * specific (quantity styling + local-time period instants — see the
 * module docblock).
 */
const formatQty = (value: unknown) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(
    toNum(value),
  );

const formatDate = (iso: string | Date | null | undefined) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
};

/** Approval status → i18n label (never raw enums; unknown → Title Case). */
export const programStatusLabel = (
  status: string,
  labels: ActionProgramPdfLabels,
): string => labels.statusLabels[status.toUpperCase()] ?? titleCase(status);

/** Document number with the same fallback the detail header shows. */
export const actionProgramDocNumber = (
  record: Pick<ActionProgramPdfRecord, "id" | "documentNumber">,
): string =>
  record.documentNumber ?? `AP #${record.id.slice(0, 8).toUpperCase()}`;

/**
 * Stable build key for the modal pipeline (`<id>:<updatedAt>`) — changes
 * whenever the record is saved, so the preview rebuilds exactly once per
 * document state. Empty inputs never reach this (the page gates on the
 * loaded record); an unusable timestamp degrades to its raw string.
 */
export const buildActionProgramPdfBuildKey = (
  record: Pick<ActionProgramPdfRecord, "id" | "updatedAt">,
): string => {
  const updated = new Date(record.updatedAt);
  const stamp = Number.isNaN(updated.getTime())
    ? String(record.updatedAt)
    : updated.toISOString();
  return `${record.id}:${stamp}`;
};

/** Mirrors the server's `computeActionProgramPlannedCost` (budget-calc.ts). */
interface ActionProgramTotals {
  outletsTotal: number;
  itemsTotal: number;
  skusTotal: number;
  grandTotal: number;
}

/**
 * Per-table subtotal roll-up from line rows. Grand total is the mirrored
 * Σ outlets.cost + Σ items.cost + Σ skus.cost — the document itself prints
 * the record's stored `plannedCost` (recomputed server-side on every
 * save, so they agree; the stored value is what the budget committed).
 * Exported for the scoped mapping tests.
 */
export const computeProgramTotals = (record: {
  outlets: Array<{ cost: unknown }>;
  items: Array<{ cost: unknown }>;
  skus: Array<{ cost: unknown }>;
}): ActionProgramTotals => {
  const sum = (rows: Array<{ cost: unknown }>) =>
    rows.reduce((acc, row) => acc + toNum(row.cost), 0);
  const outletsTotal = sum(record.outlets);
  const itemsTotal = sum(record.items);
  const skusTotal = sum(record.skus);
  return {
    outletsTotal,
    itemsTotal,
    skusTotal,
    grandTotal: outletsTotal + itemsTotal + skusTotal,
  };
};

/** Item/SKU primary cell: name, with the note on a second line (port of the
 * old `ap-print__cell-note` stacked cell). */
const withNotes = (name: string, notes: string | null): string =>
  notes ? `${name}\n${notes}` : name;

/**
 * Map a loaded action program into the frozen spec shape. `identity`
 * comes from the modal (`settings.companyIdentity`); `labels` from the
 * page. Column widths are the old colgroup percentages as fractions.
 * Money story (unchanged): every line's budget-relevant amount is
 * `cost` — the same roll-up the server stores as `plannedCost` — so all
 * three subtotals agree with the grand-total band.
 */
export const buildActionProgramPdfSpec = (
  record: ActionProgramPdfRecord,
  identity: PdfCompanyIdentity | null,
  labels: ActionProgramPdfLabels,
): DocumentPdfSpec => {
  const currency = record.budgetCurrency || "IDR";
  const totals = computeProgramTotals(record);
  const status = record.approvalStatus;

  const blocks: DocumentPdfBlock[] = [];

  // Description (when present — same guard as the old sheet).
  if (record.description) {
    blocks.push({
      kind: "section",
      title: labels.descriptionTitle,
      body: record.description,
    });
  }

  // Assigned outlets — Code/Outlet/Explanation/Cost, subtotal Σ cost.
  blocks.push({
    kind: "table",
    table: {
      title: labels.outlets.title,
      columns: [
        labels.outlets.code,
        labels.outlets.outlet,
        labels.outlets.explanation,
        labels.outlets.cost,
      ],
      widths: [0.16, 0.26, 0.43, 0.15],
      numericColumns: [3],
      rows: record.outlets.map(
        (row): DocumentPdfTableCell[] => [
          { text: row.outlet?.code ?? "—" },
          { text: row.outlet?.name ?? "—" },
          { text: row.explanation ?? "—" },
          { text: formatDocumentMoney(row.cost, currency), bold: true },
        ],
      ),
      subtotal: {
        label: labels.outlets.subtotal,
        value: formatDocumentMoney(totals.outletsTotal, currency),
      },
      emptyMessage: labels.outlets.empty,
    },
  });

  // Program items — Item(name+notes)/Qty/Unit price/Cost.
  blocks.push({
    kind: "table",
    table: {
      title: labels.items.title,
      columns: [
        labels.items.item,
        labels.items.qty,
        labels.items.unitPrice,
        labels.items.cost,
      ],
      widths: [0.44, 0.12, 0.22, 0.22],
      numericColumns: [1, 2, 3],
      rows: record.items.map(
        (item): DocumentPdfTableCell[] => [
          { text: withNotes(item.name, item.notes) },
          { text: formatQty(item.quantity) },
          { text: formatDocumentMoney(item.price, currency) },
          { text: formatDocumentMoney(item.cost, currency), bold: true },
        ],
      ),
      subtotal: {
        label: labels.items.subtotal,
        value: formatDocumentMoney(totals.itemsTotal, currency),
      },
      emptyMessage: labels.items.empty,
    },
  });

  // SKU lines — Code/Product(name+notes)/Qty/Price/Disc/Cost. `discount`
  // is a per-unit AMOUNT (the sales-order auto-discount derives a percent
  // from discount/priceAfterDiscount), so it prints as money, never as a
  // %; `tax` semantics are undocumented (seed-zero, no domain doc) —
  // omitted rather than guessed (same call as the old sheet).
  blocks.push({
    kind: "table",
    table: {
      title: labels.skus.title,
      columns: [
        labels.skus.code,
        labels.skus.product,
        labels.skus.qty,
        labels.skus.price,
        labels.skus.disc,
        labels.skus.cost,
      ],
      widths: [0.14, 0.3, 0.1, 0.16, 0.15, 0.15],
      numericColumns: [2, 3, 4, 5],
      rows: record.skus.map(
        (row): DocumentPdfTableCell[] => [
          { text: row.sku?.code ?? "—" },
          { text: withNotes(row.sku?.name ?? "—", row.notes) },
          { text: formatQty(row.quantity) },
          { text: formatDocumentMoney(row.price, currency) },
          { text: formatDocumentMoney(row.discount, currency) },
          { text: formatDocumentMoney(row.cost, currency), bold: true },
        ],
      ),
      subtotal: {
        label: labels.skus.subtotal,
        value: formatDocumentMoney(totals.skusTotal, currency),
      },
      emptyMessage: labels.skus.empty,
    },
  });

  // Grand total = the STORED plannedCost (not recomputed) — parity with
  // the old grand-total band.
  blocks.push({
    kind: "grandTotal",
    label: labels.grandTotal,
    value: formatDocumentMoney(record.plannedCost, currency),
  });

  const meta: DocumentPdfMetaItem[] = [
    { label: labels.meta.program, value: record.name },
    { label: labels.meta.type, value: record.actionType?.name ?? "—" },
    {
      label: labels.meta.period,
      value: `${formatDate(record.startDate)} – ${formatDate(record.endDate)}`,
    },
    { label: labels.meta.area, value: record.area?.name ?? "—" },
    { label: labels.meta.pic, value: record.pic?.name ?? "—" },
    { label: labels.meta.preparedBy, value: record.createdBy?.name ?? "—" },
    { label: labels.meta.status, value: programStatusLabel(status, labels) },
    { label: labels.meta.currency, value: currency },
  ];

  return {
    letterhead: {
      identity,
      fallbackInitial: "A",
      fallbackName: labels.fallbackName,
      fallbackTagline: labels.fallbackTagline,
      phoneLabel: labels.phoneLabel,
      taxIdLabel: labels.taxIdLabel,
      title: labels.title,
      documentNumber: actionProgramDocNumber(record),
      status: {
        label: programStatusLabel(status, labels),
        tone: documentStatusTone(status),
      },
    },
    meta,
    blocks,
    // Real domain roles; "Approved by" stays blank until signed.
    signatures: [
      { label: labels.signatures.preparedBy, name: record.createdBy?.name ?? "" },
      { label: labels.signatures.pic, name: record.pic?.name ?? "" },
      { label: labels.signatures.approvedBy },
    ],
    footer: { printedOn: labels.printedOn },
  };
};

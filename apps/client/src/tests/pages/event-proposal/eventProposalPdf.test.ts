import { describe, expect, it } from "vitest";

import type { PdfCompanyIdentity } from "../../../lib/pdf/documentPdf";
import { formatDocumentMoney } from "../../../lib/print/print-format";
import {
  buildCostSummary,
  buildEventProposalPdfLabels,
  buildEventProposalPdfSpec,
  eventProposalDocumentNumber,
  formatDocumentDate,
  formatEventDateRange,
  EVENT_PROPOSAL_PDF_STATUS_LABELS,
  type EventProposalPdfFormatMessage,
  type EventProposalPdfLabels,
  type EventProposalPdfRecord,
} from "../../../pages/event-proposal/eventProposalPdf";

/**
 * Unit tests for the Event Proposal jsPDF document mapping (J-T3,
 * docs/plans/jspdf-documents). Coverage adapted from the deleted
 * eventProposalPrint.test.ts — the mapping module is the sheet's pure
 * layer with the DOM/React shell removed.
 *
 * The module is importable config-less (node vitest, no jsdom): relative
 * imports only, and the documentPdf spec types arrive via `import type`,
 * so jsPDF itself never loads here.
 *
 * The genuinely shared formatters (`currencyDigits`, `formatDocumentMoney`)
 * live in lib/print/print-format.ts and are pinned in
 * tests/lib/print-format.test.ts; this file asserts the mapping passes the
 * right numbers/currency into them, not their internals.
 */

const makeRecord = (overrides: Partial<EventProposalPdfRecord> = {}): EventProposalPdfRecord => ({
  id: "01JABCDEFGH0PRT1",
  documentNumber: "EP-PH-0001",
  name: "Ramadan Activation 2026",
  description: null,
  venue: "Grand Mall Atrium",
  eventDate: "2026-03-12",
  eventEndDate: null,
  organizerName: "Rina Wijaya",
  organizerContact: "0812-3456-7890",
  observationDays: 90,
  currency: "IDR",
  approvalStatus: "PROPOSED",
  plannedCost: 0,
  area: { id: "area-1", name: "Java West" },
  createdBy: { id: "user-1", name: "Budi Santoso" },
  eventType: { id: "et-1", code: "SAMPLING", name: "Sampling" },
  skus: [
    {
      skuId: "sku-1",
      quantity: 10,
      price: 25000,
      tax: 0,
      total: 250000,
      notes: null,
      sku: { id: "sku-1", name: "Kopi Susu 250ml", code: "KS-250" },
    },
    {
      skuId: "sku-2",
      quantity: 4,
      price: 100000,
      tax: 0,
      total: 400000,
      notes: null,
      sku: { id: "sku-2", name: "Teh Melati 100pk", code: null },
    },
  ],
  miscItems: [
    {
      id: "misc-1",
      name: "Booth setup",
      category: "Logistics",
      quantity: 2,
      price: 1500000,
      total: 3000000,
      notes: null,
    },
  ],
  vendors: [
    {
      id: "vend-1",
      scope: "Barista service",
      amount: 2000000,
      notes: null,
      vendor: { id: "vendor-1", name: "Kopi Truck Co" },
    },
  ],
  areaManagerApprovedAt: "2026-03-02T09:30:00.000Z",
  directorApprovedAt: null,
  ...overrides,
});

const identity: PdfCompanyIdentity = {
  name: "Ponyo Foods",
  addressLines: ["Jl. Merdeka 1", "Jakarta"],
  phone: "+62 21 555 0100",
  taxId: "01.234.567.8-901.000",
};

/**
 * Literal labels with resolvable stubs — proves the spec consumes the
 * bundle as data (no intl inside the mapping module).
 */
const makeLabels = (overrides: Partial<EventProposalPdfLabels> = {}): EventProposalPdfLabels => ({
  fallbackName: "CRM",
  fallbackTagline: "Sales OS",
  phoneLabel: "Phone",
  taxIdLabel: "Tax ID",
  title: "Event Proposal",
  statusLabel: (status) =>
    ({
      DRAFT: "Draft",
      VALIDATING: "Validated",
      PROPOSED: "Pending Approval",
      APPROVED: "Approved",
      REJECTED: "Rejected",
    } as Record<string, string>)[status.toUpperCase()] ?? status,
  metaEvent: "Event",
  metaEventType: "Event Type",
  metaVenue: "Venue",
  metaEventDate: "Event Date",
  metaArea: "Area",
  metaOrganizer: "Organizer",
  metaCurrency: "Currency",
  metaObservationDays: "Observation days",
  descriptionTitle: "Description",
  skusTitle: "SKUs",
  colCode: "Code",
  colProduct: "Product",
  colQty: "Qty",
  colPrice: "Price",
  colTotal: "Total",
  emptySkus: "No SKUs.",
  totalsSkus: "SKUs subtotal",
  sectionMisc: "Miscellaneous items",
  colItem: "Item",
  colCategory: "Category",
  emptyMisc: "No miscellaneous items.",
  totalsMisc: "Miscellaneous subtotal",
  sectionVendors: "Vendors",
  colVendor: "Vendor",
  colScope: "Scope",
  emptyVendors: "No vendors.",
  totalsVendors: "Vendors subtotal",
  totalsGrand: "Planned total",
  signatureProposer: "Proposed by",
  signatureAreaManager: "Area Manager",
  signatureDirector: "Director",
  signatureApprovedOn: (date) => `Approved on ${date}`,
  printedOn: "Printed on 9 March 2026 at 10:00",
  ...overrides,
});

/** Find the Nth table block (description section shifts block indices). */
const tablesOf = (spec: ReturnType<typeof buildEventProposalPdfSpec>) =>
  spec.blocks.filter((b) => b.kind === "table");

describe("formatDocumentDate", () => {
  it("formats en-GB short dates", () => {
    expect(formatDocumentDate("2026-03-12")).toBe("12 Mar 2026");
  });

  it("falls back to an em dash for missing dates", () => {
    expect(formatDocumentDate(null)).toBe("—");
  });
});

describe("formatEventDateRange", () => {
  it("prints a single date when there is no end date", () => {
    expect(formatEventDateRange("2026-03-12", null)).toBe("12 Mar 2026");
  });

  it("prints a dash-separated range for multi-day events", () => {
    expect(formatEventDateRange("2026-03-12", "2026-03-14")).toBe(
      "12 Mar 2026 – 14 Mar 2026",
    );
  });

  it("falls back to an em dash without any date", () => {
    expect(formatEventDateRange(null, "2026-03-14")).toBe("—");
  });
});

describe("buildCostSummary", () => {
  it("sums the stored row values the tables print", () => {
    const summary = buildCostSummary(makeRecord());
    expect(summary.skusSubtotal).toBe(650000);
    expect(summary.miscSubtotal).toBe(3000000);
    expect(summary.vendorsSubtotal).toBe(2000000);
  });

  it("uses the server's committed plannedCost as the grand total", () => {
    const summary = buildCostSummary(makeRecord({ plannedCost: 5650000 }));
    expect(summary.grandTotal).toBe(5650000);
  });

  it("falls back to the computed subtotal sum when plannedCost is missing", () => {
    const summary = buildCostSummary(makeRecord({ plannedCost: 0 }));
    expect(summary.grandTotal).toBe(650000 + 3000000 + 2000000);
  });

  it("handles an empty proposal without inventing money", () => {
    const summary = buildCostSummary(
      makeRecord({ skus: [], miscItems: [], vendors: [], plannedCost: 0 }),
    );
    expect(summary).toEqual({
      skusSubtotal: 0,
      miscSubtotal: 0,
      vendorsSubtotal: 0,
      grandTotal: 0,
    });
  });
});

describe("eventProposalDocumentNumber", () => {
  it("uses the stored document number", () => {
    expect(eventProposalDocumentNumber(makeRecord())).toBe("EP-PH-0001");
  });

  it("falls back to EP #<first 8 ULID chars uppercased>", () => {
    expect(
      eventProposalDocumentNumber(makeRecord({ documentNumber: null })),
    ).toBe("EP #01JABCDE");
  });
});

describe("buildEventProposalPdfLabels", () => {
  const t: EventProposalPdfFormatMessage = (id, defaultMessage, values) => {
    if (id === "event_proposal.print.signature_approved_on") {
      return `Disetujui pada ${values?.date}`;
    }
    return defaultMessage;
  };

  it("resolves every label through the captured formatMessage", () => {
    const labels = buildEventProposalPdfLabels(t);
    expect(labels.title).toBe("Event Proposal");
    expect(labels.fallbackName).toBe("CRM");
    expect(labels.totalsGrand).toBe("Planned total");
  });

  it("interpolates the approval-date and printed-on values", () => {
    const labels = buildEventProposalPdfLabels(t);
    expect(labels.signatureApprovedOn("12 Mar 2026")).toBe(
      "Disetujui pada 12 Mar 2026",
    );
    expect(labels.printedOn).toMatch(/^Printed on /);
  });

  it("maps known statuses through the frozen key set and Title-Cases the rest", () => {
    const labels = buildEventProposalPdfLabels(t);
    expect(labels.statusLabel("PROPOSED")).toBe("Pending Approval");
    expect(labels.statusLabel("REJECTED")).toBe("Rejected");
    // AI_VALIDATED has no dedicated locale key (sheet behavior preserved).
    expect(labels.statusLabel("AI_VALIDATED")).toBe("Ai Validated");
    expect(Object.keys(EVENT_PROPOSAL_PDF_STATUS_LABELS)).toHaveLength(5);
  });
});

describe("buildEventProposalPdfSpec — letterhead", () => {
  it("carries the identity, title, document number and status tone", () => {
    const spec = buildEventProposalPdfSpec(makeRecord(), identity, makeLabels());
    expect(spec.letterhead.identity).toBe(identity);
    expect(spec.letterhead.fallbackInitial).toBe("E");
    expect(spec.letterhead.title).toBe("Event Proposal");
    expect(spec.letterhead.documentNumber).toBe("EP-PH-0001");
    expect(spec.letterhead.status).toEqual({
      label: "Pending Approval",
      tone: "primary",
    });
  });

  it("derives the status tone from the approval status (frozen chip map)", () => {
    const approved = buildEventProposalPdfSpec(
      makeRecord({ approvalStatus: "APPROVED" }),
      null,
      makeLabels(),
    );
    expect(approved.letterhead.status).toEqual({
      label: "Approved",
      tone: "success",
    });
    const rejected = buildEventProposalPdfSpec(
      makeRecord({ approvalStatus: "REJECTED" }),
      null,
      makeLabels(),
    );
    expect(rejected.letterhead.status?.tone).toBe("destructive");
    const draft = buildEventProposalPdfSpec(
      makeRecord({ approvalStatus: "DRAFT" }),
      null,
      makeLabels(),
    );
    expect(draft.letterhead.status?.tone).toBe("neutral");
  });
});

describe("buildEventProposalPdfSpec — meta grid", () => {
  it("renders all eight cells in sheet order", () => {
    const spec = buildEventProposalPdfSpec(makeRecord(), identity, makeLabels());
    expect(spec.meta).toEqual([
      { label: "Event", value: "Ramadan Activation 2026" },
      { label: "Event Type", value: "Sampling" },
      { label: "Venue", value: "Grand Mall Atrium" },
      { label: "Event Date", value: "12 Mar 2026" },
      { label: "Area", value: "Java West" },
      { label: "Organizer", value: "Rina Wijaya · 0812-3456-7890" },
      { label: "Currency", value: "IDR" },
      { label: "Observation days", value: "90" },
    ]);
  });

  it("em-dashes missing meta values and joins the organizer parts", () => {
    const spec = buildEventProposalPdfSpec(
      makeRecord({
        venue: null,
        area: null,
        eventType: null,
        organizerName: null,
        organizerContact: null,
        observationDays: 0,
      }),
      null,
      makeLabels(),
    );
    expect(spec.meta[1].value).toBe("—");
    expect(spec.meta[2].value).toBe("—");
    expect(spec.meta[4].value).toBe("—");
    expect(spec.meta[5].value).toBe("—");
    expect(spec.meta[7].value).toBe("0");
  });
});

describe("buildEventProposalPdfSpec — body blocks", () => {
  it("includes the description section only when present", () => {
    const withDescription = buildEventProposalPdfSpec(
      makeRecord({ description: "Two-week activation" }),
      null,
      makeLabels(),
    );
    expect(withDescription.blocks[0]).toEqual({
      kind: "section",
      title: "Description",
      body: "Two-week activation",
    });

    const withoutDescription = buildEventProposalPdfSpec(makeRecord(), null, makeLabels());
    expect(withoutDescription.blocks.some((b) => b.kind === "section")).toBe(false);
  });

  it("maps the SKU table with frozen widths, numeric columns and subtotals", () => {
    const spec = buildEventProposalPdfSpec(makeRecord(), null, makeLabels());
    const [skus, misc, vendors] = tablesOf(spec);
    const skusTable = skus.kind === "table" ? skus.table : null;
    expect(skusTable?.title).toBe("SKUs");
    expect(skusTable?.columns).toEqual(["Code", "Product", "Qty", "Price", "Total"]);
    expect(skusTable?.widths.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(skusTable?.numericColumns).toEqual([2, 3, 4]);
    expect(skusTable?.rows[0]).toEqual([
      { text: "KS-250" },
      { text: "Kopi Susu 250ml" },
      { text: "10" },
      { text: formatDocumentMoney(25000, "IDR") },
      { text: formatDocumentMoney(250000, "IDR"), bold: true },
    ]);
    expect(skusTable?.rows[1]?.[0]).toEqual({ text: "—" }); // missing code
    expect(skusTable?.subtotal).toEqual({
      label: "SKUs subtotal",
      value: formatDocumentMoney(650000, "IDR"),
    });
  });

  it("renders per-row notes as a second line in the item cell", () => {
    const spec = buildEventProposalPdfSpec(
      makeRecord({
        skus: [
          {
            skuId: "sku-1",
            quantity: 1,
            price: 1000,
            tax: 0,
            total: 1000,
            notes: "Chilled delivery",
            sku: { id: "sku-1", name: "Kopi Susu 250ml", code: "KS-250" },
          },
        ],
        miscItems: [
          {
            id: "misc-1",
            name: "Booth setup",
            category: "Logistics",
            quantity: 1,
            price: 1000,
            total: 1000,
            notes: "Includes power",
          },
        ],
        vendors: [
          {
            id: "vend-1",
            scope: "Barista service",
            amount: 1000,
            notes: "Two staff",
            vendor: { id: "vendor-1", name: "Kopi Truck Co" },
          },
        ],
      }),
      null,
      makeLabels(),
    );
    const [skus, misc, vendors] = tablesOf(spec);
    expect(skus.kind === "table" && skus.table.rows[0]?.[1]).toEqual({
      text: "Kopi Susu 250ml\nChilled delivery",
    });
    expect(misc.kind === "table" && misc.table.rows[0]?.[0]).toEqual({
      text: "Booth setup\nIncludes power",
    });
    expect(vendors.kind === "table" && vendors.table.rows[0]?.[0]).toEqual({
      text: "Kopi Truck Co\nTwo staff",
    });
  });

  it("maps the misc and vendor tables with their frozen widths", () => {
    const spec = buildEventProposalPdfSpec(makeRecord(), null, makeLabels());
    const [, misc, vendors] = tablesOf(spec);
    const miscTable = misc.kind === "table" ? misc.table : null;
    expect(miscTable?.columns).toEqual(["Item", "Category", "Qty", "Price", "Total"]);
    expect(miscTable?.widths.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(miscTable?.numericColumns).toEqual([2, 3, 4]);
    expect(miscTable?.rows[0]?.[1]).toEqual({ text: "Logistics" });
    expect(miscTable?.subtotal).toEqual({
      label: "Miscellaneous subtotal",
      value: formatDocumentMoney(3000000, "IDR"),
    });

    const vendorsTable = vendors.kind === "table" ? vendors.table : null;
    expect(vendorsTable?.columns).toEqual(["Vendor", "Scope", "Total"]);
    expect(vendorsTable?.widths.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(vendorsTable?.numericColumns).toEqual([2]);
    expect(vendorsTable?.rows[0]?.[1]).toEqual({ text: "Barista service" });
    expect(vendorsTable?.rows[0]?.[2]).toEqual({
      text: formatDocumentMoney(2000000, "IDR"),
      bold: true,
    });
    expect(vendorsTable?.subtotal).toEqual({
      label: "Vendors subtotal",
      value: formatDocumentMoney(2000000, "IDR"),
    });
  });

  it("declares the empty messages for zero-row tables", () => {
    const spec = buildEventProposalPdfSpec(
      makeRecord({ skus: [], miscItems: [], vendors: [] }),
      null,
      makeLabels(),
    );
    const [skus, misc, vendors] = tablesOf(spec);
    expect(skus.kind === "table" && skus.table.rows).toHaveLength(0);
    expect(skus.kind === "table" && skus.table.emptyMessage).toBe("No SKUs.");
    expect(misc.kind === "table" && misc.table.emptyMessage).toBe(
      "No miscellaneous items.",
    );
    expect(vendors.kind === "table" && vendors.table.emptyMessage).toBe("No vendors.");
  });

  it("closes with the grand-total band using plannedCost with computed fallback", () => {
    const committed = buildEventProposalPdfSpec(
      makeRecord({ plannedCost: 5650000 }),
      null,
      makeLabels(),
    );
    const committedBand = committed.blocks.at(-1);
    expect(committedBand).toEqual({
      kind: "grandTotal",
      label: "Planned total",
      value: formatDocumentMoney(5650000, "IDR"),
    });

    const fallback = buildEventProposalPdfSpec(
      makeRecord({ plannedCost: 0 }),
      null,
      makeLabels(),
    );
    const fallbackBand = fallback.blocks.at(-1);
    expect(
      fallbackBand?.kind === "grandTotal" && fallbackBand.value,
    ).toBe(formatDocumentMoney(650000 + 3000000 + 2000000, "IDR"));
  });
});

describe("buildEventProposalPdfSpec — signatures & footer", () => {
  it("maps the signature trio with the proposer name and approval-date metas", () => {
    const spec = buildEventProposalPdfSpec(makeRecord(), null, makeLabels());
    expect(spec.signatures).toEqual([
      { label: "Proposed by", name: "Budi Santoso" },
      { label: "Area Manager", meta: "Approved on 02 Mar 2026" },
      { label: "Director", meta: undefined },
    ]);
  });

  it("em-dashes a missing proposer and stamps printedOn into the footer", () => {
    const spec = buildEventProposalPdfSpec(
      makeRecord({ createdBy: null }),
      null,
      makeLabels({ printedOn: "Printed on 9 March 2026" }),
    );
    expect(spec.signatures[0]?.name).toBe("—");
    expect(spec.footer.printedOn).toBe("Printed on 9 March 2026");
    expect(spec.footer.pageIndicator).toBeUndefined();
  });
});

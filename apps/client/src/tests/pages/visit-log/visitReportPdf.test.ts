import { describe, expect, it } from "vitest";

import type { PdfCompanyIdentity } from "../../../lib/pdf/documentPdf";
import {
  buildVisitReportPdfLabels,
  buildVisitReportPdfSpec,
  visitReportDocumentNumber,
  formatVisitDate,
  formatVisitTimestamp,
  VISIT_REPORT_PDF_STATUS_LABELS,
  type VisitReportPdfFormatMessage,
  type VisitReportPdfLabels,
  type VisitReportPdfRecord,
} from "../../../pages/visit-log/visitReportPdf";

/**
 * Unit tests for the Visit Report jsPDF document mapping (J-T4,
 * docs/plans/jspdf-documents) — adapted from the deleted print sheet's
 * `visitReportPrint.test.ts`: the mapping module is the sheet's pure
 * layer with the DOM/React shell removed.
 *
 * The module is importable config-less (node vitest, no jsdom): relative
 * imports only, and the documentPdf spec types arrive via `import type`,
 * so jsPDF itself never loads here.
 *
 * The visit domain carries no money and no tabular line data, so the
 * extractable mapping logic is the two date formatters (port of the old
 * date-helper coverage) plus the spec shape: the frozen 8-cell meta
 * grid, the purpose-omitted-when-null rule, the explicit notes/feedback
 * empty states, the single "Visited by" signature, and the status tone.
 */

const makeRecord = (
  overrides: Partial<VisitReportPdfRecord> = {},
): VisitReportPdfRecord => ({
  id: "01J9XRQ7M2A4B6C8D0E2F4G6H8",
  date: "2026-03-12",
  checkInAt: new Date(2026, 2, 12, 9, 30).toISOString(),
  checkOutAt: new Date(2026, 2, 12, 14, 5).toISOString(),
  approvalStatus: "PROPOSED",
  purpose: "Quarterly stock review",
  notes: "Outlet asked for a second display.",
  feedback: "Positive reception.",
  salesman: { id: "u1", name: "Dewi" },
  outlet: {
    id: "o1",
    name: "Alpha Mart",
    customer: { id: "c1", name: "Acme Retail" },
    area: { id: "a1", name: "Greater Jakarta" },
  },
  salesOrder: { id: "so-full-ulid", documentNumber: "SO/2026/03/0001" },
  ...overrides,
});

const identity: PdfCompanyIdentity = {
  name: "Ponyo Foods",
  addressLines: ["Jl. Merdeka 1", "Jakarta"],
  phone: "+62 21 555 0100",
  taxId: "01.234.567.8-901.000",
};

/**
 * Literal labels with a resolvable status stub — proves the spec
 * consumes the bundle as data (no intl inside the spec builder).
 */
const makeLabels = (
  overrides: Partial<VisitReportPdfLabels> = {},
): VisitReportPdfLabels => ({
  fallbackName: "CRM",
  fallbackTagline: "Sales OS",
  phoneLabel: "Phone",
  taxIdLabel: "Tax ID",
  title: "Visit Report",
  statusLabel: (status) =>
    ({
      DRAFT: "Draft",
      VALIDATING: "AI Processing",
      PROPOSED: "Pending Approval",
      APPROVED: "Approved",
      REJECTED: "Rejected",
    } as Record<string, string>)[status.toUpperCase()] ?? status,
  metaDate: "Date",
  metaSalesman: "Salesman",
  metaOutlet: "Outlet",
  metaCustomer: "Customer",
  metaArea: "Area",
  metaCheckIn: "Check-in",
  metaCheckOut: "Check-out",
  metaLinkedOrder: "Linked sales order",
  purposeTitle: "Purpose",
  notesTitle: "Notes",
  emptyNotes: "No notes recorded.",
  feedbackTitle: "Feedback",
  emptyFeedback: "No feedback recorded.",
  signatureVisitedBy: "Visited by",
  printedOn: "Printed on 9 September 2026 at 10:00",
  ...overrides,
});

describe("formatVisitDate — `date` is a @db.Date column (UTC)", () => {
  it("prints the calendar day, immune to the host's UTC offset", () => {
    // Bare @db.Date wire shape and its full UTC-midnight instant must
    // agree — a host west of UTC would otherwise shift the printed day.
    expect(formatVisitDate("2026-03-12")).toBe("12 Mar 2026");
    expect(formatVisitDate("2026-03-12T00:00:00.000Z")).toBe("12 Mar 2026");
  });

  it("accepts a Date instance", () => {
    expect(formatVisitDate(new Date("2026-03-12T00:00:00.000Z"))).toBe(
      "12 Mar 2026",
    );
  });

  it("falls back to an em dash for a missing date", () => {
    expect(formatVisitDate(null)).toBe("—");
    expect(formatVisitDate(undefined)).toBe("—");
  });
});

describe("formatVisitTimestamp — check-in/out are real instants (local)", () => {
  it("prints the date with the 24h time-of-day the salesman clocked", () => {
    // Built from LOCAL date-time components so the assertion is
    // host-timezone independent: Intl formats back in the same zone.
    expect(formatVisitTimestamp(new Date(2026, 2, 12, 9, 30))).toBe(
      "12 Mar 2026, 09:30",
    );
    expect(formatVisitTimestamp(new Date(2026, 2, 12, 14, 5))).toBe(
      "12 Mar 2026, 14:05",
    );
  });

  it("accepts an ISO string from the wire", () => {
    const iso = new Date(2026, 2, 12, 9, 30).toISOString();
    expect(formatVisitTimestamp(iso)).toBe(
      formatVisitTimestamp(new Date(2026, 2, 12, 9, 30)),
    );
  });

  it("falls back to an em dash when the visit was never clocked", () => {
    expect(formatVisitTimestamp(null)).toBe("—");
    expect(formatVisitTimestamp(undefined)).toBe("—");
  });
});

describe("visitReportDocumentNumber", () => {
  it("falls back to VR #<first 8 ULID chars uppercased> (domain has no documentNumber)", () => {
    expect(visitReportDocumentNumber(makeRecord())).toBe("VR #01J9XRQ7");
  });
});

describe("buildVisitReportPdfLabels", () => {
  const t: VisitReportPdfFormatMessage = (id, defaultMessage, values) => {
    if (id === "visit_log.print.printed_on") {
      return `Dicetak pada ${values?.date}`;
    }
    return defaultMessage;
  };

  it("resolves every label through the captured formatMessage", () => {
    const labels = buildVisitReportPdfLabels(t);
    expect(labels.title).toBe("Visit Report");
    expect(labels.fallbackName).toBe("CRM");
    expect(labels.metaLinkedOrder).toBe("Linked sales order");
    expect(labels.signatureVisitedBy).toBe("Visited by");
  });

  it("interpolates the printed-on value at labels-build time", () => {
    const labels = buildVisitReportPdfLabels(t);
    expect(labels.printedOn).toMatch(/^Dicetak pada .+/);
  });

  it("maps known statuses through the frozen key set and Title-Cases the rest", () => {
    const labels = buildVisitReportPdfLabels(t);
    expect(labels.statusLabel("DRAFT")).toBe("Draft");
    expect(labels.statusLabel("VALIDATING")).toBe("AI Processing");
    expect(labels.statusLabel("PROPOSED")).toBe("Pending Approval");
    expect(labels.statusLabel("APPROVED")).toBe("Approved");
    expect(labels.statusLabel("REJECTED")).toBe("Rejected");
    // Unknown statuses never print as raw enums.
    expect(labels.statusLabel("AI_VALIDATED")).toBe("Ai Validated");
    expect(Object.keys(VISIT_REPORT_PDF_STATUS_LABELS)).toHaveLength(5);
  });
});

describe("buildVisitReportPdfSpec — letterhead", () => {
  it("carries the identity, title, document number and status label", () => {
    const spec = buildVisitReportPdfSpec(makeRecord(), identity, makeLabels());
    expect(spec.letterhead.identity).toBe(identity);
    expect(spec.letterhead.title).toBe("Visit Report");
    expect(spec.letterhead.documentNumber).toBe("VR #01J9XRQ7");
    expect(spec.letterhead.status).toEqual({
      label: "Pending Approval",
      tone: "primary",
    });
    expect(spec.letterhead.fallbackInitial).toBe("V");
    expect(spec.letterhead.fallbackName).toBe("CRM");
    expect(spec.letterhead.fallbackTagline).toBe("Sales OS");
    expect(spec.letterhead.phoneLabel).toBe("Phone");
    expect(spec.letterhead.taxIdLabel).toBe("Tax ID");
  });

  it("accepts a null identity (generic-brand fallback path)", () => {
    const spec = buildVisitReportPdfSpec(makeRecord(), null, makeLabels());
    expect(spec.letterhead.identity).toBeNull();
  });

  it("maps every approval status to the documentStatusTone", () => {
    const tone = (status: string) =>
      buildVisitReportPdfSpec(
        makeRecord({ approvalStatus: status }),
        null,
        makeLabels(),
      ).letterhead.status?.tone;
    expect(tone("DRAFT")).toBe("neutral");
    expect(tone("VALIDATING")).toBe("primary");
    expect(tone("PROPOSED")).toBe("primary");
    expect(tone("APPROVED")).toBe("success");
    expect(tone("REJECTED")).toBe("destructive");
  });
});

describe("buildVisitReportPdfSpec — meta grid (frozen 8-cell order)", () => {
  it("renders the 8 cells of the old sheet in order with resolved values", () => {
    const spec = buildVisitReportPdfSpec(makeRecord(), null, makeLabels());
    expect(spec.meta.map((m) => m.label)).toEqual([
      "Date",
      "Salesman",
      "Outlet",
      "Customer",
      "Area",
      "Check-in",
      "Check-out",
      "Linked sales order",
    ]);
    // Date in UTC (@db.Date), check-in/out in local time (real instants).
    expect(spec.meta[0].value).toBe("12 Mar 2026");
    expect(spec.meta[5].value).toBe("12 Mar 2026, 09:30");
    expect(spec.meta[6].value).toBe("12 Mar 2026, 14:05");
    // Linked order by documentNumber, falling back to the raw id.
    expect(spec.meta[7].value).toBe("SO/2026/03/0001");
  });

  it("falls back to em dashes for absent who/where data", () => {
    const spec = buildVisitReportPdfSpec(
      makeRecord({
        salesman: null,
        outlet: null,
        salesOrder: null,
        checkInAt: null,
        checkOutAt: null,
      }),
      null,
      makeLabels(),
    );
    expect(spec.meta.slice(1).map((m) => m.value)).toEqual([
      "—", // salesman
      "—", // outlet
      "—", // customer
      "—", // area
      "—", // check-in
      "—", // check-out
      "—", // linked order
    ]);
  });

  it("uses the raw order id when the linked order has no documentNumber", () => {
    const spec = buildVisitReportPdfSpec(
      makeRecord({ salesOrder: { id: "SO-RAW", documentNumber: null } }),
      null,
      makeLabels(),
    );
    expect(spec.meta[7].value).toBe("SO-RAW");
  });
});

describe("buildVisitReportPdfSpec — body sections", () => {
  it("omits the purpose section entirely when purpose is null (deliberate)", () => {
    const spec = buildVisitReportPdfSpec(
      makeRecord({ purpose: null }),
      null,
      makeLabels(),
    );
    expect(
      spec.blocks.some(
        (b) => b.kind === "section" && b.title === "Purpose",
      ),
    ).toBe(false);
  });

  it("keeps notes + feedback always, with explicit empty states when unset", () => {
    const spec = buildVisitReportPdfSpec(
      makeRecord({ purpose: "Review", notes: null, feedback: null }),
      null,
      makeLabels(),
    );
    expect(spec.blocks).toEqual([
      { kind: "section", title: "Purpose", body: "Review" },
      { kind: "section", title: "Notes", body: "No notes recorded." },
      { kind: "section", title: "Feedback", body: "No feedback recorded." },
    ]);
  });

  it("carries recorded notes/feedback bodies verbatim", () => {
    const spec = buildVisitReportPdfSpec(makeRecord(), null, makeLabels());
    expect(spec.blocks).toEqual([
      {
        kind: "section",
        title: "Purpose",
        body: "Quarterly stock review",
      },
      {
        kind: "section",
        title: "Notes",
        body: "Outlet asked for a second display.",
      },
      {
        kind: "section",
        title: "Feedback",
        body: "Positive reception.",
      },
    ]);
  });

  it("emits sections only — the visit domain has no tables and no money", () => {
    const spec = buildVisitReportPdfSpec(makeRecord(), null, makeLabels());
    expect(spec.blocks.every((b) => b.kind === "section")).toBe(true);
  });
});

describe("buildVisitReportPdfSpec — signature + footer", () => {
  it("renders a single 'Visited by' signature for the salesman", () => {
    const spec = buildVisitReportPdfSpec(makeRecord(), null, makeLabels());
    expect(spec.signatures).toEqual([
      { label: "Visited by", name: "Dewi" },
    ]);
  });

  it("renders an empty signer name when the salesman is missing", () => {
    const spec = buildVisitReportPdfSpec(
      makeRecord({ salesman: null }),
      null,
      makeLabels(),
    );
    expect(spec.signatures).toEqual([
      { label: "Visited by", name: "" },
    ]);
  });

  it("stamps the printed-on label from the labels bag", () => {
    const spec = buildVisitReportPdfSpec(makeRecord(), null, makeLabels());
    expect(spec.footer.printedOn).toBe(
      "Printed on 9 September 2026 at 10:00",
    );
  });
});

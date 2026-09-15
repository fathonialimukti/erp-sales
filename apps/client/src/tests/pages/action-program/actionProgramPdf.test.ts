import { describe, expect, it } from "vitest";

import {
  actionProgramDocNumber,
  buildActionProgramPdfBuildKey,
  buildActionProgramPdfLabels,
  buildActionProgramPdfSpec,
  computeProgramTotals,
  type ActionProgramPdfRecord,
} from "../../../pages/action-program/actionProgramPdf";
import { formatDocumentMoney } from "../../../lib/print/print-format";

/**
 * Scoped unit tests for the Action Program PDF data-mapping module
 * (J-T2 — write-only here; the quality engineer owns execution). The
 * module is pure (type-only import of documentPdf.js keeps jspdf out of
 * the node vitest env), so the whole spec mapping is pinnable:
 *
 * `computeProgramTotals` must mirror the server's
 * `computeActionProgramPlannedCost` (Σ outlets.cost + Σ items.cost +
 * Σ skus.cost) — the grand-total band prints the stored plannedCost, and
 * it only agrees with the printed subtotal rows if this mirror holds.
 *
 * Coverage adapted from the deleted actionProgramPrintSheet.test.ts
 * (totals parity + toNum coercion) plus the J-T2 content contract:
 * docNumber fallback, status tone map, 8-cell meta grid, empty guards,
 * name+notes cells, discount-as-money, stored grand total, signature
 * roles, currency digits via the shared formatters.
 */

/** Label bag resolved with defaultMessage values (dumb fake t). */
const labels = buildActionProgramPdfLabels((_, defaultMessage) => defaultMessage);

const baseRecord = (): ActionProgramPdfRecord => ({
  id: "01J9Z8Y7X6W5V4U3",
  documentNumber: "AP-2026-001",
  name: "Q3 outlet push",
  description: "Quarterly activation program.",
  // Local-time instants (no Z) — the AP sheet formats period fields in
  // local time, so these parse and format TZ-consistently in any env.
  startDate: "2026-07-01T12:00:00",
  endDate: "2026-09-30T12:00:00",
  budgetCurrency: "IDR",
  // Deliberately ≠ Σ line costs (135k) — the grand band prints the
  // STORED plannedCost, pinning that the spec does not recompute it.
  plannedCost: 185_000,
  approvalStatus: "DRAFT",
  updatedAt: "2026-09-01T08:00:00.000Z",
  area: { id: "a1", name: "Greater Jakarta" },
  pic: { id: "p1", name: "Budi" },
  createdBy: { id: "c1", name: "Dewi" },
  actionType: { id: "t1", code: "DISPLAY", name: "Display" },
  outlets: [
    {
      outletId: "o1",
      explanation: "Launch display",
      cost: 100_000,
      outlet: { id: "o1", name: "Alpha Mart", code: "OUT-1" },
    },
  ],
  items: [
    {
      id: "i1",
      name: "Banner",
      quantity: 10,
      price: 2_000,
      cost: 25_000,
      notes: "Print A2",
    },
  ],
  skus: [
    {
      skuId: "s1",
      quantity: 5,
      price: 12_000,
      discount: 1_000,
      cost: 10_000,
      notes: "Fast mover",
      sku: { id: "s1", name: "Kopi 200g", code: "SKU-1" },
    },
  ],
});

describe("computeProgramTotals — mirrors computeActionProgramPlannedCost", () => {
  it("sums outlet + item + sku costs", () => {
    const record = {
      outlets: [{ cost: 100_000 }, { cost: 50_000 }],
      items: [{ cost: 25_000 }],
      skus: [{ cost: 10_000 }],
    };

    expect(computeProgramTotals(record)).toEqual({
      outletsTotal: 150_000,
      itemsTotal: 25_000,
      skusTotal: 10_000,
      grandTotal: 185_000,
    });
  });

  it("returns zeros for a program with no lines", () => {
    expect(computeProgramTotals({ outlets: [], items: [], skus: [] })).toEqual({
      outletsTotal: 0,
      itemsTotal: 0,
      skusTotal: 0,
      grandTotal: 0,
    });
  });

  it("coerces line costs through toNum (Decimal wire shapes)", () => {
    const record = {
      outlets: [{ cost: "1000.5" }],
      items: [{ cost: undefined }],
      skus: [{ cost: "not-a-number" }],
    };

    expect(computeProgramTotals(record)).toEqual({
      outletsTotal: 1000.5,
      itemsTotal: 0,
      skusTotal: 0,
      grandTotal: 1000.5,
    });
  });

  it("grandTotal is exactly the sum of the three subtotals", () => {
    const totals = computeProgramTotals({
      outlets: [{ cost: 1.1 }, { cost: 2.2 }],
      items: [{ cost: 3.3 }],
      skus: [{ cost: 4.4 }],
    });

    expect(totals.grandTotal).toBeCloseTo(
      totals.outletsTotal + totals.itemsTotal + totals.skusTotal,
      10,
    );
  });
});

describe("document identity", () => {
  it("uses the stored document number", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    expect(spec.letterhead.documentNumber).toBe("AP-2026-001");
    expect(actionProgramDocNumber(baseRecord())).toBe("AP-2026-001");
  });

  it("falls back to AP #<first 8 id chars, uppercased>", () => {
    const record = { ...baseRecord(), documentNumber: null };
    expect(actionProgramDocNumber(record)).toBe("AP #01J9Z8Y7");
    expect(
      buildActionProgramPdfSpec(record, null, labels).letterhead.documentNumber,
    ).toBe("AP #01J9Z8Y7");
  });

  it("buildKey is <id>:<updatedAt> regardless of Date-or-string wire shape", () => {
    const iso = "2026-09-01T08:00:00.000Z";
    expect(
      buildActionProgramPdfBuildKey({ id: "R1", updatedAt: iso }),
    ).toBe(`R1:${iso}`);
    expect(
      buildActionProgramPdfBuildKey({
        id: "R1",
        updatedAt: new Date(iso),
      }),
    ).toBe(`R1:${iso}`);
  });
});

describe("status → label + tone (frozen print chip map)", () => {
  const cases: Array<[string, string, string]> = [
    ["DRAFT", "Draft", "neutral"],
    ["VALIDATING", "AI Processing", "primary"],
    ["PROPOSED", "Pending Approval", "primary"],
    // Old sheet's label map has no AI_VALIDATED key → Title Case fallback,
    // but the frozen tone map still resolves it to primary.
    ["AI_VALIDATED", "Ai Validated", "primary"],
    ["APPROVED", "Approved", "success"],
    ["REJECTED", "Rejected", "destructive"],
  ];

  it.each(cases)("%s → %s / %s", (status, label, tone) => {
    const spec = buildActionProgramPdfSpec(
      { ...baseRecord(), approvalStatus: status },
      null,
      labels,
    );
    expect(spec.letterhead.status).toEqual({ label, tone });
  });

  it("unknown status → Title Case label + neutral tone", () => {
    const spec = buildActionProgramPdfSpec(
      { ...baseRecord(), approvalStatus: "AI_VALIDATED_WEIRD" },
      null,
      labels,
    );
    expect(spec.letterhead.status).toEqual({
      label: "Ai Validated Weird",
      tone: "neutral",
    });
  });
});

describe("meta grid — 8 cells in the old sheet's order", () => {
  it("maps Program/Type/Period/Area/PIC/Prepared by/Status/Currency", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);

    expect(spec.meta.map((cell) => cell.label)).toEqual([
      "Program",
      "Type",
      "Period",
      "Area",
      "PIC",
      "Prepared by",
      "Status",
      "Currency",
    ]);
    expect(spec.meta.map((cell) => cell.value)).toEqual([
      "Q3 outlet push",
      "Display",
      // CLDR en-GB may render September as "Sept" — accept both.
      expect.stringMatching(/Jul 2026 – .*Sept? 2026/),
      "Greater Jakarta",
      "Budi",
      "Dewi",
      "Draft",
      "IDR",
    ]);
  });

  it("falls back to — for missing relations and IDR for an empty currency", () => {
    const spec = buildActionProgramPdfSpec(
      {
        ...baseRecord(),
        budgetCurrency: "",
        area: null,
        pic: null,
        actionType: null,
      },
      null,
      labels,
    );

    const values = spec.meta.map((cell) => cell.value);
    expect(values).toContain("—");
    expect(values[7]).toBe("IDR");
  });
});

describe("blocks — content parity with the old print sheet", () => {
  it("keeps the description section when present", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    expect(spec.blocks[0]).toEqual({
      kind: "section",
      title: "Description",
      body: "Quarterly activation program.",
    });
  });

  it("omits the description section when null", () => {
    const spec = buildActionProgramPdfSpec(
      { ...baseRecord(), description: null },
      null,
      labels,
    );
    expect(spec.blocks[0].kind).toBe("table");
    expect(spec.blocks.some((b) => b.kind === "section")).toBe(false);
  });

  it("emits the description section → outlets → items → skus → grandTotal in order", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    const kinds = spec.blocks.map((b) => b.kind);
    expect(kinds).toEqual([
      "section",
      "table",
      "table",
      "table",
      "grandTotal",
    ]);
  });

  it("outlets table: columns, widths, numeric column, bold cost, subtotal Σ cost", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    // blocks[0] is the description section; the outlets table follows it.
    const table = spec.blocks[1].kind === "table" ? spec.blocks[1].table : null;

    expect(table?.columns).toEqual(["Code", "Outlet", "Explanation", "Cost"]);
    expect(table?.widths).toEqual([0.16, 0.26, 0.43, 0.15]);
    expect(table?.numericColumns).toEqual([3]);
    expect(table?.rows[0]).toEqual([
      { text: "OUT-1" },
      { text: "Alpha Mart" },
      { text: "Launch display" },
      { text: formatDocumentMoney(100_000, "IDR"), bold: true },
    ]);
    expect(table?.subtotal).toEqual({
      label: "Outlets subtotal",
      value: formatDocumentMoney(100_000, "IDR"),
    });
  });

  it("items table: name+notes cell, qty/price formatting, subtotal Σ cost", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    const table = spec.blocks[2].kind === "table" ? spec.blocks[2].table : null;

    expect(table?.columns).toEqual(["Item", "Qty", "Unit price", "Cost"]);
    expect(table?.numericColumns).toEqual([1, 2, 3]);
    expect(table?.rows[0]).toEqual([
      { text: "Banner\nPrint A2" },
      { text: "10" },
      { text: formatDocumentMoney(2_000, "IDR") },
      { text: formatDocumentMoney(25_000, "IDR"), bold: true },
    ]);
    expect(table?.subtotal).toEqual({
      label: "Items subtotal",
      value: formatDocumentMoney(25_000, "IDR"),
    });
  });

  it("skus table: name+notes product cell, discount as money (not %), subtotal Σ cost", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    const table = spec.blocks[3].kind === "table" ? spec.blocks[3].table : null;

    expect(table?.columns).toEqual([
      "Code",
      "Product",
      "Qty",
      "Price",
      "Disc",
      "Cost",
    ]);
    expect(table?.numericColumns).toEqual([2, 3, 4, 5]);
    expect(table?.rows[0]).toEqual([
      { text: "SKU-1" },
      { text: "Kopi 200g\nFast mover" },
      { text: "5" },
      { text: formatDocumentMoney(12_000, "IDR") },
      { text: formatDocumentMoney(1_000, "IDR") },
      { text: formatDocumentMoney(10_000, "IDR"), bold: true },
    ]);
    expect(table?.subtotal).toEqual({
      label: "SKUs subtotal",
      value: formatDocumentMoney(10_000, "IDR"),
    });
  });

  it("grandTotal prints the STORED plannedCost, not the recomputed sum", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    const block = spec.blocks[4];
    expect(block).toEqual({
      kind: "grandTotal",
      label: "Grand total",
      value: formatDocumentMoney(185_000, "IDR"),
    });
  });

  it("empty tables carry their old empty guards instead of bare headers", () => {
    const spec = buildActionProgramPdfSpec(
      { ...baseRecord(), outlets: [], items: [], skus: [] },
      null,
      labels,
    );

    const tables = spec.blocks.flatMap((b) => (b.kind === "table" ? [b.table] : []));
    expect(tables.map((t) => t.rows.length)).toEqual([0, 0, 0]);
    expect(tables.map((t) => t.emptyMessage)).toEqual([
      "No outlets assigned",
      "No program items.",
      "No SKU lines.",
    ]);
  });

  it("every table's widths are fractions summing to 1", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    for (const block of spec.blocks) {
      if (block.kind !== "table") continue;
      const sum = block.table.widths.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
      expect(block.table.widths).toHaveLength(block.table.columns.length);
    }
  });
});

describe("currency digits via the shared formatter", () => {
  it("IDR renders zero minor digits (id-ID grouping)", () => {
    const spec = buildActionProgramPdfSpec(
      { ...baseRecord(), budgetCurrency: "IDR", outlets: [{ outletId: "o1", explanation: null, cost: 1_500_000, outlet: null }] },
      null,
      labels,
    );
    // blocks[0] is the description section; the outlets table follows it.
    const table = spec.blocks[1].kind === "table" ? spec.blocks[1].table : null;
    const costCell = table?.rows[0]?.[3];
    expect(costCell?.text).toContain("1.500.000");
    expect(costCell?.text).not.toMatch(/[.,]\d$/);
  });

  it("non-IDR renders two minor digits (en-US grouping)", () => {
    const spec = buildActionProgramPdfSpec(
      { ...baseRecord(), budgetCurrency: "USD", outlets: [{ outletId: "o1", explanation: null, cost: 1500, outlet: null }] },
      null,
      labels,
    );
    const table = spec.blocks[1].kind === "table" ? spec.blocks[1].table : null;
    expect(table?.rows[0]?.[3]?.text).toContain("1,500.00");
  });
});

describe("signatures + footer", () => {
  it("keeps the Prepared by / PIC / Approved-by(blank) trio", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);

    expect(spec.signatures).toEqual([
      { label: "Prepared by", name: "Dewi" },
      { label: "PIC", name: "Budi" },
      { label: "Approved by" },
    ]);
    expect(spec.signatures[2].name ?? "").toBe("");
  });

  it("footer carries a pre-resolved printed-on stamp", () => {
    const spec = buildActionProgramPdfSpec(baseRecord(), null, labels);
    expect(spec.footer.printedOn.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";

import { buildDocumentPdf, type DocumentPdfSpec } from "../../../lib/pdf/documentPdf";

/**
 * Renderer smoke tests (J-T1 foundation — write-only here; the quality
 * engineer owns execution). The node vitest environment cannot render
 * the modal, so the smoke level per the task brief is: bytes start with
 * the %PDF- magic, expected page count for sample specs, and the guard
 * paths (empty tables/sections) don't throw.
 */

const minimalSpec = (): DocumentPdfSpec => ({
  letterhead: {
    identity: {
      name: "B2B CRM",
      addressLines: ["Jl. Sudirman No. 1", "Jakarta"],
      phone: "+62 21 555 0100",
      taxId: "01.234.567.8-901.000",
    },
    fallbackInitial: "A",
    fallbackName: "B2B CRM",
    fallbackTagline: "Sales OS",
    phoneLabel: "Phone",
    taxIdLabel: "Tax ID",
    title: "Action Program",
    documentNumber: "AP #TEST0001",
    status: { label: "Draft", tone: "neutral" },
  },
  meta: [
    { label: "Program", value: "Q3 outlet push" },
    { label: "Type", value: "Program" },
    { label: "Period", value: "01 Jul 2026 – 30 Sep 2026" },
    { label: "Area", value: "Greater Jakarta" },
  ],
  blocks: [
    { kind: "section", title: "Description", body: "Program description." },
    {
      kind: "table",
      table: {
        title: "Assigned outlets",
        columns: ["Code", "Outlet", "Explanation", "Cost"],
        widths: [2, 4, 6, 2],
        numericColumns: [3],
        rows: [
          [
            { text: "OUT-1" },
            { text: "Alpha Mart" },
            { text: "Launch display" },
            { text: "Rp1.000", bold: true },
          ],
        ],
        subtotal: { label: "Outlets subtotal", value: "Rp1.000" },
        emptyMessage: "No outlets assigned",
      },
    },
    { kind: "grandTotal", label: "Grand total", value: "Rp1.000" },
  ],
  signatures: [
    { label: "Prepared by", name: "Dewi" },
    { label: "PIC" },
    { label: "Approved by", meta: "01 Sep 2026" },
  ],
  footer: { printedOn: "Printed on 01 September 2026 at 10:00" },
});

/** First bytes of the PDF as ASCII — the format's magic number. */
const pdfMagic = (doc: ReturnType<typeof buildDocumentPdf>): string => {
  const bytes = new Uint8Array(doc.output("arraybuffer")).slice(0, 5);
  return new TextDecoder("ascii").decode(bytes);
};

describe("buildDocumentPdf — renderer smoke", () => {
  it("produces bytes starting with the %PDF- magic", () => {
    const doc = buildDocumentPdf(minimalSpec());
    expect(pdfMagic(doc)).toBe("%PDF-");
  });

  it("renders a minimal document as exactly one page", () => {
    const doc = buildDocumentPdf(minimalSpec());
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("flows a long table across multiple pages with an auto page break", () => {
    const spec = minimalSpec();
    const tableBlock = spec.blocks[1];
    if (tableBlock.kind !== "table") throw new Error("test spec malformed");
    tableBlock.table.rows = Array.from({ length: 250 }, (_, i) => [
      { text: `OUT-${i}` },
      { text: `Outlet ${i}` },
      { text: "Explanation" },
      { text: "Rp1.000", bold: true },
    ]);
    const doc = buildDocumentPdf(spec);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
  });

  it("does not throw on empty tables, empty meta, and no status pill", () => {
    const spec = minimalSpec();
    const tableBlock = spec.blocks[1];
    if (tableBlock.kind !== "table") throw new Error("test spec malformed");
    tableBlock.table.rows = []; // guard row instead of zero rows
    spec.meta = [];
    spec.letterhead.status = null;
    spec.letterhead.identity = null; // fallback branding branch
    spec.signatures = [];
    const doc = buildDocumentPdf(spec);
    expect(pdfMagic(doc)).toBe("%PDF-");
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("honors the footer pageIndicator override", () => {
    const spec = minimalSpec();
    spec.footer.pageIndicator = (page, total) => `Hal. ${page}/${total}`;
    const doc = buildDocumentPdf(spec);
    // No throw + valid bytes is the smoke contract; the literal string
    // lands in the footer pass over every page.
    expect(pdfMagic(doc)).toBe("%PDF-");
    expect(doc.getNumberOfPages()).toBe(1);
  });
});

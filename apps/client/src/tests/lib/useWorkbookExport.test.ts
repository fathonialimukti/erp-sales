import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";

import {
  buildWorkbook,
  exportWorkbook,
  workbookFilename,
  type WorkbookColumn,
} from "../../lib/export/useWorkbookExport";

// Partial mock: keep the real utils (workbook build is under test), stub the
// download side effect so the error path is exercisable in a node environment.
vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("xlsx")>();
  return { ...actual, writeFile: vi.fn() };
});

const columns: WorkbookColumn[] = [
  { key: "name", header: "Pelanggan" },
  { key: "revenue", header: "Pendapatan", format: (v) => Number(v) },
];

describe("workbookFilename", () => {
  it("stamps the local date as prefix-YYYY-MM-DD.xlsx", () => {
    expect(workbookFilename("sales", new Date(2026, 8, 8))).toBe(
      "sales-2026-09-08.xlsx",
    );
  });

  it("zero-pads month and day", () => {
    expect(workbookFilename("collections", new Date(2026, 0, 3))).toBe(
      "collections-2026-01-03.xlsx",
    );
  });
});

describe("buildWorkbook", () => {
  it("uses translated headers as the header row and applies formatters", () => {
    const wb = buildWorkbook({
      prefix: "promo",
      sheetName: "Promosi",
      columns,
      rows: [{ name: "Outlet A", revenue: "1500" }],
    });

    expect(wb.SheetNames).toEqual(["Promosi"]);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      wb.Sheets["Promosi"],
    );
    expect(rows).toEqual([{ Pelanggan: "Outlet A", Pendapatan: 1500 }]);
  });

  it("emits a header-only sheet when there are no rows", () => {
    const wb = buildWorkbook({
      prefix: "field",
      sheetName: "Lapangan",
      columns,
      rows: [],
    });

    const sheet = wb.Sheets["Lapangan"];
    expect(sheet).toBeDefined();
    expect(XLSX.utils.sheet_to_json(sheet)).toEqual([]);
    expect(sheet["A1"]?.v).toBe("Pelanggan");
    expect(sheet["B1"]?.v).toBe("Pendapatan");
  });

  it("appends the summary sheet with label/value pairs when provided", () => {
    const wb = buildWorkbook({
      prefix: "promo",
      sheetName: "Promosi",
      columns,
      rows: [{ name: "Outlet A", revenue: 10 }],
      summary: {
        sheetName: "Ringkasan",
        rows: [{ label: "Kunjungan", value: 12 }],
      },
    });

    expect(wb.SheetNames).toEqual(["Promosi", "Ringkasan"]);
    const summary = XLSX.utils.sheet_to_json<unknown[]>(
      wb.Sheets["Ringkasan"],
      { header: 1 },
    );
    expect(summary).toEqual([["Kunjungan", 12]]);
  });

  it("omits the summary sheet when absent or empty", () => {
    const wb = buildWorkbook({
      prefix: "promo",
      sheetName: "Promosi",
      columns,
      rows: [],
      summary: { sheetName: "Ringkasan", rows: [] },
    });
    expect(wb.SheetNames).toEqual(["Promosi"]);
  });

  it("sanitizes sheet names (Excel allows max 31 chars, no []:*?/\\)", () => {
    const wb = buildWorkbook({
      prefix: "x",
      sheetName: 'A/B:C*D?E"F<G>H|I[J]KLMNOPQRSTUVW',
      columns,
      rows: [],
    });
    const name = wb.SheetNames[0];
    expect(name.length).toBeLessThanOrEqual(31);
    expect(name).not.toMatch(/[[\]:*?/\\]/);
  });
});

describe("exportWorkbook", () => {
  const writeFile = vi.mocked(XLSX.writeFile);

  beforeEach(() => {
    writeFile.mockClear();
    writeFile.mockReturnValue(undefined);
  });

  it("writes the date-stamped workbook and resolves with the filename", async () => {
    const filename = await exportWorkbook({
      prefix: "sales-by-region",
      sheetName: "Penjualan",
      columns,
      rows: [{ name: "Outlet A", revenue: 1500 }],
    });

    expect(filename).toMatch(/^sales-by-region-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(writeFile).toHaveBeenCalledTimes(1);
    const [wb, writtenName] = writeFile.mock.calls[0];
    expect(wb.SheetNames).toEqual(["Penjualan"]);
    expect(writtenName).toBe(filename);
  });

  it("rejects when the download fails (error path)", async () => {
    writeFile.mockImplementation(() => {
      throw new Error("download blocked");
    });

    await expect(
      exportWorkbook({
        prefix: "collections",
        sheetName: "Penagihan",
        columns,
        rows: [],
      }),
    ).rejects.toThrow("download blocked");
  });
});

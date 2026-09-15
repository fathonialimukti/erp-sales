import { describe, expect, it, vi } from "vitest";

import {
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  roundMoney,
  toBudgetExportRow,
  type BudgetListRow,
} from "../../../pages/budget/budget-export";

const makeRow = (overrides: Partial<BudgetListRow> = {}): BudgetListRow => ({
  budgetType: { name: "Event Budget" },
  period: { name: "FY 2026" },
  scope: "REGION",
  region: { name: "Java West" },
  area: null,
  currency: "IDR",
  summary: {
    allocated: 10000000.4,
    committed: 2500000.6,
    spent: 1000000,
    remaining: 9000000.8,
  },
  _count: { actionPrograms: 3, eventProposals: 2 },
  ...overrides,
});

describe("roundMoney", () => {
  it("rounds IDR to whole numbers", () => {
    expect(roundMoney(10000000.4, "IDR")).toBe(10000000);
    expect(roundMoney(2500000.6, "IDR")).toBe(2500001);
  });

  it("keeps 2 decimals for non-IDR currencies", () => {
    expect(roundMoney(1234.567, "USD")).toBe(1234.57);
    expect(roundMoney(99.999, "SGD")).toBe(100);
    expect(roundMoney(-50.129, "USD")).toBe(-50.13);
  });
});

describe("toBudgetExportRow", () => {
  const scopeLabel = (scope: string): string =>
    scope === "REGION" ? "Region" : scope;

  it("maps names, translated scope, counts and currency-rounded money", () => {
    expect(toBudgetExportRow(makeRow(), scopeLabel)).toEqual({
      budgetType: "Event Budget",
      period: "FY 2026",
      scope: "Region",
      regionArea: "Java West",
      currency: "IDR",
      allocated: 10000000,
      committed: 2500001,
      spent: 1000000,
      remaining: 9000001,
      programs: 3,
      proposals: 2,
    });
  });

  it("falls back to empty cells and area when region/type/period are missing", () => {
    const row = toBudgetExportRow(
      makeRow({
        budgetType: null,
        period: null,
        scope: "AREA",
        region: null,
        area: { name: "Bali" },
        currency: "USD",
        summary: {
          allocated: 1500.129,
          committed: 0,
          spent: 0,
          remaining: 1500.129,
        },
      }),
      scopeLabel,
    );
    expect(row.budgetType).toBe("");
    expect(row.period).toBe("");
    expect(row.scope).toBe("AREA");
    expect(row.regionArea).toBe("Bali");
    expect(row.allocated).toBe(1500.13);
    expect(row.remaining).toBe(1500.13);
  });
});

describe("fetchAllPages", () => {
  it("fetches once when everything fits on the first page", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      data: [{ id: "a" }],
      meta: { total: 1 },
    });

    const all = await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledWith(1);
    expect(all).toEqual([{ id: "a" }]);
  });

  it("loops page by page until the server-reported total is reached", async () => {
    const pages: Record<
      number,
      { data: { id: string }[]; meta: { total: number } }
    > = {
      1: {
        data: Array.from({ length: EXPORT_PAGE_SIZE }, (_, i) => ({
          id: `p1-${i}`,
        })),
        meta: { total: 250 },
      },
      2: {
        data: Array.from({ length: EXPORT_PAGE_SIZE }, (_, i) => ({
          id: `p2-${i}`,
        })),
        meta: { total: 250 },
      },
      3: {
        data: Array.from({ length: 50 }, (_, i) => ({ id: `p3-${i}` })),
        meta: { total: 250 },
      },
    };
    const fetchPage = vi.fn((page: number) => Promise.resolve(pages[page]));

    const all = await fetchAllPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(all).toHaveLength(250);
    expect(all[0]).toEqual({ id: "p1-0" });
    expect(all[249]).toEqual({ id: "p3-49" });
  });

  it("stops on an empty page so missing totals cannot loop forever", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValue({ data: [], meta: { total: 0 } });

    const all = await fetchAllPages(fetchPage);

    expect(all).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

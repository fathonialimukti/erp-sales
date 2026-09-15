/**
 * Pure helpers behind the budget index page's "Export Excel" action (Task 4 of
 * the PDF export overhaul). Deliberately free of `@/` aliases so the scoped
 * tests can import it in a config-less node vitest environment.
 */

/** Export fetch page size — the list input schema caps `limit` at 100. */
export const EXPORT_PAGE_SIZE = 100;

export interface PaginatedPage<T> {
  data: T[];
  meta: { total: number };
}

/**
 * Fetch every page of a paginated list so exports carry the full filtered
 * dataset, not just the currently loaded page. Stops once the server-reported
 * total is reached or an empty page arrives.
 */
export const fetchAllPages = async <T>(
  fetchPage: (page: number) => Promise<PaginatedPage<T>>,
): Promise<T[]> => {
  const all: T[] = [];
  let page = 1;
  for (;;) {
    const result = await fetchPage(page);
    all.push(...result.data);
    if (result.data.length === 0 || all.length >= (result.meta?.total ?? 0)) {
      return all;
    }
    page += 1;
  }
};

/**
 * Workbook money digits convention (frozen): IDR exports as whole numbers,
 * every other currency keeps 2 decimals.
 */
export const roundMoney = (value: number, currency: string): number =>
  currency === "IDR" ? Math.round(value) : Number(value.toFixed(2));

/** Structural shape of a `budget.list` row needed for the export mapping. */
export interface BudgetListRow {
  budgetType: { name: string } | null;
  period: { name: string } | null;
  scope: string;
  region: { name: string } | null;
  area: { name: string } | null;
  currency: string;
  summary: {
    allocated: number;
    committed: number;
    spent: number;
    remaining: number;
  };
  _count: { actionPrograms: number; eventProposals: number };
}

/**
 * Map one budget row to a workbook record. `scopeLabel` supplies the
 * pre-translated scope label; missing names become empty cells (spreadsheets
 * should not carry display-only "—" placeholders).
 */
export const toBudgetExportRow = (
  row: BudgetListRow,
  scopeLabel: (scope: string) => string,
): Record<string, unknown> => ({
  budgetType: row.budgetType?.name ?? "",
  period: row.period?.name ?? "",
  scope: scopeLabel(row.scope),
  regionArea: row.region?.name ?? row.area?.name ?? "",
  currency: row.currency,
  allocated: roundMoney(row.summary.allocated, row.currency),
  committed: roundMoney(row.summary.committed, row.currency),
  spent: roundMoney(row.summary.spent, row.currency),
  remaining: roundMoney(row.summary.remaining, row.currency),
  programs: row._count.actionPrograms,
  proposals: row._count.eventProposals,
});

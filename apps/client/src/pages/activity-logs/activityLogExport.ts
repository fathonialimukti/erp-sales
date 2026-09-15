/**
 * Export helpers for the activity log page (Task 5 of the PDF export overhaul).
 * Pure logic, extracted so the unit test can import it without loading the
 * page's React component graph — mirrors `pages/budget/budget-export.ts`.
 */

export type ActivityLogRow = {
  id: string;
  createdAt: string;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  user: { id: string; name: string | null; email: string };
  // Json column on the model — arbitrary JSON or null at runtime.
  detail?: unknown;
  message?: string | null;
};

// Explicit payload type shared by both list endpoints — a union of the two
// tRPC query outputs trips "Type instantiation is excessively deep" (each
// output is a large inferred Prisma shape). Both procedures return
// { data, pagination }.
export type ActivityLogListPayload = {
  data?: ActivityLogRow[];
  pagination?: { totalPages?: number; total?: number };
};

/** Server clamps `limit` to 100 (`buildPaginationParams`), so that is the max export page size. */
export const EXPORT_PAGE_SIZE = 100;

/** Hard cap on exported rows; a translated warning is shown when the export is truncated. */
export const EXPORT_ROW_CAP = 10_000;

/**
 * Fetch every page of a paginated log list client-side for export. Pure
 * pagination logic — the caller injects the page fetcher (admin or own-list
 * endpoint with the on-screen filters applied). Stops at a short page or once
 * the row cap is reached; `truncated` reflects the server's `pagination.total`.
 */
export const fetchAllLogsForExport = async (
  fetchPage: (page: number) => Promise<ActivityLogListPayload>,
): Promise<{ rows: ActivityLogRow[]; truncated: boolean }> => {
  const rows: ActivityLogRow[] = [];
  let total = Infinity;
  for (let page = 1; rows.length < EXPORT_ROW_CAP; page += 1) {
    const payload = await fetchPage(page);
    if (page === 1) total = payload.pagination?.total ?? Infinity;
    const data = payload.data ?? [];
    rows.push(...data);
    if (data.length < EXPORT_PAGE_SIZE) break;
  }
  return { rows: rows.slice(0, EXPORT_ROW_CAP), truncated: total > EXPORT_ROW_CAP };
};

/** Detail Json → spreadsheet cell: empty for null, raw string, compact JSON otherwise. */
export const formatDetailCell = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/** Flatten a log row (nested `user`, detail Json) into a flat workbook record. */
export const toExportRow = (
  row: ActivityLogRow,
  unknownUserLabel: string,
): Record<string, unknown> => ({
  createdAt: row.createdAt,
  userName: row.user.name ?? unknownUserLabel,
  userEmail: row.user.email,
  action: row.action,
  resource: row.resource,
  resourceId: row.resourceId,
  message: row.message ?? "",
  detail: row.detail ?? null,
});

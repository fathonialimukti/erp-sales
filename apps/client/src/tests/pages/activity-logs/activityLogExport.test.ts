import { describe, expect, it } from "vitest";

import {
  EXPORT_PAGE_SIZE,
  EXPORT_ROW_CAP,
  fetchAllLogsForExport,
  formatDetailCell,
  toExportRow,
  type ActivityLogRow,
} from "../../../pages/activity-logs/activityLogExport";

type FetchPage = Parameters<typeof fetchAllLogsForExport>[0];

const makeRow = (n: number): ActivityLogRow => ({
  id: `log-${n}`,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString(),
  action: "UPDATE",
  resource: "customer",
  resourceId: `res-${n}`,
  userId: "u1",
  user: { id: "u1", name: n % 5 === 4 ? null : `User ${n % 5}`, email: `user${n % 5}@example.com` },
  detail: null,
  message: `log entry ${n}`,
});

/** Fake of the paginated `{ data, pagination }` list payload. */
const makeFetchPage =
  (totalRows: number): FetchPage =>
  async (page) => {
    const data = Array.from({ length: totalRows }, (_, i) => makeRow(i)).slice(
      (page - 1) * EXPORT_PAGE_SIZE,
      page * EXPORT_PAGE_SIZE,
    );
    return {
      data,
      pagination: {
        total: totalRows,
        totalPages: Math.max(Math.ceil(totalRows / EXPORT_PAGE_SIZE), 1),
      },
    };
  };

const countCalls = (fetchPage: FetchPage) => {
  let calls = 0;
  const wrapped: FetchPage = async (page) => {
    calls += 1;
    return fetchPage(page);
  };
  return { wrapped, getCalls: () => calls };
};

describe("fetchAllLogsForExport", () => {
  it("walks pages until a short page and preserves order", async () => {
    const { wrapped, getCalls } = countCalls(makeFetchPage(250));

    const { rows, truncated } = await fetchAllLogsForExport(wrapped);

    expect(rows).toHaveLength(250);
    expect(rows[0]?.id).toBe("log-0");
    expect(rows[249]?.id).toBe("log-249");
    expect(truncated).toBe(false);
    expect(getCalls()).toBe(3); // 100 + 100 + 50
  });

  it("caps at EXPORT_ROW_CAP with truncated=true when total exceeds the cap", async () => {
    const { wrapped, getCalls } = countCalls(makeFetchPage(EXPORT_ROW_CAP + 50));

    const { rows, truncated } = await fetchAllLogsForExport(wrapped);

    expect(rows).toHaveLength(EXPORT_ROW_CAP);
    expect(truncated).toBe(true);
    expect(getCalls()).toBe(EXPORT_ROW_CAP / EXPORT_PAGE_SIZE); // stops at the cap
  });

  it("does not flag truncation for a dataset exactly at the cap", async () => {
    const { wrapped, getCalls } = countCalls(makeFetchPage(EXPORT_ROW_CAP));

    const { rows, truncated } = await fetchAllLogsForExport(wrapped);

    expect(rows).toHaveLength(EXPORT_ROW_CAP);
    expect(truncated).toBe(false);
    expect(getCalls()).toBe(EXPORT_ROW_CAP / EXPORT_PAGE_SIZE);
  });

  it("returns an empty result for an empty list without truncation", async () => {
    const { wrapped, getCalls } = countCalls(makeFetchPage(0));

    const { rows, truncated } = await fetchAllLogsForExport(wrapped);

    expect(rows).toEqual([]);
    expect(truncated).toBe(false);
    expect(getCalls()).toBe(1);
  });
});

describe("formatDetailCell", () => {
  it("renders null/undefined as an empty cell", () => {
    expect(formatDetailCell(null)).toBe("");
    expect(formatDetailCell(undefined)).toBe("");
  });

  it("passes string detail through unchanged", () => {
    expect(formatDetailCell("PO-123 created")).toBe("PO-123 created");
  });

  it("stringifies JSON detail compactly", () => {
    expect(formatDetailCell({ before: 1, after: 2 })).toBe('{"before":1,"after":2}');
    expect(formatDetailCell([1, 2])).toBe("[1,2]");
  });
});

describe("toExportRow", () => {
  it("flattens the nested user and passes detail through", () => {
    expect(
      toExportRow(makeRow(0), "Unknown"),
    ).toEqual({
      createdAt: makeRow(0).createdAt,
      userName: "User 0",
      userEmail: "user0@example.com",
      action: "UPDATE",
      resource: "customer",
      resourceId: "res-0",
      message: "log entry 0",
      detail: null,
    });
  });

  it("falls back to the translated unknown-user label for a missing name", () => {
    const row = toExportRow(makeRow(4), "Unknown");
    expect(row.userName).toBe("Unknown");
    expect(row.userEmail).toBe("user4@example.com");
  });

  it("defaults a missing message to an empty cell", () => {
    const row = toExportRow({ ...makeRow(0), message: null }, "Unknown");
    expect(row.message).toBe("");
  });
});

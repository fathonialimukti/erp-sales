import type { Prisma } from '../prisma/generated/client';
import type { DbClient } from './prisma.js';
import type { ReportFilter, ReportPeriod } from '@repo/schemas/report';

/** Convert a Prisma Decimal (or null) to a JS number. */
export const toNumber = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

/**
 * Build a `SalesOrder.where` from the shared report filter: date range on
 * `date`, geo scope (region resolves through Area.regionId), and optional
 * approval status. Mirrors the hand-rolled logic in sales-order.ts.
 */
export const buildReportWhere = (input: ReportFilter): Prisma.SalesOrderWhereInput => {
  const where: Record<string, unknown> = {};
  if (!input) return where as Prisma.SalesOrderWhereInput;

  if (input.areaId) where.areaId = input.areaId;
  if (input.outletId) where.outletId = input.outletId;
  if (input.customerId) where.customerId = input.customerId;
  if (input.approvalStatus) where.approvalStatus = input.approvalStatus;

  if (input.regionId) {
    where.area = { regionId: input.regionId };
  }

  if (input.dateFrom || input.dateTo) {
    where.date = {};
    if (input.dateFrom) (where.date as Record<string, unknown>).gte = new Date(input.dateFrom);
    if (input.dateTo) (where.date as Record<string, unknown>).lte = new Date(input.dateTo);
  }

  return where as Prisma.SalesOrderWhereInput;
};

/** Resolve a regionId filter into a set of areaIds (used by non-SalesOrder reports). */
export const resolveAreaIdsForRegion = async (
  db: DbClient,
  regionId: string | undefined,
): Promise<string[] | undefined> => {
  if (!regionId) return undefined;
  const areas = await db.area.findMany({
    where: { regionId },
    select: { id: true },
  });
  return areas.map((a) => a.id);
};

const dayKey = (d: Date): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const weekKey = (d: Date): string => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const monthKey = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export interface TrendBucket {
  date: string;
  total: number;
  count: number;
}

/**
 * Bucket rows by period into a continuous, gap-filled series. `rows` must be
 * `{ date: Date; total: number }`. The returned array is sorted ascending and
 * padded with zero buckets so charts never show gaps.
 */
export const bucketByPeriod = (
  rows: { date: Date; total: number }[],
  period: ReportPeriod,
  range?: { from?: Date; to?: Date },
): TrendBucket[] => {
  const keyFn = period === 'week' ? weekKey : period === 'month' ? monthKey : dayKey;
  const buckets = new Map<string, TrendBucket>();

  const start = range?.from ?? (rows.length > 0 ? new Date(rows[0]!.date) : new Date());
  const end = range?.to ?? (rows.length > 0 ? new Date(rows[rows.length - 1]!.date) : new Date());

  if (period === 'day') {
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      const k = dayKey(cursor);
      buckets.set(k, { date: k, total: 0, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (period === 'month') {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      const k = monthKey(cursor);
      buckets.set(k, { date: k, total: 0, count: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    // week: just bucket the rows that exist (week padding is awkward)
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      const k = weekKey(cursor);
      if (!buckets.has(k)) buckets.set(k, { date: k, total: 0, count: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  for (const row of rows) {
    const k = keyFn(new Date(row.date));
    const bucket = buckets.get(k);
    if (bucket) {
      bucket.total += row.total;
      bucket.count += 1;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
};

/** Inclusive day difference between two dates (b - a), floored. */
export const daysBetween = (a: Date, b: Date): number => {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / 86_400_000);
};

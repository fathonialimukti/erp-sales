### Task 1: Backend — skuCategory.stats procedure + dashboard.sales revenueByCategory

**Files:**
- Modify: `apps/server/src/routers/sku-category.ts` (add `stats` procedure)
- Modify: `apps/server/src/routers/dashboard.ts` (extend `sales` return with `revenueByCategory`)

**Consumes:**
- Prisma models `SkuCategory`, `Sku`, `SalesOrderItem`, `SalesOrder` (from `apps/server/src/prisma/schema.prisma`)
- `protectedProcedure`, `router`, `hasPermission` from `../trpc.js`
- `prisma` from `../lib/prisma.js`
- `skuCategoryIdSchema` from `@repo/schemas/sku-category`

**Produces:**
- `trpcClient.skuCategory.stats.query({ id })` returning:
  ```ts
  {
    skuCount: number;
    activeSkuCount: number;
    catalogValue: number;        // sum of sku.basePrice (null treated as 0)
    monthRevenue: number;        // approved SO items this month, rolled up via sku.categoryId
    prevMonthRevenue: number;
    revenueDeltaPercent: number | null;
    revenueTrend: { date: string; total: number }[];  // 30-day buckets, approved SO item lineTotal
    topSkus: { id: string; name: string; code: string | null; revenue: number; quantity: number }[]; // top 5 by approved revenue this month
  }
  ```
- `trpcClient.dashboard.sales.query()` gains `revenueByCategory: { id: string; name: string; revenue: number; skuCount: number }[]` (top 6 categories by approved revenue this month, others folded if you like but keep simple: just top 6).

**Frozen contract:**
- Permission guards: `stats` uses `hasPermission('skuCategory@read')`.
- Resource: `skuCategory`
- Month window: first-of-month → last-of-month 23:59:59.999 local, same pattern as existing `dashboard.sales`.
- 30-day window: `trendStart = today 00:00 - 29 days` → today, same bucket helper as `dashboard.sales` (`dayKey`).
- Decimal → Number via `Number(x)` (matches existing dashboard pattern).
- Revenue rollup: join `SalesOrderItem.lineTotal` where `salesOrder.approvalStatus === 'APPROVED'` AND `salesOrder.date` in window AND `item.sku.categoryId === input.id`. Use `prisma.salesOrderItem.findMany({ where: { sku: { categoryId: id }, salesOrder: { approvalStatus: 'APPROVED', date: { gte, lte } } }, select: { lineTotal: true, quantity: true, salesOrder: { select: { date: true } }, sku: { select: { id: true, name: true, code: true } } } })` then aggregate in JS (group by day for trend, group by sku for topSkus). Keeping a single query per window is simplest and correct.
- Return `revenueDeltaPercent` rounded to 1 decimal like the existing dashboard.
- For dashboard `revenueByCategory`: `prisma.salesOrderItem.groupBy({ by: ['skuId'], where: { salesOrder: { approvalStatus: 'APPROVED', date: { gte: startOfMonth, lte: endOfMonth } } }, _sum: { lineTotal: true } })` → then resolve `sku.categoryId` → `category.name` → fold into 6 buckets; also add per-category `skuCount` from `prisma.sku.groupBy({ by: ['categoryId'], _count: true })`. Keep it simple and parallel: do one `groupBy` on items + one lookup of sku→category + one lookup of category names. If no items, return `[]`.

**Reference:** existing `apps/server/src/routers/dashboard.ts` `sales` procedure — copy its date math, `dayKey`, and Decimal→Number style verbatim.

**Steps:**
- [ ] Step 1: Add `stats` procedure to `sku-category.ts` below `detail`
- [ ] Step 2: Extend `dashboard.sales` with `revenueByCategory` (add to Promise.all + return shape)
- [ ] Step 3: `bun run check-types` (from repo root) — confirm no type errors
- [ ] Step 4: Self-review the rollup math: empty category → zeros + empty arrays; non-existent → throw TRPCError NOT_FOUND

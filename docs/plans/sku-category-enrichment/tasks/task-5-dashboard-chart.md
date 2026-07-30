### Task 5: Frontend — Add "Revenue by category" chart to Dashboard

**Files:**
- Modify: `apps/client/src/pages/Dashboard.tsx`

**Consumes (from Task 1 — Layer 2, AFTER T1 ships):**
- `trpcClient.dashboard.sales.query()` now returns `revenueByCategory: { id: string; name: string; revenue: number; skuCount: number }[]`.

**Frozen contract:**
- Extend the local `SalesDashboard` type with `revenueByCategory: { id: string; name: string; revenue: number; skuCount: number }[]`.
- Add a new chart card in the existing `grid gap-4 lg:grid-cols-2` row pattern. Best placement: a NEW `<div className="grid gap-4 lg:grid-cols-2">` block AFTER the existing revenue-trend + top-customers grid and BEFORE the quick-actions section. Left cell = "Revenue by category" (horizontal `BarChart`, layout="vertical"), right cell = a compact "Catalog snapshot" card showing top categories by SKU count as a horizontal bar list (or reuse the bar chart with `dataKey="skuCount"` — pick the bar chart, it stays consistent).
  - Left card: title `dashboard.chart.revenue_by_category`, sub `dashboard.chart.revenue_by_category_sub`, vertical `BarChart` data=`sales.revenueByCategory`, `YAxis dataKey="name"` width=120, `XAxis type="number"` compact formatter, `Bar dataKey="revenue" fill={chartColors.secondary}` radius `[0,6,6,0]`, tooltip money formatter. Height `MAIN_CHART_HEIGHT` (280). Empty state when `revenueByCategory.length === 0` mirroring the top-customers empty state with keys `dashboard.chart.no_data` + a new `dashboard.chart.revenue_by_category_empty_sub`.
  - Right card: title `dashboard.chart.catalog_by_category`, sub `dashboard.chart.catalog_by_category_sub`, vertical `BarChart` data=`sales.revenueByCategory`, `Bar dataKey="skuCount" fill={chartColors.primary}`. Same height. Same empty-state pattern.
- Reuse the existing `chartColors`, `chartTooltipStyle`, `formatCurrency`, `formatCompact`, `MAIN_CHART_HEIGHT` already defined at the top of the file. Do NOT duplicate them.
- Clicking a bar should navigate to `/sku-category/:id` — add `onClick` via recharts `<Bar onClick={(payload) => navigate(\`/sku-category/${payload.id}\`)} />` (only when `hasPermission("skuCategory@read")` — wrap with optional; if no permission, still render chart but skip onClick).
- i18n keys (from Task 6): `dashboard.chart.revenue_by_category`, `dashboard.chart.revenue_by_category_sub`, `dashboard.chart.revenue_by_category_empty_sub`, `dashboard.chart.catalog_by_category`, `dashboard.chart.catalog_by_category_sub`.
- Do not disrupt existing layout: the new grid block sits between the existing 2-card grid and the quick-actions `<section aria-label=...>`.
- Permission gating: chart data is returned for any user with `dashboard` access (already gated server-side by `protectedProcedure` — that's the existing behavior of `dashboard.sales`). No extra client gate needed for rendering; only the bar `onClick` nav is permission-gated.

**Design law pointers:**
- Use `chartColors.secondary` for revenue bars and `chartColors.primary` for SKU-count bars to differentiate the two cards (matches existing revenue-trend=primary, top-customers=secondary assignment; here we flip so the new revenue-by-category reads as its own panel).
- No pie/donut. Money right-aligned + tabular-nums in tooltips.

**Steps:**
- [ ] Step 1: Extend `SalesDashboard` type with `revenueByCategory`
- [ ] Step 2: Insert new 2-card grid block (revenue-by-category + catalog-by-category) between existing charts grid and quick-actions
- [ ] Step 3: Wire bar `onClick` → navigate to `/sku-category/:id` (permission-gated)
- [ ] Step 4: `bun run check-types` from repo root
- [ ] Step 5: Self-review: empty `revenueByCategory` renders empty-state not crash; existing charts unchanged

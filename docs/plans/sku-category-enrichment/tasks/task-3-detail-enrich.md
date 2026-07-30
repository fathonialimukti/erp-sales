### Task 3: Frontend — enrich SkuCategoryDetailPage (KPIs + charts)

**Files:**
- Modify: `apps/client/src/pages/sku-category/SkuCategoryDetailPage.tsx`

**Consumes (from Task 1 — do not consume earlier; this task is in Layer 2 AFTER T1 ships):**
- `trpcClient.skuCategory.stats.query({ id })` returning:
  ```ts
  {
    skuCount: number;
    activeSkuCount: number;
    catalogValue: number;
    monthRevenue: number;
    prevMonthRevenue: number;
    revenueDeltaPercent: number | null;
    revenueTrend: { date: string; total: number }[];
    topSkus: { id: string; name: string; code: string | null; revenue: number; quantity: number }[];
  }
  ```
- Existing `trpcClient.skuCategory.detail.query({ id })` (already wired) for the summary card + SKUs list.

**Frozen contract:**
- Permission: page already gated by route + `skuCategory@update`/`@delete` for actions; stats query needs `skuCategory@read` only.
- Route casing: replace every `/skuCategory` literal with `/sku-category` in this file too (back button, edit, list-after-delete). Known: `navigate("/skuCategory")`, `navigate(\`/skuCategory/${skuCategory.id}/edit\`)`.
- Keep the existing summary `<Card>` (Code / Name / SKUs count). Replace the static `skus.length` in the SKUs count cell with `stats.skuCount` once loaded; fall back to `skus.length` while stats loading.
- Add a **KPI strip** (use `<Stagger>` + `<StaggerItem>` wrapping `<KpiCard>`) below the summary card with 4 KPIs:
  1. `sku_category.detail.kpi_skus` — `stats.skuCount` (icon: `Package`, module `sku`)
  2. `sku_category.detail.kpi_active` — `stats.activeSkuCount` (icon: `PackageCheck`, module `sku`)
  3. `sku_category.detail.kpi_catalog_value` — `formatCurrency(stats.catalogValue)` (icon: `Tags`, module `sku`)
  4. `sku_category.detail.kpi_month_revenue` — `formatCurrency(stats.monthRevenue)` with `delta={stats.revenueDeltaPercent}` (icon: `ShoppingCart`, module `order`)
- Add a **30-day revenue sparkline card** (title `sku_category.detail.chart_revenue_trend`) using `recharts` `AreaChart` + `ResponsiveContainer`, height 220px, same gradient + tooltip style pattern as `Dashboard.tsx` (`auroraCatRevFill` gradient id — unique, NOT `auroraRevFill` which is used on Dashboard). X-axis = short date, Y-axis = compact currency. Empty state: muted `sku_category.detail.chart_no_data`.
- Add a **Top SKUs by revenue card** (title `sku_category.detail.chart_top_skus`) using `recharts` vertical `BarChart` (layout="vertical"), height 240px, top 5 from `stats.topSkus`, `dataKey="revenue"`, `YAxis dataKey="name"`, money formatter in tooltip. Empty state when `topSkus.length === 0`.
- Keep the existing SKUs list card at the bottom.
- Use these imports already present in the codebase:
  - `recharts`: `Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis`
  - `lucide-react`: `Package, PackageCheck, ShoppingCart, Tags` (add `PackageCheck`, `ShoppingCart` to existing import)
  - `@/components/ui/card`, `Skeleton`
  - `KpiCard` from `../../components/KpiCard` (or `../../components` re-export)
  - `Stagger, StaggerItem` from `../../components/motion/Stagger`
- `formatCurrency` = `new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v)` — define locally if not already in file.
- `formatCompact` = `new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(v)` — define locally.
- `formatShortDate` same as Dashboard.
- Query: `useQuery({ queryKey: ["skuCategoryStats", id], enabled: Boolean(id), queryFn: () => trpcClient.skuCategory.stats.query({ id: id ?? "" }) })`.
- Wrap stats-dependent UI with `statsQuery.isLoading` → `<Skeleton>` blocks (mirror Dashboard pattern).
- i18n keys (provided by Task 6): `sku_category.detail.kpi_skus`, `sku_category.detail.kpi_active`, `sku_category.detail.kpi_catalog_value`, `sku_category.detail.kpi_month_revenue`, `sku_category.detail.chart_revenue_trend`, `sku_category.detail.chart_revenue_trend_sub`, `sku_category.detail.chart_top_skus`, `sku_category.detail.chart_top_skus_sub`, `sku_category.detail.chart_no_data`. Use `intl.formatMessage({ id, defaultMessage })` — Task 6 will add the keys; if a key is missing at runtime react-intl falls back to defaultMessage, so the page still renders.

**Design law pointers (do NOT rewrite the law):**
- Module color for plates: `module="sku"` on KpiCard. Chart stroke `var(--chart-1)`, grid `var(--border)`, axis `var(--muted-foreground)`, tooltip bg `var(--card)` — copy from Dashboard `chartColors` object verbatim.
- Money right-aligned + `tabular-nums`.
- No pie/donut/3D.
- Polish: 220–250ms motion via Stagger (already used).

**Steps:**
- [ ] Step 1: Fix `/skuCategory` → `/sku-category` literals
- [ ] Step 2: Add stats query + chart helpers (formatCurrency/Compact/ShortDate) + chartColors
- [ ] Step 3: Insert KPI strip between summary card and SKUs list
- [ ] Step 4: Insert revenue sparkline card + top SKUs bar card (grid `lg:grid-cols-2`) before SKUs list
- [ ] Step 5: `bun run check-types` from repo root
- [ ] Step 6: Self-review: empty stats (new category, no sales) renders zeros + empty-state, no chart crash

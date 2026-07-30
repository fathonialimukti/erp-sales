### Task 6: i18n — add new keys to en.json + id.json

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Frozen contract — add these exact keys (alphabetical order within their existing `sku_category.*` / `dashboard.chart.*` blocks):**

### en.json
```json
"dashboard.chart.catalog_by_category": "Catalog by category",
"dashboard.chart.catalog_by_category_sub": "SKU count per category — this month",
"dashboard.chart.revenue_by_category": "Revenue by category",
"dashboard.chart.revenue_by_category_sub": "Approved revenue this month — top 6",
"dashboard.chart.revenue_by_category_empty_sub": "Once orders are approved, category revenue will appear here.",
"sku_category.detail.chart_no_data": "No approved sales for this category yet",
"sku_category.detail.chart_revenue_trend": "Revenue trend",
"sku_category.detail.chart_revenue_trend_sub": "Approved sales — last 30 days",
"sku_category.detail.chart_top_skus": "Top SKUs by revenue",
"sku_category.detail.chart_top_skus_sub": "Approved revenue this month",
"sku_category.detail.kpi_active": "Active SKUs",
"sku_category.detail.kpi_catalog_value": "Catalog value",
"sku_category.detail.kpi_month_revenue": "Revenue (month)",
"sku_category.detail.kpi_skus": "Total SKUs",
```

### id.json
```json
"dashboard.chart.catalog_by_category": "Katalog per kategori",
"dashboard.chart.catalog_by_category_sub": "Jumlah SKU per kategori — bulan ini",
"dashboard.chart.revenue_by_category": "Pendapatan per kategori",
"dashboard.chart.revenue_by_category_sub": "Pendapatan disetujui bulan ini — 6 teratas",
"dashboard.chart.revenue_by_category_empty_sub": "Setelah order disetujui, pendapatan per kategori akan muncul di sini.",
"sku_category.detail.chart_no_data": "Belum ada penjualan disetujui untuk kategori ini",
"sku_category.detail.chart_revenue_trend": "Tren pendapatan",
"sku_category.detail.chart_revenue_trend_sub": "Penjualan disetujui — 30 hari terakhir",
"sku_category.detail.chart_top_skus": "SKU teratas berdasarkan pendapatan",
"sku_category.detail.chart_top_skus_sub": "Pendapatan disetujui bulan ini",
"sku_category.detail.kpi_active": "SKU aktif",
"sku_category.detail.kpi_catalog_value": "Nilai katalog",
"sku_category.detail.kpi_month_revenue": "Pendapatan (bulan)",
"sku_category.detail.kpi_skus": "Total SKU",
```

**Placement rules:**
- Keys must be placed in alphabetical order within their existing namespace block (the file already has `sku_category.detail.*` and `dashboard.chart.*` blocks — insert in the right slot).
- Do NOT duplicate existing keys. The `sku_category.form.section_description`, `sku_category.form.field_description`, `sku_category.form.field_description_placeholder` keys ALREADY exist in both files (verified) — do NOT re-add them.
- Preserve valid JSON (trailing commas are not allowed; the file has no trailing commas).
- Do NOT touch any unrelated keys.

**Steps:**
- [ ] Step 1: Add the 14 en.json keys in correct alphabetical slots
- [ ] Step 2: Add the 14 id.json keys in correct alphabetical slots
- [ ] Step 3: Validate JSON: `bunx json5 apps/client/src/locales/en.json` — or rely on `bun run check-types` if locale typing is enforced
- [ ] Step 4: Self-review: no duplicate keys, valid JSON, alphabetical within block

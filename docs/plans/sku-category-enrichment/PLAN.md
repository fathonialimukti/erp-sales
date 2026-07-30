# SKU Category — Fix + Enrichment + Dashboard Chart

## Problem
Routes registered at `/sku-category/*` (kebab-case) in `routes.tsx:142`, but SKU category pages
navigate to `/skuCategory/*` (camelCase) → every outbound link 404s (New category button, view,
edit, delete-back, row click). Sidebar + nav-menu already use the correct kebab-case path.

## Goal
1. Fix route casing so all SKU category nav works.
2. Add a `description` field to the form (schema supports it; UI omits it).
3. Enrich SkuCategoryDetailPage with category-level intelligence: KPI strip + top SKUs by
   revenue bar chart + 30-day revenue sparkline (real connection to SKU/sales).
4. Add a "Revenue by category" bar chart to Dashboard (approved revenue this month), mirroring
   existing Top Customers card (no pie/donut per design law).

## Scope
- Backend: new `skuCategory.stats` procedure; extend `dashboard.sales` with `revenueByCategory`.
- Frontend: route fixes across 2 SkuCategory pages; form description field + schema wiring;
  detail page enrich; dashboard new chart card.
- i18n: new keys in `en.json` + `id.json` for chart labels + form description.

## Out of scope
- No schema/Prisma changes (SkuCategory already has `description`; SalesOrderItem already has
  `skuId` + `lineTotal` + `salesOrder` relation needed for revenue rollup).
- No new permissions (reuse `skuCategory@read`, `sku@read`).
- No new routes file change (routes already present).

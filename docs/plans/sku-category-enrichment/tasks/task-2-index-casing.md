### Task 2: Frontend — fix /skuCategory → /sku-category route casing in SkuCategoryIndexPage

**Files:**
- Modify: `apps/client/src/pages/sku-category/SkuCategoryIndexPage.tsx`

**Consumes:**
- Existing routes at `/sku-category/*` (kebab-case) per `apps/client/src/routes.tsx:142`.

**Frozen contract:**
- Replace every `/skuCategory` literal with `/sku-category` in this file. Known occurrences:
  - `navigate(\`/skuCategory/${row.original.id}\`)` (view)
  - `navigate(\`/skuCategory/${row.original.id}/edit\`)` (edit)
  - `navigate("/skuCategory/create")` (header create button)
  - `navigate(\`/skuCategory/${row.row.id}\`)` (row onRowClick) — confirm exact string in file
  - Empty-state create CTA `navigate("/skuCategory/create")` if present
- Do NOT touch `SkuCategory*` PascalCase identifiers (component/type names) — only the URL string literals.
- Do NOT touch query keys like `"skuCategoryList"` — those are React Query cache keys, not routes.

**Steps:**
- [ ] Step 1: Find all `/skuCategory` string literals in the file
- [ ] Step 2: Replace each with `/sku-category` (kebab-case)
- [ ] Step 3: `bun run check-types` from repo root — confirm no errors

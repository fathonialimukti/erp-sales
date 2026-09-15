### Task 2: Sales-order print sheet fixes (client)

**Files:**
- Modify: `apps/client/src/pages/sales-order/SalesOrder.css` (§11.6 PDF preview modal styles ~2415–2514; §12 print sheet ~2516–2832)
- Modify: `apps/client/src/pages/sales-order/SalesOrderPrint.tsx` (sheet + PDF preview modal ~305–409)
- Modify: `apps/client/src/pages/sales-order/SalesOrderDetailPage.tsx` (print mount lines ~327, ~1120) — only if needed
- Modify: `apps/client/src/pages/sales-order/SalesOrderIndexPage.tsx` (print handler ~362) — only if needed
- Test (write only — never run): scoped client test per repo conventions if the print logic is testable; otherwise state why not

**Interfaces:**
- Consumes (from Task 1 `## Produces`, verbatim):
  - **Client identity path:** `settings.companyIdentity` — tRPC `protectedProcedure.query`, no input, no extra permission. Response shape: `{ name: string; addressLines: string[]; phone: string; taxId: string }`.
  - **Locale contract:** `GET /api/sales-order/:id/pdf?locale=en|id` — only `en` or `id` (case-insensitive, trimmed); missing/invalid defaults to `en`. Fetch the PDF with the current intl locale.
  - **Print palette (mirror these exact hexes into print CSS with a `/* KEEP IN SYNC with apps/server/src/lib/print-palette.ts */` comment):** `PRINT_INK #080D16` · `PRINT_MUTED #003B67` · `PRINT_BORDER #D6DFE7` · `PRINT_PAPER #FFFFFF` · `PRINT_PRIMARY #0069A6` (Aurora Azure) · `PRINT_SUCCESS #00A859` · `PRINT_WARNING #EF9900` · `PRINT_DESTRUCTIVE #E7000B` · `PRINT_WASH_NEUTRAL #EAEFF3` · `PRINT_WASH_SOFT #F4F7F9` · `PRINT_WASH_PRIMARY #E6F0F6` · `PRINT_WASH_SUCCESS #D9F2E6` · `PRINT_WASH_DESTRUCTIVE #FDE6E7` · status map `DRAFT/AI_VALIDATED/PROPOSED/APPROVED/REJECTED → {bg,fg}` (unknown status → neutral).
  - **Currency digits convention:** IDR → 0, all other currencies → 2.
  - Server exports listed above are consumed via the PDF URL only — never import server code from the client.
- Produces (for Task 6 i18n): exact list of any NEW i18n keys under `sales_order.print.*`

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- `apps/client/src/pages/sales-order/SalesOrderPrint.tsx`, `SalesOrder.css`, `SalesOrderDetailPage.tsx`, `SalesOrderIndexPage.tsx`
- The existing StatusChip/label map (find via grep) for status labels
- `apps/client/src/locales/en.json` + `id.json` (`sales_order.print.*` keys)

**Frozen contract:**
- Scope the print hack: `@media print { body * { visibility: hidden } }` must stop contaminating other pages — use `body:has(.so-print)` scoping or a body-class pattern; printing any other page must be unaffected
- `.so-print` becomes `position: static` in print so long documents flow across pages; `tr { break-inside: avoid }`; grand-total row moved outside `tfoot` (Chrome repeats tfoot on every fragmented page)
- `print-color-adjust: exact` on `.so-print` + a border fallback on the black grand-total band (invisible when background graphics are suppressed)
- Mirror Task 1's print palette hexes into the print CSS with a `/* KEEP IN SYNC with apps/server/src/lib/print-palette.ts */` comment (single brand across both renderers)
- `ai_validated` status: add missing pill CSS class + translated label via the existing label map — no raw enum in output
- Per-currency `maximumFractionDigits` (0 for IDR, 2 otherwise) in the sheet
- Empty line-items guard row (translated "no items") instead of an empty table with totals
- PDF preview fetch appends `?locale=<current intl locale>`; sheet header gains the company identity block (name / addressLines / phone / taxId) from Task 1's client-facing source
- Scope guard: do NOT consolidate the two print mechanisms this pass (server-PDF modal + HTML sheet both stay); no raw hex outside the frozen print palette; all new user-visible strings via intl

**Steps:**
- [ ] Step 1: Implement CSS scoping + flow + palette changes
- [ ] Step 2: Implement TSX changes (locale param, identity block, status labels, currency digits, guard row)
- [ ] Step 3: Write scoped test if feasible
- [ ] Step 4: Self-review; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: files changed, the exact mirrored palette hexes, and the exact NEW i18n keys introduced (name + en/id meaning) for Task 6.

### Task 8: Client — SO detail + PDF dual rendering

**Files:**
- Modify: `apps/client/src/pages/sales-order/SalesOrderDetailPage.tsx`
- Modify: `apps/client/src/pages/sales-order/SalesOrderPrint.tsx`

**Interfaces:**
- Consumes: T1 `## Produces` (`SalesOrderItem.packSize`); T2 `## Produces` (`cartonCount`)
- Produces: `3 carton (60 pcs)` dual rendering on detail page + PDF

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, the two files above, `apps/client/src/pages/region/*` (reference pages)

**Frozen contract:**
- Line table gains both columns: **Qty (carton)** and **Qty (pcs)**, beside the existing per-piece price and totals.
- PDF prints `3 carton (60 pcs) @ 1,500 → 90,000` — buyer and warehouse read the same number.
- Carton count is always derived from the line's own **snapshot** `packSize` (never the live SKU), so a later repack cannot change a printed invoice.
- Money columns unchanged (per-piece price, `tabular-nums`, right-aligned).
- tRPC vanilla client only; semantic Tailwind tokens (no raw hex, no gray text); strings via `intl.formatMessage` under `salesOrder.*`.

**Design law (FROZEN):** `docs/design-system/DESIGN.md` · Tokens: `apps/client/src/index.css` · Motion: `apps/client/src/lib/motion.ts` · UI craft owner: frontend-engineer + ui-ux-pro-max

**Steps:**
- [ ] Add both quantity columns to detail
- [ ] Add the dual rendering to the PDF
- [ ] Verify snapshot-sourced derivation
- [ ] `bun run check-types` in `apps/client`
- [ ] Self-review

**Report back (mandatory):** `## Produces` — components changed, i18n keys used.

**Preservation:** additive only — existing columns, money rendering, and PDF layout preserved.

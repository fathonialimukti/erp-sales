### Task 7: Client — SO form carton entry

**Files:**
- Modify: `apps/client/src/pages/sales-order/SalesOrderFormPage.tsx`

**Interfaces:**
- Consumes: T2 `## Produces` (`cartonCount`); T4 `## Produces` (server error shape for non-multiple)
- Produces: carton-count input with live pcs + line-total computation and inline validation

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `apps/client/src/pages/sales-order/SalesOrderFormPage.tsx`, `apps/client/src/pages/region/*` (reference pages)

**Frozen contract:**
- The quantity input is labelled in **cartons**; the rep types `3`.
- Live computed columns on the line: **pcs** (`3 × 20 = 60`) and **line total** (`60 × unitPrice`), both `tabular-nums`.
- Non-multiple values flag immediately **on the field**: `"must be a multiple of 20"` (pack size named), before submit.
- On SKU swap, the line re-snapshots the pack size client-side and re-validates the entered carton count.
- Payload submitted to the server stays **pieces** (`cartonCount × packSize`) — the wire schema is unchanged.
- Price stays per piece (C1).
- tRPC vanilla client only; semantic Tailwind tokens (no raw hex, no gray text); all strings via `intl.formatMessage` under `salesOrder.*`.

**Design law (FROZEN):** `docs/design-system/DESIGN.md` · Tokens: `apps/client/src/index.css` · Motion: `apps/client/src/lib/motion.ts` · UI craft owner: frontend-engineer + ui-ux-pro-max

**Steps:**
- [ ] Convert the quantity input to carton entry
- [ ] Live pcs + total computation
- [ ] Inline non-multiple flagging + SKU-swap re-validation
- [ ] `bun run check-types` in `apps/client`
- [ ] Self-review: can a rep submit a non-multiple through any path here?

**Report back (mandatory):** `## Produces` — the derived-line helper names the form now uses, i18n keys used.

**Preservation:** additive only — existing form fields, totals, and submission behavior preserved.

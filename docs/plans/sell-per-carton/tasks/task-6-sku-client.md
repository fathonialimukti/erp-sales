### Task 6: Client — SKU form pack size + display

**Files:**
- Modify: `apps/client/src/pages/sku/SkuFormPage.tsx`
- Modify: `apps/client/src/pages/sku/SkuIndexPage.tsx`
- Modify: `apps/client/src/pages/sku/SkuDetailPage.tsx`

**Interfaces:**
- Consumes: T1 `## Produces` (`Sku.packSize`); T2 `## Produces` (`cartonCount`)
- Produces: pack-size entry + display on all SKU surfaces

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `apps/client/src/pages/region/*` (reference pages for conventions), the three SKU pages above

**Frozen contract:**
- SKU form: **pack size** field — integer input, min 1, default 1, hint `"pcs per carton"`.
- List + detail: surface pack size as `20 pcs/carton`, or `per piece` when `packSize === 1`.
- tRPC vanilla client only (`trpcClient.sku.*` in `queryFn`).
- Semantic Tailwind tokens — no raw hex, no gray text (`text-gray-*`/`slate-*`/`zinc-*`/`neutral-*`/`stone-*` banned, gray `muted-foreground` banned).
- Every user-visible string via `intl.formatMessage`, keys under `sku.*` in `en.json` + `id.json` (T10 adds them; you reference the agreed names).

**Design law (FROZEN):** `docs/design-system/DESIGN.md` · Tokens: `apps/client/src/index.css` · Motion: `apps/client/src/lib/motion.ts` · UI craft owner: frontend-engineer + ui-ux-pro-max

**Steps:**
- [ ] Add the field to the form with validation
- [ ] Add display to list + detail
- [ ] `bun run check-types` in `apps/client`
- [ ] Self-review

**Report back (mandatory):** `## Produces` — components changed, i18n keys used.

**Preservation:** additive only — no existing SKU field or column removed.

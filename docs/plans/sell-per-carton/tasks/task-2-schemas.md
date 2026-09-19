### Task 2: Zod schemas (carton validation)

**Files:**
- Modify: `packages/schemas/src/sku.ts` (packSize on create/update)
- Modify: `packages/schemas/src/sales-order.ts` (line input stays pieces; add carton helper)
- Modify: `packages/schemas/src/index.ts` only if a new export is needed

**Interfaces:**
- Consumes: SPEC §Validation — where it lives; SPEC §Data model
- Produces:
  - `packSize` on `skuCreateSchema` / `skuUpdateSchema` — `z.number().int().min(1).default(1)`
  - `assertCartonMultiple(quantity, packSize, skuName)` → throws `TRPCError`-shaped error (`BAD_REQUEST`) with message `"${skuName} is only sold per carton of ${packSize} pcs"` when `quantity % packSize !== 0` or `quantity <= 0`
  - `cartonCount(quantity, packSize)` → `quantity / packSize` (number), the derived-carton helper used by client + PDF

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `packages/schemas/src/sku.ts`, `packages/schemas/src/sales-order.ts`, `packages/schemas/src/index.ts`

**Frozen contract:**
- Import `.js` extensions per repo convention. Do not change any existing field or remove exports.
- The tRPC input payload for SO lines **stays in pieces** — do not add carton-count to the wire schema.
- `skuUpdateSchema` requires `currentId` (repo convention) — keep that intact when adding `packSize`.

**Steps:**
- [ ] Add `packSize` to SKU create/update schemas
- [ ] Implement + export `assertCartonMultiple` and `cartonCount`
- [ ] `bun run check-types` in `packages/schemas`
- [ ] Self-review

**Report back (mandatory):** `## Produces` with exact signatures.

**Preservation:** additive only.

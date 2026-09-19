### Task 4: SO router carton enforcement

**Files:**
- Modify: `apps/server/src/routers/sales-order.ts` (create + update procedures)

**Interfaces:**
- Consumes: T1 `## Produces` (`SalesOrderItem.packSize`); T2 `## Produces` (`assertCartonMultiple`, `cartonCount`)
- Produces: server-enforced whole-carton rule on every write path; line `packSize` snapshot behavior

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `apps/server/src/routers/sales-order.ts`, `apps/server/src/routers/region.ts` (reference router for conventions)

**Frozen contract:**
- Source-of-truth validation, per SPEC §Validation:
  - **Create:** look up each line's `Sku.packSize`; reject unless `quantity` is a positive multiple; error message names sku + pack size; then write that `packSize` onto the line.
  - **Update, SKU unchanged:** validate against the line's existing snapshot.
  - **Update, SKU swapped:** validate against the new SKU's `packSize`, re-snapshot onto the line.
- The wire payload stays in pieces — do not change the tRPC input schema shape.
- Mutations write activity-log entries per repo convention.
- Money math untouched.

**Steps:**
- [ ] Add validation to create + update
- [ ] Implement snapshot write/re-snapshot
- [ ] `bun run check-types` in `apps/server`
- [ ] Self-review: is there any remaining write path that could persist a non-carton line?

**Report back (mandatory):** `## Produces` — the exact procedure names now enforcing the rule, and any shared helper exported for reuse.

**Preservation:** additive only — no existing procedure, permission string, or returned field removed.

### Task 3: Seed rewrite

**Files:**
- Modify: `apps/server/src/prisma/seed.ts`

**Interfaces:**
- Consumes: T1 `## Produces` (`Sku.packSize`); T2 `## Produces` (`cartonCount`)
- Produces: seeded SKUs with realistic pack sizes; SO items written with `packSize` snapshot + carton-multiple quantity

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `apps/server/src/prisma/seed.ts`

**Frozen contract:**
- **Reseed approved by user** — you may rewrite seed data wholesale; no data migration is required or wanted.
- Every seeded `crm_sales_order_items.quantity` must be a positive multiple of its SKU's `packSize`, and the item row's `packSize` snapshot must be written explicitly (never left to default for a seeded order).
- Cover both cases: `packSize > 1` (e.g. 20) **and** `packSize = 1` (piece-only degenerate path).
- Keep the existing user/role/permission seeding intact.

**Steps:**
- [ ] Assign realistic pack sizes to seeded SKUs
- [ ] Regenerate SO items as carton multiples with explicit snapshot
- [ ] Include at least one packSize=1 SKU
- [ ] Self-review: no seeded line violates the carton rule (it would fail T4's server check)

**Report back (mandatory):** `## Produces` listing what the seed now guarantees.

**Preservation:** user/role/permission seeding must survive the rewrite.

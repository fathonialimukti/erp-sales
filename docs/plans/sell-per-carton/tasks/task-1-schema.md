### Task 1: Schema + migration

**Files:**
- Modify: `apps/server/src/prisma/schema.prisma` (models `Sku`, `SalesOrderItem`)
- Create: migration via `bunx prisma migrate dev --name add_pack_size` (commit the generated SQL)

**Interfaces:**
- Consumes: SPEC §Data model
- Produces: `Sku.packSize Int @default(1) @map("pack_size")`; `SalesOrderItem.packSize Int @default(1) @map("pack_size")`

**Reads (in your own context — no context is provided):**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `apps/server/src/prisma/schema.prisma`

**Frozen contract:**
- Additive only — two columns, both `@default(1)`, both nullable-free. Existing rows backfill to piece-only.
- No other model touched. No relation changes.

**Steps:**
- [ ] Add the two fields exactly as specified
- [ ] Run `bunx prisma migrate dev --name add_pack_size` from `apps/server`; commit generated SQL
- [ ] `bunx prisma generate`
- [ ] Self-review: migration is additive; `prisma validate` passes

**Report back (mandatory):** end with a `## Produces` block listing exact field names, types, and the migration filename.

**Preservation:** additive only — do not delete or regress any existing field, relation, or index.

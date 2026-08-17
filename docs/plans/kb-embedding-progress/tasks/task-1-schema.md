### Task 1: Schema — add embeddingStatus column

**Files:**
- Modify: `apps/server/src/prisma/schema.prisma` (KnowledgeChunk model, ~line 667–681)

**Frozen contract:**
- Add column to `KnowledgeChunk`:
  ```
  embeddingStatus String @default("none") @map("embedding_status")
  ```
  Place it next to `embeddingUpdatedAt`. Values: `pending | done | failed | none` (stored as TEXT, not a Postgres enum — simpler migration).
- After editing schema, run `bunx prisma migrate dev --name add_knowledge_embedding_status` from `apps/server` to generate + apply the migration.
- Run `bunx prisma generate` so the Prisma Client type includes `embeddingStatus`.

**Produces:**
- `KnowledgeChunk.embeddingStatus: string` available to all downstream tasks.

**Steps:**
- [ ] Add the column to the Prisma model
- [ ] Run migrate dev
- [ ] Run prisma generate
- [ ] Confirm `bun run check-types` passes in `apps/server`

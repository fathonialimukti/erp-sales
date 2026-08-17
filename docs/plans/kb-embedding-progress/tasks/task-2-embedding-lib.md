### Task 2: Embedding lib — set status around embed calls

**Files:**
- Modify: `apps/server/src/lib/ai-embedding.ts`

**Consumes:**
- `KnowledgeChunk.embeddingStatus` column from Task 1

**Frozen contract:**
- Add a helper `setChunkEmbeddingStatus(id, status)` that runs raw SQL:
  ```sql
  UPDATE knowledge_chunks SET embedding_status = $1 WHERE id = $2
  ```
  Use `prisma.$executeRawUnsafe`. Status values: `pending | done | failed | none`.
- In `embedKnowledgeChunkBestEffort(db, id, title, content)`:
  - If `!isEmbeddingConfigured(db)` → set status `none`, return false.
  - Before calling `generateEmbedding` → set status `pending`.
  - On success (after `upsertChunkEmbedding`) → set status `done`.
  - On catch → set status `failed`, return false.
- In `embedKnowledgeChunksBestEffort` (batch ingest): set `pending` before each batch, `done`/`failed` per row. Keep best-effort semantics — never throw.
- In `clearChunkEmbedding(id)` (called on edit): also reset `embedding_status = 'none'` so the stale vector + status are cleared together.

**Produces:**
- All embed paths now write `embeddingStatus` transitions.

**Steps:**
- [ ] Add `setChunkEmbeddingStatus`
- [ ] Wire into `embedKnowledgeChunkBestEffort`
- [ ] Wire into `embedKnowledgeChunksBestEffort`
- [ ] Wire into `clearChunkEmbedding`
- [ ] `bun run check-types` passes in `apps/server`

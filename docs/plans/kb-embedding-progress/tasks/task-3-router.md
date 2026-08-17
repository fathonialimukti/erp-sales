### Task 3: Router — expose status, set pending on save

**Files:**
- Modify: `apps/server/src/routers/knowledge-base.ts`

**Consumes:**
- `KnowledgeChunk.embeddingStatus` from Task 1
- `setChunkEmbeddingStatus` from Task 2

**Frozen contract:**
- `list` and `detail` queries already return the full row (Prisma `findMany`/`findUnique` with no `select`) — `embeddingStatus` is automatically included. No query change needed; just verify.
- In `create` mutation: BEFORE calling `embedKnowledgeChunkBestEffort`, set status `pending` via `setChunkEmbeddingStatus(created.id, 'pending')` (wrap in try/catch, never fail the mutation). Then `void embedKnowledgeChunkBestEffort(...)`.
- In `update` mutation: when `contentChanged`, after `clearChunkEmbedding` (which now resets status to `none`), set status `pending` before `void embedKnowledgeChunkBestEffort(...)`.
- Do NOT change permission strings: `knowledge-base@create|read|update|delete`.
- Do NOT change input schemas.

**Produces:**
- Saved chunks immediately have `embeddingStatus = 'pending'`, transitioning to `done`/`failed`/`none` as the background embed completes.

**Steps:**
- [ ] Import `setChunkEmbeddingStatus`
- [ ] Set `pending` in `create` before fire-and-forget
- [ ] Set `pending` in `update` (contentChanged branch) before fire-and-forget
- [ ] `bun run check-types` passes in `apps/server`
- [ ] `bunx vitest run src/tests/routers/knowledge-base.test.ts` (if exists) still passes

### Task 3: Embedding lib — derive config from AI provider (`ai.*`)

**Files:**
- Modify: `apps/server/src/lib/ai-embedding.ts`
- Test: `apps/server/src/tests/lib/ai-embedding.test.ts` (rewrite env-fallback tests to use `AI_*`)

**Interfaces:**
- Consumes: `getSettingValue` / `getSecretValue` from `settings-service.ts`
- Produces: unchanged public API — `isEmbeddingConfigured`, `getEmbeddingModelId`, `getEmbeddingDimensions`, `getEmbeddingSimilarityThreshold`, `toPgVectorLiteral`, `generateEmbedding`, `generateEmbeddings`, `upsertChunkEmbedding`, `clearChunkEmbedding`, `embedKnowledgeChunkBestEffort`, `embedKnowledgeChunksBestEffort`, `ensureKnowledgeEmbeddingHnswIndex`, `EMBEDDING_COLUMN_DIMENSIONS`

**Frozen contract:**
- **Embedding config now derives from the AI provider settings** (`ai.baseUrl`, `ai.apiKey`, `ai.model`) instead of `embedding.*`.
- `isEmbeddingConfigured(db)`: true when `ai.baseUrl` AND `ai.model` are set (API key optional). Reads `ai.baseUrl` / `ai.model` via `getSettingValue`.
- `getEmbeddingModelId(db)`: returns `ai.model` (trimmed).
- `requireEmbeddingConfig(db)`: baseURL from `ai.baseUrl` (trim trailing `/`), apiKey from `getSecretValue(db, 'ai.apiKey')` (fallback `'not-set'` when empty), modelId from `ai.model`. Error message should reference AI provider settings.
- `getEmbeddingDimensions(db)`: **unchanged** — still locked to `EMBEDDING_COLUMN_DIMENSIONS` (1536) to match the pgvector column. Remove the `embedding.dimensions` read; keep the 1536 lock + warning logic.
- `getEmbeddingSimilarityThreshold(db)`: **unchanged** — keep `DEFAULT_SIMILARITY_THRESHOLD = 0.5` and the `embedding.similarityThreshold` read (this is a retrieval tuning knob, not a provider config). If you prefer, keep reading `embedding.similarityThreshold` — it is NOT a provider setting.
- `getEmbeddingModel(db)`: build `createOpenAICompatible` provider from AI-provider baseURL/apiKey, `provider.embeddingModel(modelId)`.
- Do NOT change `EMBEDDING_COLUMN_DIMENSIONS`, `toPgVectorLiteral`, `buildEmbedText`, `upsertChunkEmbedding`, `clearChunkEmbedding`, `embedKnowledgeChunkBestEffort`, `embedKnowledgeChunksBestEffort`, `ensureKnowledgeEmbeddingHnswIndex`.

**Steps:**
- [ ] Step 1: Rewrite `apps/server/src/tests/lib/ai-embedding.test.ts` to use `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY` env vars (mirror the existing structure but with AI keys). Keep the dimensions-lock and threshold tests.
- [ ] Step 2: Edit `apps/server/src/lib/ai-embedding.ts` per contract.
- [ ] Step 3: Run `bunx vitest run src/tests/lib/ai-embedding.test.ts` in `apps/server` — confirm pass.
- [ ] Step 4: Run `bun run check-types` at repo root.
- [ ] Step 5: Self-review.

**Note:** Do NOT touch `rag.ts` (it calls the unchanged public API) or `settings-service.ts` (separate task). Do NOT touch client files.

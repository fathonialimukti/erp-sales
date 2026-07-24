# RAG hybrid (FTS + vector-ready)

## Goal
Make knowledge retrieval reliable and observable now (Postgres FTS), while preparing `knowledge_chunks` for future semantic search once an embedding endpoint exists.

pgvector is installed (`vector` 0.8.5). Embedding endpoint is **not** ready (`POST /v1/embeddings` 404 on current AI base).

## Non-goals
- No MCP Apps / `@ai-sdk/mcp` (not a retrieval fix)
- No live embedding generation until provider exists
- No wipe of UI-created knowledge entries on re-ingest if avoidable

## Current state
| Piece | Status |
|-------|--------|
| `knowledge_chunks` | 51 rows; columns: id, source, title, content, timestamps |
| RAG | `retrieveRelevantChunks()` pure FTS, inject into system prompt |
| Tools | `queryDatabase` often preferred over docs |
| UI | No RAG/knowledge tool chip |
| Ingest | `deleteMany()` then reload `src/knowledge/*.md` only |

## Target architecture (phase 1)

```
User message
  → retrieveRelevantChunks (FTS, return structured hits)
  → inject "## Relevant Documentation" with titles/sources
  → optional tool: searchKnowledge (model can re-query docs)
  → chat UI shows knowledge hits / tool chip
```

Phase 2 (later): fill `embedding vector(N)` via AI SDK `embed`/`embedMany`, hybrid FTS+vector rank.

## Frozen contract

Resource: knowledge / RAG  
Fields (knowledge_chunks additions):
- embedding: Unsupported("vector") or raw SQL column `embedding vector(1536)` nullable — do **not** require Prisma native vector type if awkward; use `$executeRaw` / raw SQL for column + index if needed
- embeddingModel: String? (nullable, for future backfill tracking)
- embeddingUpdatedAt: DateTime? (nullable)

Permission strings: existing knowledge-base@* if any; no new permission required for chat RAG  
Router namespace: no new domain CRUD required  
Schema touch: packages/schemas only if knowledge-base create/update needs optional fields (prefer leave create schemas unchanged)  
Router: apps/server/src/lib/rag.ts, scripts/ingest-knowledge.ts, routes/ai.ts, lib/ai-tools.ts, maybe knowledge-base router ingest safety  
Pages: AiAssistant only (client)  
i18n: optional labels if chip text needs locales; English inline labels OK if matching existing ToolChip pattern  

Reference:
- `apps/server/src/lib/rag.ts`
- `apps/server/src/scripts/ingest-knowledge.ts`
- `apps/server/src/routes/ai.ts`
- `apps/server/src/lib/ai-tools.ts`
- `apps/client/src/components/AiAssistant/AiAssistant.tsx`
- Design law (FROZEN): docs/design-system/aurora-commerce-design-law.md
- Tokens: apps/client/src/index.css
- Motion: apps/client/src/lib/motion.ts

## Backend requirements (phase 1)

1. **DB**
   - Ensure `CREATE EXTENSION IF NOT EXISTS vector` is documented / safe to run in migrate/script
   - Add nullable `embedding vector(1536)` on `knowledge_chunks` (raw SQL migration or prisma-compatible approach)
   - Optional HNSW index creation can wait until embeddings exist; if easy, add commented or IF NOT EXISTS later
   - Add nullable `embedding_model` text + `embedding_updated_at` timestamptz if useful

2. **`retrieveRelevantChunks`**
   - Return structured hits: `{ title, source, content, rank }[]` and a formatted string
   - Keep FTS as primary
   - Log hits in dev: count + titles (or return metadata for prompt)
   - Include source in formatted markdown: `### {title} (source: {source})`

3. **`searchKnowledge` tool** (server-executed preferred, or client tool that hits small endpoint — prefer server execute if project pattern allows server tools)
   - Input: `query: string`, optional `limit`
   - Calls same retrieval
   - Returns titles + snippets + sources so chat shows a tool chip
   - Description: use for product docs, workflows, permissions, navigation, schema docs; NOT for live transactional counts

4. **Prompt**
   - Prefer `searchKnowledge` / retrieved docs for “how does X work / what is the process”
   - Prefer `queryDatabase` only for live data
   - Instruct model to cite documentation titles when using retrieved knowledge

5. **Ingest safety**
   - Do **not** blindly `deleteMany()` all rows if UI knowledge entries exist
   - Prefer: delete only `source` values that come from markdown files (`approvals`, `general`, etc.), or upsert by source+title
   - Preserve rows created via Knowledge Base UI (source often not one of the md basenames — inspect current create payload)

6. **AI_AGENT.md**
   - Update RAG section: FTS + vector column ready, embeddings deferred

## Frontend requirements (phase 1)

1. Add `searchKnowledge` to `TOOL_META` → label `Knowledge` or `Search docs`
2. Chip detail can show hit count if output available
3. No design essay; match existing ToolChip patterns
4. Design law (FROZEN): docs/design-system/aurora-commerce-design-law.md
   Tokens: apps/client/src/index.css  
   Motion: apps/client/src/lib/motion.ts  
   UI craft owner: Frontend Engineer + ui-ux-pro-max

## Success criteria
- Chat can show `✓ Knowledge` when model calls `searchKnowledge`
- FTS still injects relevant docs into system prompt
- `knowledge_chunks.embedding` column exists (nullable)
- Re-ingest does not wipe UI-created KB rows
- `bun run check-types` / targeted tests pass

## Out of phase 1
- Calling any embedding API
- Filling vectors
- Reranking
- MCP

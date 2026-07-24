# RAG hybrid v2 — Guide-aligned (AI SDK rag-chatbot)

Reference: https://ai-sdk.dev/cookbook/guides/rag-chatbot

## Goal
Align ERP RAG with the AI SDK guide pattern (chunk → embed → vector retrieve via tool → multi-step), adapted for ERP multi-tools and Prisma.

## Embedding env (option 2 — separate OpenAI-compatible endpoint)

```env
EMBEDDING_BASE_URL=https://your-embed-host/v1
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=text-embedding-3-small
# optional
EMBEDDING_DIMENSIONS=1536
EMBEDDING_SIMILARITY_THRESHOLD=0.5
```

If unset/unreachable → FTS-only fallback (no crash).

## Architecture

```
Ingest / KB create|update
  → chunk
  → store knowledge_chunks
  → if embedding configured: embedMany + write embedding + embedding_model + embedding_updated_at
  → ensure HNSW index (vector_cosine_ops)

Chat
  → streamText tools include searchKnowledge (guide's getInformation)
  → execute: hybrid findRelevantContent
      1) embed query when configured + rows with embeddings exist
      2) cosine similarity (1 - <=>) threshold + limit
      3) FTS always as fallback/merge
  → multi-step stopWhen stepCountIs(5)
  → answer from tool results for doc questions; ERP tools for navigate/SQL
```

## Naming
- Keep tool name `searchKnowledge` (already in UI chips); description mirrors guide `getInformation`
- Optional internal alias `findRelevantContent` in embedding/rag module

## Files
- apps/server/src/lib/ai-embedding.ts (new) — generateEmbedding(s), isEmbeddingConfigured
- apps/server/src/lib/rag.ts — hybrid search
- apps/server/src/lib/ai-tools.ts — searchKnowledge uses hybrid
- apps/server/src/lib/ai-provider.ts or embedding provider helper
- apps/server/src/scripts/ingest-knowledge.ts — embed after insert when configured
- apps/server/src/routers/knowledge-base.ts — embed on create/update when configured
- apps/server/.env.example — document vars
- apps/server/AI_AGENT.md — update
- apps/server/src/scripts/ensure-knowledge-vector-columns.ts — HNSW if possible
- tests for hybrid helpers / embedding gate

## Non-goals
- Chat addResource tool (KB UI exists)
- MCP
- Strict "Sorry I don't know only" prompt (ERP needs navigate/SQL)

## Prompt policy
- Doc/process/permission/navigation/schema → searchKnowledge first
- Live data → queryDatabase
- Cite title/source from tool hits
- Keep client tools for navigation/forms

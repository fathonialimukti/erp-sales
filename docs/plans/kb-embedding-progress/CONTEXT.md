# KB Embedding Progress — Context

## Goal
Surface real embedding progress to the user. Today embedding is fire-and-forget (`void embedKnowledgeChunkBestEffort`) with no client signal beyond a nullable `embeddingUpdatedAt`.

## Decision
- **Indeterminate progress bar** (animated), not determinate 0–100%. The AI SDK `embed()` is a single HTTP call with no byte stream — a true percentage is not available.
- Add `embeddingStatus` enum column to `knowledge_chunks`: `pending | done | failed | none`.
- Set `pending` when embedding starts, `done` on success, `failed` on error, `none` when provider unconfigured.
- Client polls `knowledgeBase.detail` while `embeddingStatus === 'pending'` (2s interval, max ~30s).

## Files
- `apps/server/src/prisma/schema.prisma` — add `embeddingStatus` column
- `apps/server/src/lib/ai-embedding.ts` — set status around embed calls
- `apps/server/src/routers/knowledge-base.ts` — set `pending` on create/update; expose status in list/detail
- `apps/client/src/pages/knowledge-base/KnowledgeBaseFormPage.tsx` — show Progress bar after save while pending
- `apps/client/src/pages/knowledge-base/KnowledgeBaseDetailPage.tsx` — show Progress bar if pending, badge if done/failed/none
- `apps/client/src/pages/knowledge-base/KnowledgeBaseIndexPage.tsx` — show pending indicator in the Embedding column
- `apps/client/src/locales/{en,id}.json` — new keys

## Stack
- tRPC v11, Prisma, Zod, React 19, TanStack Query, shadcn Aurora, react-intl
- Reference router: `apps/server/src/routers/region.ts`
- Reference pages: `apps/client/src/pages/Region*.tsx`
- Design law: `docs/design-system/` · Tokens: `apps/client/src/index.css`

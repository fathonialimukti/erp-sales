# Knowledge Base — Context Pack

## Frozen Contract

```
## FROZEN CONTRACT — do not reinterpret, do not re-read conventions
Resource: knowledgeBase
Fields: title:string(min 1), content:string(min 1), source:string(min 1), createdAt/updatedAt managed by DB
Permission strings: knowledge-base@create | knowledge-base@read | knowledge-base@update | knowledge-base@delete
Router namespace (tRPC): trpcClient.knowledgeBase.{list, detail, create, update, delete}
Schema files: packages/schemas/src/knowledge-base.ts → export from packages/schemas/src/index.ts
Router file: apps/server/src/routers/knowledge-base.ts → register in apps/server/src/router.ts
Client pages: apps/client/src/pages/knowledge-base/KnowledgeBaseIndexPage.tsx, KnowledgeBaseDetailPage.tsx, KnowledgeBaseFormPage.tsx
i18n prefix: knowledgeBase.* (add to both en.json and id.json)
Reference router: apps/server/src/routers/region.ts
Reference pages: apps/client/src/pages/region/*
Context pack: docs/plans/knowledge-base/CONTEXT.md
Design is FROZEN. Do NOT invoke brainstorming, writing-plans, or re-read .github/instructions files.
```

## Key repo facts

- The server already reads from the Prisma model `KnowledgeChunk` via [apps/server/src/lib/rag.ts](apps/server/src/lib/rag.ts).
- The AI assistant already calls the RAG retrieval path before answering user prompts in [apps/server/src/routes/ai.ts](apps/server/src/routes/ai.ts).
- The client already uses a consistent module-page list/detail/form pattern under [apps/client/src/pages/region](apps/client/src/pages/region).
- The sidebar and permissions system already support feature-level permission strings.

## Implementation scope

- Add a small CRUD router for knowledge-base entries backed by the existing `knowledge_chunks` table.
- Expose list/detail/create/update/delete procedures through tRPC.
- Add client pages for browsing and editing knowledge-base entries.
- Add i18n keys for the new module and hook it into navigation.
- Keep the change minimal and aligned with the existing ERP patterns.

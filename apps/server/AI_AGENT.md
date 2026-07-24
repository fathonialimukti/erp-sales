# ERP AI Agent

Architecture and implementation reference for the AI assistant integrated into the ERP Warehouse system.

---

## Overview

The AI assistant is built on **Vercel AI SDK v6** (`ai` package), running against a local OpenAI-compatible model. It operates across two layers:

- **Server** (`POST /api/ai/chat`) — authenticates the request, builds the system prompt with user context and RAG-retrieved knowledge, then streams the model response (including tool calls) back to the client as Server-Sent Events.
- **Client** (`AiAssistant.tsx`) — receives the SSE stream, executes tool calls (navigation, form fill, page context read), and renders the chat UI.

---

## High-Level Architecture

```
User Message
    │
    ▼
POST /api/ai/chat
    │
    ├── 1. Auth (JWT cookie or Bearer header)
    ├── 2. RAG  → retrieveRelevantChunks(userText)
    │              └── Hybrid FTS + vector (FTS-only fallback)
    ├── 3. User context (name, role, permissions from DB)
    ├── 4. buildSystemPrompt(user, permissions, ragContext)
    └── 5. streamText() + createUIMessageStream()
                │
                ▼ SSE stream (tool-input-start / delta / finish-step)
                │
        createPatchedFetch() [browser, intercepts SSE]
                │
                └── inject synthetic tool-input-available event
                            │
                            ▼
                    useChat (AI SDK React)
                            │
                            ├── onToolCall → runTool()
                            └── useEffect fallback → runTool()
```

---

## RAG Pipeline (hybrid FTS + vector)

> **Hybrid retrieval:** FTS always; vector cosine when `EMBEDDING_*` is configured **and** some rows have non-null `embedding`.
> **pgvector:** expected installed (`vector` 0.8.5). Columns: `embedding vector(1536)`, `embedding_model`, `embedding_updated_at`.
> **Graceful fallback:** missing/unreachable embedding endpoint → FTS-only, no crash.

### Embedding env

```env
EMBEDDING_BASE_URL=https://your-embed-host/v1
EMBEDDING_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
# optional — dimensions locked to 1536 (column is vector(1536)); leave unset or set 1536
EMBEDDING_DIMENSIONS=1536
EMBEDDING_SIMILARITY_THRESHOLD=0.5
```

Module: `src/lib/ai-embedding.ts` (`isEmbeddingConfigured`, `generateEmbedding(s)`, `upsertChunkEmbedding`, `clearChunkEmbedding`, best-effort helpers).

**Phase-2 lock:** product uses `vector(1536)` only. If `EMBEDDING_DIMENSIONS` is set to another value, runtime warns once and still embeds at 1536.

**KB update:** title/content change clears embedding columns first, then best-effort re-embed (avoids ranking stale vectors if embed fails).

### Schema (knowledge_chunks)

| Column | Notes |
|---|---|
| id, source, title, content, created_at, updated_at | CRUD + FTS |
| embedding | `vector(1536)` NULL — Prisma `Unsupported("vector")?`; write via raw SQL |
| embedding_model | TEXT NULL |
| embedding_updated_at | TIMESTAMPTZ NULL |

Ensure columns + indexes once per environment (idempotent):

```bash
# required before hybrid vector path is usable on a fresh DB
bun src/scripts/ensure-knowledge-vector-columns.ts
# also run as part of ingest-knowledge.ts
```

### Knowledge Ingestion

**Script:** `src/scripts/ingest-knowledge.ts`  
**Trigger:** `bun src/scripts/ingest-knowledge.ts` / `bun run ai:ingest` (also called by `bun run db:all`)

```
src/knowledge/*.md
        │
        ▼ readdir + readFile
        │
        ▼ splitIntoChunks()
        │   ├── Split on markdown headings (##, ###)
        │   ├── Max chunk size: 800 characters
        │   └── Large sections split further by paragraph (\n\n)
        │
        ▼ ensureVectorReadyColumns()   ← extension + nullable embedding cols
        │
        ▼ deleteMany({ source: { in: markdown basenames } })
        │   ← only replace md-sourced rows; UI-created KB rows preserved
        │
        ▼ createMany() title/content/source
        │
        ▼ if EMBEDDING_* configured: embedMany + upsert vectors
        │
        ▼ FTS GIN index + HNSW cosine index (when embedding configured)
```

KB UI create/update (`knowledgeBaseRouter`) also best-effort re-embeds title+content when configured (never fails the mutation).

### Retrieval at Query Time

**File:** `src/lib/rag.ts`

| Export | Purpose |
|---|---|
| `searchKnowledgeChunks(query, limit)` | Hybrid structured hits |
| `searchKnowledgeChunksFts` / `searchKnowledgeChunksVector` | Path-specific search |
| `findRelevantContent` | Guide-aligned alias of hybrid search |
| `mergeKnowledgeHits` | Dedupe/rank merge |
| `formatKnowledgeHits(hits)` | Markdown `### title (source: x)` for prompt injection |
| `toKnowledgeSearchHits(hits)` | Tool payload snippets |
| `retrieveRelevantChunks(query, limit)` | Formatted string (call-site compatible) |

Dev log: `[rag] mode=vector|fts|hybrid fts=N vector=N merged=N …`

- Empty user message → no hits.
- Up to 5 ranked chunks injected under `## Relevant Documentation`.
- Vector path uses `1 - (embedding <=> query)` with `EMBEDDING_SIMILARITY_THRESHOLD` (default 0.5).

### searchKnowledge tool

**File:** `src/lib/ai-tools.ts` → `serverTools.searchKnowledge`  
**Wired in:** `routes/ai.ts` and `routes/ai-admin.ts` (`...clientTools, ...serverTools`)

- Server-executed (`execute` present) so the chat UI can show a **Knowledge** tool chip.
- Returns `{ hits: [{ title, source, snippet, rank }], count }`.
- Hybrid retrieval under the hood.
- Use for docs/workflows/permissions/navigation/schema; **not** live transactional counts (`queryDatabase`).

### Prompt policy

- Prefer injected docs / call `searchKnowledge` first for how-to, process, permission, navigation, form fields, schema.
- Prefer `queryDatabase` (or admin SQL tool) only for live operational data.
- Cite documentation title/source when answering from docs.
- Do **not** force “Sorry I don’t know” for navigate/create/SQL tasks.

### Knowledge Base Files

Located in `src/knowledge/`:

| File | Contents |
|---|---|
| `pages.md` | Page list, route catalog, and AI usage guidance |
| `forms.md` | Field names per form for `fillFormFields` guidance |
| `navigation.md` | Navigation structure and menu layout |
| `permissions.md` | Permission format (`resource@action`) and full permission list |
| `approvals.md` | Approval workflow (DRAFT → PROPOSED → APPROVED/REJECTED) |
| `general.md` | General ERP system information |

### Re-ingest + embed

```bash
# 1) set EMBEDDING_* in apps/server/.env
# 2) ensure columns
bun src/scripts/ensure-knowledge-vector-columns.ts
# 3) re-ingest markdown (embeds when configured)
bun run ai:ingest
# verify
# SELECT COUNT(*) FROM knowledge_chunks WHERE embedding IS NOT NULL;
```

---

## Server Components

### `src/routes/ai.ts`

| Export | Description |
|---|---|
| `aiChatHandler` | POST handler — auth, RAG, system prompt build, streaming |
| `aiChatResumeHandler` | GET handler — returns 204 (no resumable stream storage yet) |
| `buildSystemPrompt` | Assembles the system prompt from user context + RAG chunks |
| `extractUserMessageText` | Normalises AI SDK message format (string / content array / parts array) |
| `shouldEnableTools` | Bilingual (EN + ID) heuristic deciding whether tools should be enabled |

**`streamText` configuration:**
- `temperature: 0` — deterministic output
- `stopWhen: stepCountIs(5)` — max 5 agentic steps per turn
- `toolChoice: 'required'` when tools are enabled

### `src/lib/ai-provider.ts`

| Env Variable | Default | Description |
|---|---|---|
| `AI_BASE_URL` | `http://localhost:20128/v1` | OpenAI-compatible endpoint |
| `AI_API_KEY` | `sk-a269...` | API key (override in production) |
| `AI_MODEL` | `chatbot` | Model name |
| `AI_DEVTOOLS_ENABLED` | `true` | Enable AI SDK DevTools middleware |

DevTools middleware is automatically disabled in `NODE_ENV=production`.

### `src/lib/ai-tools.ts`

Tools are split into **server** (`serverTools`, with `execute`) and **client** (`clientTools`, no `execute`). Chat handlers merge both into `streamText({ tools })`.

| Tool | Side | Input | Action |
|---|---|---|---|
| `searchKnowledge` | server | `query`, optional `limit` | Hybrid FTS+vector docs search → `{ hits, count }` (Knowledge chip) |
| `navigateTo` | client | `path`, `reason` | Navigate user to the given app route |
| `fillFormFields` | client | `fields` (key → value map) | Pre-fill form inputs on the active page |
| `getPageContext` | client | `reason` (optional) | Scrape DOM `[data-ai-context]` annotations |
| `queryDatabase` | client (HTTP) | `sql`, optional `limit` | Read-only SQL via `/api/ai/query-database` |
| other page helpers | client | varies | summarize / draft / next-steps helpers |

---

## Client Components

### `AiAssistant.tsx`

Floating chat panel mounted globally in `PrivateLayout`.

**Key state:**

| State | Description |
|---|---|
| `open` | Panel open/closed |
| `isExpanded` | Wide mode (360px → 680px) |
| `input` | Current textarea value |
| `handledToolCallsRef` | Set of executed `toolCallId`s — prevents double-fire |

---

### `createPatchedFetch()`

**Problem:** Local OpenAI-compatible models emit `finishReason: "other"` instead of `"tool-calls"`. The AI SDK only emits `tool-input-available` (which triggers `onToolCall`) after receiving a proper finish reason. Without it, tool parts are stuck in `input-streaming` state forever and navigation never executes.

**Solution:** Intercept the SSE response stream at the `fetch` level (POST only), accumulate `tool-input-delta` text per `toolCallId`, and inject a synthetic `tool-input-available` event with the assembled JSON input immediately before each `finish-step` event.

```
Raw stream from model:
  tool-input-start  (toolCallId, toolName)
  tool-input-delta  (inputTextDelta: '{"')
  tool-input-delta  (inputTextDelta: 'path')
  tool-input-delta  (inputTextDelta: '":"/skus"}')
  finish-step       (finishReason: "other")    ← no tool-input-available

After patch (injected before finish-step):
  tool-input-start
  tool-input-delta ×N
  [INJECTED] tool-input-available  { type, toolCallId, toolName, input: {path: "/skus"} }
  finish-step
  finish

Result: AI SDK transitions tool part → input-available → onToolCall fires → navigate()
```

Only POST responses with a body are patched. GET (resume) and 204 responses pass through unmodified.

---

### `runTool(toolName, toolCallId, input)`

Central tool executor. Deduplicated by `handledToolCallsRef` to prevent double execution from `onToolCall` + `useEffect` both firing.

| Tool | Client Action |
|---|---|
| `navigateTo` | `navigate(normalizeRoutePath(path))` via React Router |
| `fillFormFields` | Set `aiFormFillAtom` — read by form pages to pre-fill fields |
| `getPageContext` | Call `collectPageContext()`, return result via `addToolOutput` |

**`ROUTE_ALIASES`** maps model-generated route variants (e.g. `/sku`) to canonical routes (e.g. `/skus`).

---

### `collectPageContext()`

Scrapes live DOM state to give the model accurate information about what is currently on screen:

| Source | Data Collected |
|---|---|
| `[data-ai-context]` attributes | Structured section data (records, IDs, pagination, form fields) |
| `<h1>` | Page heading |
| `document.title` | Browser tab title (trimmed) |
| `button` elements | Visible button labels (max 8) |
| `table`, `[role="table"]` | Count of visible tables |
| `input`, `textarea`, `select` | Count of visible form controls |
| Form sections | Snapshot of current input values (by `name` attribute) |

---

## System Prompt Structure

Built dynamically per request in `buildSystemPrompt()`:

```
You are ERP Assistant for {userName} ({roleName}).

## Permissions
{resource@action list}

## Route Catalog
{ROUTE_CATALOG}

## Instructions
- Never mention route paths in responses — use human-readable module names only.
- Call getPageContext when the user asks about visible data.
- fillFormFields only pre-fills inputs; it does NOT save or submit data.
- Never claim data was saved after fillFormFields.
- ...

## Retrieved Knowledge        ← present only when RAG returns results
{relevant markdown chunks}

## Current Page Context       ← present only when getPageContext was called
{DOM-scraped JSON}
```

---

## Adding a New Page to AI Context

**1. Annotate the page root with `data-ai-context`:**

```tsx
<section
  data-ai-context={JSON.stringify({
    section: 'sku-list',
    totalRecords: total,
    currentPage,
    totalPages,
    visibleRows: data.map(r => ({ id: r.id, skuCode: r.skuCode, skuName: r.skuName })),
  })}
>
```

**2. Add the module to `src/knowledge/pages.md`** under the appropriate table.

**3. Re-ingest knowledge:**

```bash
bun src/scripts/ingest-knowledge.ts
# or
bun run db:seed
```

---

## Adding a New Tool

1. Define the tool in `src/lib/ai-tools.ts` (no `execute`).
2. Add the handler branch in `runTool()` in `AiAssistant.tsx`.
3. Add an entry to `TOOL_META` for the chip label and icon.
4. Update `shouldEnableTools` in `src/routes/ai.ts` if the tool needs new trigger keywords.

---

## Running the Ingestion Script

```bash
# From apps/server/
bun src/scripts/ingest-knowledge.ts
```

Output example:
```
Reading knowledge files from: .../src/knowledge
Found 6 knowledge file(s): [ 'approvals.md', 'forms.md', ... ]
Cleared existing knowledge chunks.
  approvals.md: 4 chunk(s) ingested
  forms.md: 12 chunk(s) ingested
  ...
✓ Ingestion complete: 47 total chunks stored.
```

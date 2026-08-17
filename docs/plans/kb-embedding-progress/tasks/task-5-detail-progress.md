### Task 5: Detail page — progress bar if pending, badge otherwise

**Files:**
- Modify: `apps/client/src/pages/knowledge-base/KnowledgeBaseDetailPage.tsx`
- Modify: `apps/client/src/locales/en.json` (keys may already exist from Task 4 — reuse, don't duplicate)
- Modify: `apps/client/src/locales/id.json`

**Consumes:**
- `knowledgeBase.detail` returns `embeddingStatus`

**Frozen contract:**
- Extend `KnowledgeBaseDetail` type with `embeddingStatus: 'pending' | 'done' | 'failed' | 'none'` and `embeddingUpdatedAt: string | null`, `embeddingModel: string | null`.
- Replace the existing static "Embedded / Not embedded" badge (added in the previous subagent run) with status-aware rendering:
  - `pending` → small inline `Progress` bar + label "Embedding…". Poll `detail` via `refetchInterval: 2000` while pending, stop on terminal.
  - `done` → green "Embedded" badge (with model tooltip).
  - `failed` → red "Embedding failed" badge.
  - `none` → muted "Not embedded" badge.
- i18n keys (add if missing — Task 4 may have added some; reuse):
  - `knowledgeBase.detail.embedding_in_progress` → en "Embedding…" / id "Mengembed…"
  - `knowledgeBase.detail.embedding_embedded` → en "Embedded" / id "Terembed" (likely already exists)
  - `knowledgeBase.detail.embedding_failed` → en "Embedding failed" / id "Embedding gagal"
  - `knowledgeBase.detail.embedding_none` → en "Not embedded" / id "Belum terembed" (likely already exists)

**Design law:**
- Reuse `Badge` + `Progress` primitives. Success/warning/destructive token classes from `ApprovalHistory.tsx`.

**Steps:**
- [ ] Extend type
- [ ] Replace badge with status-aware render
- [ ] Add `refetchInterval` polling while pending
- [ ] Add/reuse i18n keys
- [ ] `bun run check-types` passes in `apps/client`

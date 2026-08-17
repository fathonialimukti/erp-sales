### Task 6: Index page — pending indicator in Embedding column

**Files:**
- Modify: `apps/client/src/pages/knowledge-base/KnowledgeBaseIndexPage.tsx`

**Consumes:**
- `knowledgeBase.list` returns rows with `embeddingStatus`

**Frozen contract:**
- Extend `KnowledgeBaseRow` type with `embeddingStatus: 'pending' | 'done' | 'failed' | 'none'`, `embeddingUpdatedAt: string | null`, `embeddingModel: string | null`.
- Update the existing "Embedding" column (added in the previous subagent run) to render:
  - `pending` → small spinner or pulsing dot + "Embedding…" text (compact, fits a table cell — do NOT put a full Progress bar in the row).
  - `done` → green "Embedded" badge.
  - `failed` → red "Failed" badge.
  - `none` → muted "Not embedded" badge.
- Add `refetchInterval: 5000` to the list query so pending rows refresh while the user views the list. Stop interval when no row is pending (return `false` from `refetchInterval` callback if no `pending` rows).
- i18n keys (reuse from Tasks 4/5 where possible):
  - `knowledgeBase.index.embedding_in_progress` → en "Embedding…" / id "Mengembed…"
  - `knowledgeBase.index.embedding_failed` → en "Failed" / id "Gagal"

**Design law:**
- Compact cell content. Use `Loader2` from `lucide-react` with `animate-spin` for the pending spinner, or a pulsing dot. Keep `size-3.5` icon.

**Steps:**
- [ ] Extend type
- [ ] Update column cell render
- [ ] Add conditional `refetchInterval`
- [ ] Add/reuse i18n keys
- [ ] `bun run check-types` passes in `apps/client`

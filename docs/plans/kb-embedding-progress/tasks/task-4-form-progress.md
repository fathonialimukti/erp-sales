### Task 4: Form page — indeterminate progress bar after save

**Files:**
- Modify: `apps/client/src/pages/knowledge-base/KnowledgeBaseFormPage.tsx`
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Consumes:**
- `knowledgeBase.detail` now returns `embeddingStatus: 'pending' | 'done' | 'failed' | 'none'`

**Frozen contract:**
- After a successful create/update, do NOT navigate away immediately. Instead:
  1. Keep the user on the form.
  2. Poll `knowledgeBase.detail.query({ id })` every 2s while `embeddingStatus === 'pending'`, max ~15 polls (30s). Use TanStack Query `refetchInterval` conditioned on status.
  3. Show an **indeterminate** `Progress` bar (from `@/components/ui/progress`) with a label "Embedding…" while pending.
  4. When status becomes `done` → show success toast "Embedded" and navigate to detail page.
  5. When status becomes `failed` or `none` → show warning toast "Embedding skipped/failed" and navigate anyway (the row is saved; only the vector failed).
- Replace the current `setTimeout(() => navigate(...), 1200)` with this polling flow.
- The `Progress` bar is indeterminate: pass no `value` prop, or animate via CSS. Use the existing `Progress` primitive — do NOT create a new component.
- i18n keys to add (both en.json and id.json):
  - `knowledgeBase.form.embedding_in_progress` → en "Embedding…" / id "Mengembed…"
  - `knowledgeBase.form.embedding_done` → en "Embedded" / id "Terembed"
  - `knowledgeBase.form.embedding_failed` → en "Embedding failed — entry saved" / id "Embedding gagal — entri disimpan"
  - `knowledgeBase.form.embedding_skipped` → en "Embedding skipped — entry saved" / id "Embedding dilewati — entri disimpan"

**Design law:**
- Tokens from `apps/client/src/index.css`. Use existing `success`/`warning`/`destructive` token classes for the toast variants.
- Progress bar uses primary color (default `Progress` styling).

**Steps:**
- [ ] Replace post-save `setTimeout` with status-polling flow
- [ ] Render `Progress` while pending
- [ ] Toast + navigate on terminal status
- [ ] Add i18n keys to both locale files
- [ ] `bun run check-types` passes in `apps/client`

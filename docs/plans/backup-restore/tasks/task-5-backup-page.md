### Task 5: Backup Index Page

**Files:**
- Create: `apps/client/src/pages/backup/BackupIndexPage.tsx`

**Interfaces:**
- Consumes (exact names — Tasks 3 & 4 outputs):
  - `trpcClient.backup.list` (paginated), `trpcClient.backup.create`, `trpcClient.backup.delete`, `trpcClient.backup.restore`, `trpcClient.backup.download` (returns `{ filename, content }`)
  - Upload: `fetch('/api/backups/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-backup-filename': <file.name> }, body: <file text> })` → `201 { backup }` or `400 { error: 'INVALID_BACKUP_FILE' }`
  - i18n: EXACTLY these `backup.*` keys (shared frozen list with Task 6): `backup.title`, `backup.description`, `backup.create`, `backup.createSuccess`, `backup.upload`, `backup.uploadSuccess`, `backup.uploadFailed`, `backup.restore`, `backup.restoreConfirmTitle`, `backup.restoreConfirmDescription`, `backup.restoreSuccess`, `backup.restoreFailed`, `backup.download`, `backup.delete`, `backup.deleteConfirmTitle`, `backup.deleteConfirmDescription`, `backup.deleteSuccess`, `backup.sourceCreated`, `backup.sourceUploaded`, `backup.colFilename`, `backup.colSource`, `backup.colSize`, `backup.colTables`, `backup.colCreatedBy`, `backup.colCreatedAt`, `backup.colActions`, `backup.empty`, `backup.tableCount`. For dialog cancel/confirm buttons reuse existing shared keys (e.g. `common.*`) if present; otherwise add `backup.cancel` / `backup.confirm` and note it in your report.
- Produces (Task 7 relies on this):
  - Default export `BackupIndexPage` from `apps/client/src/pages/backup/BackupIndexPage.tsx`
  - Canonical route path: `/backups`

**UI contract:**
- Paginated table: filename, source badge (`CREATED` → `backup.sourceCreated`, `UPLOADED` → `backup.sourceUploaded`), size (human-readable), tables (`backup.tableCount` with total row count), created by (user name), createdAt, actions column
- Toolbar: **Create backup** (calls `backup.create`, success toast `backup.createSuccess`, refresh list) and **Upload backup** (hidden `<input type="file" accept="application/json,.json">`; reads file as text, POSTs raw JSON body; success toast `backup.uploadSuccess` + refresh; on `400` toast `backup.uploadFailed`)
- Row actions: **Restore** → destructive `AlertDialog` (`backup.restoreConfirmTitle` / `backup.restoreConfirmDescription`) → `backup.restore` mutation → toast `backup.restoreSuccess`, refresh; on error toast `backup.restoreFailed` with server message. **Download** → `backup.download` → Blob → object URL → programmatic `<a download>` click. **Delete** → destructive `AlertDialog` (`backup.deleteConfirmTitle` / `backup.deleteConfirmDescription`) → `backup.delete` → toast `backup.deleteSuccess`, refresh.
- Empty state: `backup.empty`
- Follow the reference page's exact patterns for queryFn usage, pagination, toasts, dialogs, table markup.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/client/src/pages/RegionIndexPage.tsx` or the closest `Region*Index*.tsx` (reference page — copy patterns for list/pagination/mutations/dialogs/toasts)
- `docs/design-system/DESIGN.md` (design law — FROZEN)
- `apps/client/src/index.css` (semantic tokens) and `apps/client/src/lib/motion.ts` (motion)
- `apps/client/src/locales/en.json` (check which `common.*` keys already exist for dialog buttons)

**Frozen contract:**
- Route: `/backups` · Page: `BackupIndexPage` · i18n prefix: `backup.*`
- tRPC vanilla only (`trpcClient.*` in `queryFn`) · semantic Tailwind tokens (no raw hex, no gray text) · functional components · every user-visible string via `intl.formatMessage`

**Steps:**
- [ ] Step 1: Read the reference files listed above
- [ ] Step 2: Implement `BackupIndexPage.tsx` per the UI contract
- [ ] Step 3: `bun run check-types` — must pass
- [ ] Step 4: Self-review against the design law + this brief; no raw colors; all strings via intl

**Report back (mandatory):**
End with a `## Produces` block: component export, route path, exact i18n keys used (flag any additions beyond the frozen list, e.g. `backup.cancel`), and the tRPC procedures consumed.

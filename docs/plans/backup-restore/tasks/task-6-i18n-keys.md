### Task 6: i18n Keys

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Interfaces:**
- Consumes: the frozen key list (shared with Task 5 — must match exactly)
- Produces: a `backup` section in both locale files containing EXACTLY these keys (en values below; write accurate natural Indonesian for `id.json`):

```
backup.title: "Backup & Restore"
backup.description: "Create, download, upload and restore database backups."
backup.create: "Create backup"
backup.createSuccess: "Backup created"
backup.upload: "Upload backup"
backup.uploadSuccess: "Backup uploaded"
backup.uploadFailed: "Upload failed"
backup.restore: "Restore"
backup.restoreConfirmTitle: "Restore this backup?"
backup.restoreConfirmDescription: "This will erase all current data and replace it with the content of this backup. This action cannot be undone."
backup.restoreSuccess: "Database restored from backup"
backup.restoreFailed: "Restore failed"
backup.download: "Download"
backup.delete: "Delete"
backup.deleteConfirmTitle: "Delete this backup?"
backup.deleteConfirmDescription: "The backup file will be permanently removed. This action cannot be undone."
backup.deleteSuccess: "Backup deleted"
backup.sourceCreated: "Created"
backup.sourceUploaded: "Uploaded"
backup.colFilename: "File"
backup.colSource: "Source"
backup.colSize: "Size"
backup.colTables: "Tables"
backup.colCreatedBy: "Created by"
backup.colCreatedAt: "Date"
backup.colActions: "Actions"
backup.empty: "No backups yet. Create your first backup to get started."
backup.tableCount: "{count, plural, one {# table} other {# tables}}"
```

- Keep ICU message syntax intact (`{count, plural, ...}`) in both languages.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/client/src/locales/en.json` and `apps/client/src/locales/id.json` (existing structure, nesting style, where to insert the `backup` section alphabetically/conventionally)

**Frozen contract:**
- Prefix: `backup.*` in both files; no other sections touched
- If Task 5 reports added keys (e.g. `backup.cancel`, `backup.confirm`), include them too — check the latest Task 5 report before finishing

**Steps:**
- [ ] Step 1: Read both locale files to learn structure
- [ ] Step 2: Add the `backup` section with the exact keys + en values above
- [ ] Step 3: Write idiomatic Indonesian translations in `id.json`
- [ ] Step 4: `bun run check-types` — must pass
- [ ] Step 5: Self-review: key sets identical across both files; ICU syntax preserved

**Report back (mandatory):**
End with a `## Produces` block: the full list of `backup.*` keys added to each file (flag any extras beyond the frozen list).

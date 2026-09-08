### Task 3: Backup Router + Registration

**Files:**
- Create: `apps/server/src/routers/backup.ts`
- Modify: `apps/server/src/router.ts` (add import + `backup: backupRouter` entry)

**Interfaces:**
- Consumes (exact names — Task 1 & 2 outputs):
  - From `@repo/schemas`: `backupListInputSchema`, `backupIdInputSchema`, `backupCreateInputSchema`
  - From `../lib/backup.js`: `BACKUPS_DIR`, `exportBackupToDisk`, `readBackupFile`, `deleteBackupFile`, `parseBackupEnvelope`, `restoreFromBackup`
- Produces (Task 4 & 5 rely on this):
  - `backupRouter` registered in `apps/server/src/router.ts` as `backup: backupRouter`
  - Procedures (all follow the reference router's procedure/middleware style):
    - `backup.list` — query, `hasPermission('backup@read')`, input `backupListInputSchema`, paginated per the `createListInputSchema` helper pattern
    - `backup.download` — query, `hasPermission('backup@read')`, input `backupIdInputSchema`, returns `{ filename: string; content: string }`; maps `BACKUP_FILE_NOT_FOUND` to `TRPCError NOT_FOUND`
    - `backup.create` — mutation, `hasPermission('backup@create')`, input `backupCreateInputSchema`; calls `exportBackupToDisk({ schemaVersion })` where `schemaVersion` = `version` from `apps/server/package.json` (read at runtime), inserts the `Backup` row, writes an activity log entry (+ log-detail helper per repo convention)
    - `backup.delete` — mutation, `hasPermission('backup@delete')`, input `backupIdInputSchema`; deletes file + row, activity log entry
    - `backup.restore` — mutation, `hasPermission('backup@restore')`, input `backupIdInputSchema`, uses `transactionalProtected`; reads + parses the file, compares `envelope.meta.schemaVersion` with the current app version — on mismatch throws `TRPCError` with code `BAD_REQUEST` and message `Backup schema version <x> does not match current version <y>`; on match calls `restoreFromBackup(ctx.db, envelope)` and writes an activity log entry (include row counts)

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/src/routers/region.ts` (reference router — copy its procedure style, permission guard, pagination, and activity-log usage)
- `apps/server/src/router.ts` (registration pattern)
- `apps/server/src/lib/backup.ts` (Task 2 output — verify exact signatures)
- `packages/schemas/src/backup.ts` (Task 1 output)

**Frozen contract:**
- Permission strings: `backup@read`, `backup@create`, `backup@delete`, `backup@restore`
- Namespace: `trpcClient.backup.{list, download, create, delete, restore}`
- Restore is destructive + atomic: one transaction, no partial commits

**Steps:**
- [ ] Step 1: Read the reference files listed above
- [ ] Step 2: Implement `apps/server/src/routers/backup.ts` with the five procedures
- [ ] Step 3: Register in `apps/server/src/router.ts`
- [ ] Step 4: `bun run check-types` — must pass
- [ ] Step 5: Self-review: every procedure permission-guarded; mutations log activity; version mismatch message exact; no test running (Task 8 owns tests)

**Report back (mandatory):**
End with a `## Produces` block: exact router export name, registration line, procedure names with input/output shapes, permission strings used, and the exact `BAD_REQUEST` restore message format.

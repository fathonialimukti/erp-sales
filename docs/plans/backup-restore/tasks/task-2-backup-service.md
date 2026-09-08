### Task 2: Backup Service

**Files:**
- Create: `apps/server/src/lib/backup.ts`
- Modify: `.gitignore` (add `apps/server/backups/`)
- Test: none in this task (server tests are centralized in Task 8)

**Interfaces:**
- Consumes (from Task 1 — exact names):
  - Prisma model `Backup`, enum `BackupSource` (via the regenerated Prisma client)
  - `backupEnvelopeSchema`, `type BackupEnvelope` from `@repo/schemas`
- Produces (Tasks 3 & 4 import these exact names from `../lib/backup.js`):
  - `BACKUPS_DIR: string` — absolute path to `apps/server/backups/`; directory ensured to exist (mkdir recursive) at module init
  - `getOrderedTableNames(): Promise<string[]>` — every application table, topologically ordered parents-before-children, derived from the Prisma schema at runtime (use `Prisma.dmmf` if the generator exposes it; otherwise parse `apps/server/prisma/schema.prisma` relations). NO hardcoded table list.
  - `exportBackupToDisk(input: { schemaVersion: string }): Promise<{ filename: string; sizeBytes: number; tableCounts: Record<string, number>; schemaVersion: string }>` — reads every table via the Prisma client from `../lib/prisma.js`, builds the `{ meta, data }` envelope, writes `backups/<ulid>-<ISO-timestamp>.json`, returns file facts. `meta.createdAt` = ISO string.
  - `writeBackupFile(envelope: BackupEnvelope): Promise<{ filename: string; sizeBytes: number }>` — persists an already-built envelope (used by upload)
  - `readBackupFile(filename: string): Promise<string>` — file content; throws a plain `Error('BACKUP_FILE_NOT_FOUND')` if missing (router maps to NOT_FOUND)
  - `deleteBackupFile(filename: string): Promise<void>` — silently ok if already missing
  - `parseBackupEnvelope(content: string): BackupEnvelope` — JSON.parse + `backupEnvelopeSchema` validation; throws on malformed
  - `restoreFromBackup(db: Prisma.TransactionClient, envelope: BackupEnvelope): Promise<{ tableCounts: Record<string, number> }>` — inside the caller's transaction: delete all rows from every table in REVERSE topological order, insert rows table-by-table in topological order. Returns per-table inserted counts. Row values are inserted as stored (JSON round-trip); Date-like strings in Date columns must be converted back to Date objects per Prisma field types.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/src/prisma/schema.prisma` (models + relations for ordering — note: the schema lives under `src/prisma/`, not `apps/server/prisma/`)
- The Prisma client lib file (glob `apps/server/src/lib/prisma.ts`)
- `packages/schemas/src/backup.ts` (Task 1 output — verify exact export names)

**Frozen contract:**
- Backups dir: `apps/server/backups/` (gitignored, created on demand)
- Filename pattern: `<ulid>-<ISO-timestamp>.json`
- All-or-nothing restore is the caller's transaction; this service never opens its own

**Steps:**
- [ ] Step 1: Read the reference files listed above
- [ ] Step 2: Implement `apps/server/src/lib/backup.ts` with the exact exports above
- [ ] Step 3: Add `apps/server/backups/` to `.gitignore`
- [ ] Step 4: `bun run check-types` — must pass
- [ ] Step 5: Self-review: no hardcoded table names; ordering truly derived; restore deletes before inserts in correct order

**Report back (mandatory):**
End with a `## Produces` block listing each exported function's exact name and signature, and state which DMMF-vs-parse mechanism you used for table ordering.

### Task 4: Upload Endpoint

**Files:**
- Modify: the Express app setup file that mounts tRPC (locate it yourself — start at `apps/server/src/index.ts`)
- No new dependencies (the body is raw JSON; scope an `express.json({ limit: '100mb' })` to this route only)

**Interfaces:**
- Consumes (exact names — Task 2 & 3 outputs):
  - From `../lib/backup.js`: `parseBackupEnvelope`, `writeBackupFile`
  - Prisma client from `../lib/prisma.js`; `Backup` model; `BackupSource.UPLOADED`
- Produces (Task 5 relies on this):
  - `POST /api/backups/upload` — body is the raw backup-envelope JSON (`Content-Type: application/json`)
  - Guarded by the same auth middleware used by protected tRPC procedures + `backup@restore` permission check (follow how existing Express-level auth/permission is done in this server; if there is no Express-level permission helper, verify the session/user and permission inline using the same primitives the tRPC context uses)
  - Behavior: `parseBackupEnvelope(req.body)` → `writeBackupFile(envelope)` → insert `Backup` row (`source: UPLOADED`, `schemaVersion` from `envelope.meta.schemaVersion`, `tableCounts` from `envelope.meta.tableCounts`, `note`: original client-sent filename passed via `x-backup-filename` header if present) → activity log entry → respond `201 { backup: <metadata row> }`
  - Errors: malformed envelope → `400 { error: 'INVALID_BACKUP_FILE' }`; unauthenticated → existing 401 behavior; missing permission → 403
  - Response metadata shape must match what `backup.list` returns for a row

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/src/index.ts` (Express mount point, existing middleware order)
- `apps/server/src/routers/backup.ts` (Task 3 — keep row creation + activity log consistent with it)
- `apps/server/src/lib/backup.ts` (Task 2 — exact signatures)
- tRPC context file (how user + permissions are resolved, to mirror the guard)

**Frozen contract:**
- Route: `POST /api/backups/upload`, raw JSON body, no multipart library
- Permission: `backup@restore`
- Uploaded backups are ordinary `Backup` rows with `source: UPLOADED` — visible and restorable via the standard tRPC procedures

**Steps:**
- [ ] Step 1: Read the reference files listed above
- [ ] Step 2: Implement the route with scoped body parser + guards
- [ ] Step 3: `bun run check-types` — must pass
- [ ] Step 4: Self-review: parser scoped to this route only (does not affect tRPC's body handling); permission enforced; activity log written

**Report back (mandatory):**
End with a `## Produces` block: exact route path, request/response shapes, error codes, guard mechanism used, and the file(s) modified.

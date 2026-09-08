# Database Backup & Restore — Design (Spec)

Date: 2026-09-07
Status: Approved (user-approved in brainstorming session)

## Overview

Add a database backup & restore subsystem to ERP Sales:

1. **Create backup** — server writes every table's rows to a JSON file on disk and records metadata in a new `Backup` table.
2. **List backups** — paginated table in the UI, sourced from the `Backup` table.
3. **Download backup** — returns the JSON file content so the user can save an off-machine copy.
4. **Upload backup** — user uploads a previously downloaded (or otherwise obtained) backup file; it is saved and appears in the list.
5. **Restore backup** — from a listed backup (server-stored *or* uploaded). Full wipe-and-replace, atomic.
6. **Delete backup** — removes the file and its metadata row.

## Decisions (user-approved)

| Decision | Choice |
|---|---|
| Backup format | JSON export via Prisma (no `pg_dump` dependency) |
| Restore semantics | Full wipe & replace, single transaction, all-or-nothing |
| Storage | Files on disk (`backups/` dir, gitignored) + `Backup` metadata table |
| Data scope | Every application table, including activity logs (full fidelity) |
| Permissions | Dedicated strings: `backup@create`, `backup@read`, `backup@delete`, `backup@restore` |
| Version policy | Restore **refuses** a backup whose `schemaVersion` differs from the current app version (strict in v1; no override flag) |

## Data model

New Prisma model `Backup`:

- `id` — ULID default
- `filename` — file name in the `backups/` directory
- `sizeBytes` — Int
- `tableCounts` — Json (`{ [tableName]: rowCount }`)
- `schemaVersion` — String (app package version captured at backup time)
- `source` — enum `CREATED` | `UPLOADED`
- `note` — String, optional (e.g. uploaded filename origin)
- `createdById` — relation to `User` (who created/uploaded it)
- `createdAt` — DateTime default now

One Prisma migration. The `backups/` directory is created on demand at runtime and gitignored.

## Backup file format

```json
{
  "meta": {
    "schemaVersion": "1.2.3",
    "createdAt": "2026-09-07T10:00:00.000Z",
    "tableCounts": { "users": 42, "customers": 137 }
  },
  "data": {
    "users": [ { "...": "row objects as stored in Postgres (JSON-serialized)" } ],
    "customers": [ "..." ]
  }
}
```

- `schemaVersion` = the server app's package version at backup time.
- Table enumeration and insert/delete ordering are **derived from the Prisma schema at runtime** (DMMF + topological sort by relations) — no hardcoded table list.

## Server

### tRPC router — `apps/server/src/routers/backup.ts`

| Procedure | Type | Permission | Behavior |
|---|---|---|---|
| `backup.list` | query | `backup@read` | Paginated via `createListInputSchema` pattern |
| `backup.download` | query | `backup@read` | Returns `{ filename, content }` (JSON text) — file must exist on disk |
| `backup.create` | mutation | `backup@create` | Reads all tables, writes file, inserts metadata row, activity log |
| `backup.delete` | mutation | `backup@delete` | Removes file + row, activity log |
| `backup.restore` | mutation | `backup@restore` | Validates version, wipes & reinserts in one transaction, activity log |

Registered in `apps/server/src/router.ts`. All mutations write activity-log entries (+ log-detail helpers) per repo convention.

### Upload endpoint

`POST /api/backups/upload` — a dedicated Express route mounted alongside the tRPC adapter. The backup file is itself JSON, so the client reads the file as text and POSTs it with `Content-Type: application/json` (route-scoped raised body limit ~100mb) — no multipart dependency. It is guarded by the same auth middleware + `backup@restore` permission as tRPC mutations. On success: file saved to `backups/`, metadata row inserted with `source: UPLOADED`, activity log written. The uploaded body is validated as a backup envelope (parseable JSON with `meta.schemaVersion` and `data` object) before acceptance.

### Restore semantics (critical path)

1. Load metadata row; verify file exists on disk.
2. Parse + validate envelope; refuse if `meta.schemaVersion` ≠ current app version (typed `BAD_REQUEST` with a clear message).
3. Inside a single `ctx.db` transaction:
   - Delete all rows from every application table in **reverse topological order** (children before parents).
   - Insert all rows from the backup in **topological order** (parents before children).
4. Any failure rolls back the entire transaction — the database is untouched.
5. Write activity log entry (rows restored, table counts).

**Envelope completeness (restore guard):** before opening the wipe transaction, restore verifies that `envelope.data` covers every table reported by the runtime table enumeration (i.e. the backup is complete, not truncated). A schema-valid but incomplete envelope is refused (`BAD_REQUEST`) — wiping tables absent from `data` would be silent data loss.

**pgvector note:** `Unsupported("vector")` columns (e.g. `KnowledgeChunk.embedding`) are invisible to the Prisma client, so backups carry a per-row `__vectorText` side-channel (`<column>::text` via raw SQL) and restore re-casts (`::vector`) inside the same transaction. A missed row (`VECTOR_RESTORE_MISS`) rolls back the restore instead of silently writing NULLs. Column/pk metadata is derived from the generated schema snapshot, not hardcoded. The restore transaction runs with an explicit extended timeout (120s) because full-database wipes exceed Prisma's 5s default.

### Concurrency

A restore holds the transaction for its duration; the app's normal request path keeps working against the old data until commit. No additional locking in v1.

## Client

### Page — `apps/client/src/pages/backup/BackupIndexPage.tsx`

- Route `/backups`, added to the sidebar navigation.
- Paginated table: filename, source badge (`CREATED`/`UPLOADED`), size, table-count summary, created by, createdAt.
- Row actions: **Restore**, **Download**, **Delete**.
- Toolbar: **Create backup** (mutation → refresh list), **Upload backup** (file picker → confirm → upload → appears in list).
- Restore confirmation: destructive `AlertDialog` with explicit copy — "This will erase all current data and replace it with the content of this backup."
- Delete confirmation: destructive `AlertDialog`.
- tRPC vanilla client only (`trpcClient.backup.*` in `queryFn`), semantic Tailwind tokens (no raw hex / gray text), functional components, every user-visible string via `intl.formatMessage` with `backup.*` keys in `en.json` + `id.json`.
- Design law: `docs/design-system/DESIGN.md`; tokens in `apps/client/src/index.css`; motion in `apps/client/src/lib/motion.ts`.

## Error handling

- Version mismatch → typed `TRPCError` (`BAD_REQUEST`) with user-displayable message.
- Missing file on download/restore → `NOT_FOUND`.
- Malformed uploaded file → rejected at upload with clear message; restore re-validates.
- Permission denial → existing `hasPermission` behavior.

## Testing

Server (implemented by backend, executed by quality-engineer):

- Roundtrip: create backup → mutate data → restore → data matches original.
- FK-order correctness on restore (parent/child tables).
- Version-mismatch refusal.
- Upload: valid envelope accepted + metadata row; malformed rejected.
- Permission denials for all four actions.
- Delete removes file + row.

Client: page smoke tests are **deferred** (tracked as a review finding) — the client e2e suite currently only covers auth + crm-smoke; adding a backup e2e spec is out of scope for v1. Server tests are the acceptance bar.

## Out of scope (v1)

- Scheduled/automatic backups.
- Restore version-mismatch override.
- Native `pg_dump`/`pg_restore` support.
- Partial/table-selective backup & restore.
- Progress streaming for long restores.

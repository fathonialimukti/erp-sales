### Task 8: Server Tests

**Files:**
- Create: `apps/server/src/tests/backup.test.ts`

**Interfaces:**
- Consumes (exact names — Tasks 1–3 outputs):
  - Service (`../lib/backup.js`): `BACKUPS_DIR`, `getOrderedTableNames`, `exportBackupToDisk`, `writeBackupFile`, `readBackupFile`, `deleteBackupFile`, `parseBackupEnvelope`, `restoreFromBackup`
  - Router: `backupRouter` procedures `list`, `download`, `create`, `delete`, `restore`
  - Schemas: `backupEnvelopeSchema`
- Produces: a test suite the quality-engineer executes; no runtime code changes

**Required cases (write all of these):**
1. **Roundtrip:** create backup → mutate data (e.g. insert/update a row) → restore → data matches the original snapshot
2. **FK-order correctness:** restore succeeds with parent/child tables populated (child rows reference parent IDs) — proves delete/insert ordering
3. **Version mismatch refusal:** `restore` on a backup whose `meta.schemaVersion` ≠ current app version rejects with `BAD_REQUEST` and message `Backup schema version <x> does not match current version <y>`
4. **Malformed upload rejection:** `parseBackupEnvelope` throws on non-envelope JSON; `writeBackupFile` + full upload flow path stores a valid envelope
5. **Permission denials:** each of `backup@create`, `backup@read`, `backup@delete`, `backup@restore` denied without the permission
6. **Delete:** removes the file from disk AND the `Backup` row
7. **Download:** returns `{ filename, content }` where `content` parses to the original envelope; missing file → `NOT_FOUND`
8. **List:** paginated shape consistent with the reference list tests

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- Existing server tests (glob `apps/server/src/tests/*.test.ts`) — copy the established setup pattern: test DB, caller factory (`t.createCallerFactory` / `router.createCaller`), permission seeding, cleanup
- `apps/server/src/routers/backup.ts` and `apps/server/src/lib/backup.ts` (verify exact names)
- `apps/server/src/routers/region.ts` if the reference tests cover it

**Frozen contract:**
- Tests only — modify no runtime file. If a test reveals a bug in earlier tasks, REPORT it in your final message instead of fixing it silently.
- You write tests but NEVER run them — the quality-engineer executes the suite.

**Steps:**
- [ ] Step 1: Read the reference test files + the backup implementation files
- [ ] Step 2: Write `backup.test.ts` covering all 8 case groups, following the existing test setup/cleanup patterns
- [ ] Step 3: `bun run check-types` — must pass
- [ ] Step 4: Self-review: every case asserts observable state (DB rows, file existence), not just absence of throw

**Report back (mandatory):**
End with a `## Produces` block: test file path, list of test case names, and any suspected bugs found in Tasks 1–4 (do not fix them yourself).

### Task 1: Backup Schema + Prisma Model

**Files:**
- Create: `packages/schemas/src/backup.ts`
- Modify: `packages/schemas/src/index.ts` (add export line following existing pattern)
- Modify: `apps/server/prisma/schema.prisma` (add enum + model)
- Migration: `prisma migrate dev --name add_backup_model` (or Prisma MCP `prisma_local_migrate-dev` with projectCWD `/workspaces/erp-sales`) — then regenerate the Prisma client.

**Interfaces:**
- Consumes: nothing (Layer 1).
- Produces (later tasks import these exact names):
  - Prisma model `Backup`: `id` (ULID default — match the repo's existing ULID convention in this schema file), `filename` String @unique, `sizeBytes` Int, `tableCounts` Json, `schemaVersion` String, `source` BackupSource, `note` String?, `createdById` String + relation to `User` (follow existing relation/onDelete conventions in the schema), `createdAt` DateTime @default(now())
  - Prisma enum `BackupSource`: `CREATED`, `UPLOADED`
  - Zod exports from `packages/schemas/src/backup.ts`, re-exported from `packages/schemas/src/index.ts`:
    - `backupListInputSchema` — built with `createListInputSchema`, consistent with existing domain list schemas
    - `backupIdInputSchema` — `z.object({ id: z.string().min(1) })`
    - `backupCreateInputSchema` — `z.object({ note: z.string().max(200).optional() })`
    - `backupEnvelopeSchema` — `z.object({ meta: z.object({ schemaVersion: z.string(), createdAt: z.string(), tableCounts: z.record(z.string(), z.number()) }), data: z.record(z.string(), z.array(z.unknown())) })`
    - `type BackupEnvelope = z.infer<typeof backupEnvelopeSchema>`

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/prisma/schema.prisma` (ULID default pattern, User relation conventions, enum style)
- `packages/schemas/src/index.ts` and one existing domain schema file (glob `packages/schemas/src/*.ts`, e.g. region) for `createListInputSchema` usage and export style

**Frozen contract:**
- Resource: `backup`
- Permission strings (defined later, not here): `backup@create | @read | @delete | @restore`
- Schema file: `packages/schemas/src/backup.ts` → export added to `packages/schemas/src/index.ts`

**Steps:**
- [ ] Step 1: Read the reference files listed above
- [ ] Step 2: Write `packages/schemas/src/backup.ts` with the five Zod exports
- [ ] Step 3: Add the export to `packages/schemas/src/index.ts`
- [ ] Step 4: Add `BackupSource` enum + `Backup` model to `apps/server/prisma/schema.prisma`
- [ ] Step 5: Run the migration (`add_backup_model`) and regenerate the Prisma client
- [ ] Step 6: `bun run check-types` — must pass
- [ ] Step 7: Self-review against this brief

**Report back (mandatory):**
End your report with a `## Produces` block listing the exact Prisma model/enum names and the exact Zod export names + signatures created. Also confirm the migration name applied and that check-types passed.

### Task 2: Prisma `AiActionConfirmation` Gate Model

**Files:**
- Modify: `apps/server/prisma/schema.prisma` (add one model)
- Create: migration via the repo's migrate flow (`bunx prisma migrate dev --name ai_action_confirmation` from `apps/server`, or the command pattern existing migrations in `apps/server/prisma/migrations/` use)
- Test: none (model-only task; verified by migration success + typecheck)

**Interfaces:**
- Consumes: SPEC §4 model definition.
- Produces: Prisma model `AiActionConfirmation` with fields exactly: `id` (String, primary key, ULID generated app-side per repo convention), `widgetId` (String), `sqlText` (String — exact SQL snapshot the user saw), `readOnly` (Boolean), `backupAck` (Boolean, default false), `status` (String, default `"pending"`, values `pending|confirmed|executed|failed|rejected`), `chatId` (String), `createdBy` (String), `result` (Json, nullable), `createdAt`, `updatedAt`. If the existing schema uses `@default(ulid())`, `@@map`, or index conventions, follow them — report any deviation.

**Reads (in your own context):**
- `docs/plans/ai-chat-widgets/SPEC.md` §4
- `apps/server/prisma/schema.prisma` (existing model conventions — follow them)
- `AGENTS.md`

**Steps:**
- [ ] Step 1: Add the model to `schema.prisma` following existing conventions (naming/casing/mapping like neighboring models). Do not touch any other model.
- [ ] Step 2: Run the migration command. Confirm the generated SQL file exists under `apps/server/prisma/migrations/` and matches the model (one table, columns per above).
- [ ] Step 3: Run `bun run check-types` (scoped). Do NOT run tests.
- [ ] Step 4: Self-review: state machine `pending → confirmed → executed|failed`, `pending → rejected` terminal — note this is enforced in application code (Task 3), not DB constraints; the column is a plain string defaulting to `"pending"`.

**Report back (mandatory):** end with `## Produces` stating the exact model name, field list with types/defaults, and the migration directory name created.

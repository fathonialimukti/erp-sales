### Task 2: Server + Schemas Upgrade

**Files:**
- Modify: `apps/server/package.json`, `packages/schemas/package.json`
- Modify (only if migration codemod requires): `apps/server/tsconfig.json`, Prisma schema/config under `apps/server/prisma/`, `apps/server/src/lib/prisma.ts`-adjacent import paths
- Never touch: `apps/client/**`, root `package.json`, `turbo.json`, `bun.lock` (leave lockfile regeneration to Task 4)

**Interfaces:**
- Consumes: Task 1 version matrix + breaking-change shortlist (read it from the orchestrator handoff)
- Produces: bumped server+schemas deps, applied codemods, `bun run check-types` clean for `apps/server` + `packages/schemas` scope

**Reads (in your own context):**
- `apps/server/package.json`, `packages/schemas/package.json`, Task 1 report, relevant migration guides for tRPC/Prisma/Zod majors you bump

**Frozen contract:**
- Resource permissions unchanged (`hasPermission('resource@action')` strings intact)
- Router namespace unchanged (`trpcClient.<domain>.{list, detail, create, update, delete}`)
- Imports keep `.js` extensions; Prisma client from `../lib/prisma.js`; multi-write handlers keep `prisma.$transaction(async (tx) => …)` with `tx` threaded through
- IDs stay ULID defaults; `update*Schema` keeps `currentId`

**Steps:**
- [ ] Step 1: Bump `apps/server` + `packages/schemas` deps per Task 1 matrix (do not run global `bun update`; edit ranges deliberately, prefer `latest` within strategy confirmed by user)
- [ ] Step 2: Apply only required migration codemods (tRPC/Prisma/Zod); additive only — no renames/removals of procedures or schema fields without explicit approval
- [ ] Step 3: Run `bun run check-types` (scoped if possible); fix only breakage you introduced
- [ ] Step 4: Self-review diff for scope creep

**Report back (mandatory):** End with `## Produces` — exact bumped versions, codemods applied, permission strings verified unchanged, check-types status.

### Task 12: User Settings open without permission (backend)

**Files:**
- Modify: `apps/server/src/routers/settings.ts` ONLY (permission matrix change, no signature change)
- Test (write only, DO NOT run): update/extend `apps/server/src/tests/settings*.test.ts` if present, else create — cover: anon denied, authed user CAN read/write own `user.<userId>.*` with NO permission, authed user CANNOT touch `app.*` without admin permission
- DO NOT touch: `apps/server/src/router.ts`, `packages/schemas/src/*`, `apps/client/**`

**Interfaces:**
- Consumes: `packages/schemas/src/settings.ts` Zod schemas (FROZEN, from T1) + `Setting` Prisma model unique(key, userId) + `ctx.db` transactions via existing helpers.
- Produces: exact procedure→auth matrix (which procedures keep `hasPermission` vs `protected` only), permission strings kept/removed (for frontend + QE to consume verbatim).

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/settings/PLAN.md` (Taxonomy + Storage Model FROZEN)
- `apps/server/src/routers/settings.ts` (current implementation)
- `apps/server/src/routers/region.ts` (reference router conventions)
- `packages/schemas/src/settings.ts` (input shapes)

**Frozen contract:**
- Resource: `settings` (namespaces `app.*` admin vs `user.<userId>.*` per-user)
- Auth rule: `user.*` procedures = `protected` (authenticated) with NO `hasPermission` wrapper — open without permission, but NOT `public` (anon still denied). Enforce `userId` scoping server-side (`user.<callerId>.*` only, never trust client userId).
- `app.*` procedures = keep existing `hasPermission('...')` gates EXACTLY as-is. Do NOT invent new permission strings, do NOT rename router namespace.
- Router namespace: `trpcClient.settings.*` — unchanged.
- Hard rules: imports use `.js` extensions; Prisma via `../lib/prisma.js`; transactions via `ctx.db`; procedures `protected`/`transactionalProtected` + `hasPermission` only where kept; mutations write activity log (+ detail helpers); IDs ULID; `update*Schema` requires `currentId`.

**Steps:**
- [ ] Step 1: Write/extend failing tests for permission matrix (anon vs authed-no-permission vs admin) — write only.
- [ ] Step 2: Remove `hasPermission` from all `user.*` procedures, keep `protected`. Keep `app.*` gates untouched. Enforce per-user scoping.
- [ ] Step 3: Run `bun run check-types` for server scope, self-review. DO NOT run vitest (quality-engineer owns test execution).

**Report back (mandatory):**
End report with a `## Produces` block listing exact procedure names, signatures, `protected` vs `hasPermission('...')` per procedure, permission strings kept/removed, and test file paths written.

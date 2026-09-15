### Task 2: Application Log — file sink + router + permission (backend)

**Files:**
- Discover + Modify: `apps/server/src/lib/<logger>.ts` (resolve exact logger in-context; add file transport — single file only)
- Create: `packages/schemas/src/applicationLog.ts` → Modify: `packages/schemas/src/index.ts` (add export, owned by this task only)
- Create: `apps/server/src/routers/applicationLog.ts` (new router, owned by this task only)
- Modify: `apps/server/src/router.ts` (add import + route entry — owned by this task only)
- Test: `apps/server/src/tests/applicationLog.test.ts` (create)

**Interfaces:**
- Consumes: none (Layer 1 — derive from conventions)
- Produces (FEEDS Task 4 verbatim): router namespace + procedure signatures, Zod schema export names, permission string(s), pagination shape, file-sink path/env

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/ai-email-log-settings/tasks/task-2-app-log-file-permission.md` (this brief)
- Reference router: `apps/server/src/routers/region.ts` (copy: `public`/`protected` + `hasPermission`, `createListInputSchema`/pagination helpers, activity-log pattern, `.js` imports, `../lib/prisma.js`, `ctx.db`)
- Current logging setup — find via own search (pino/winston/console, existing log lib, env config)

**Frozen contract:**
- Resource: `applicationLog`
- Fields (propose minimal, freeze in Produces): `id: ULID, level: enum(info|warn|error|debug), message: string, meta?: json, source?: string, createdAt: datetime`
- Permission strings: `applicationLog@read` (list/detail gate); writes are system-internal, no user-facing create/update/delete
- Router namespace: `trpcClient.applicationLog.{list, detail}` (list via `createListInputSchema`, detail by id; NO create/update/delete procedures)
- File sink: rolling file under server-writable path (e.g. `logs/app-%DATE%.log` or env `LOG_FILE_PATH`); console transport stays; never log secrets
- Schema: `packages/schemas/src/applicationLog.ts` → `packages/schemas/src/index.ts`

**Steps:**
- [ ] Step 1: Write FAILING tests first — schema validation + `list`/`detail` permission-gated (authorized sees, unauthorized gets FORBIDDEN)
- [ ] Step 2: Implement minimal — file transport, Zod schema (`listApplicationLogSchema` pattern per conventions), router with `protected` + `hasPermission('applicationLog@read')`, register in `router.ts`
- [ ] Step 3: Typecheck only — `bun run check-types` scoped. DO NOT run vitest/playwright (QE owns execution)
- [ ] Step 4: Self-review — seed/permission wiring noted for QE; no UI in this task

**Report back (mandatory):**
End report with `## Produces` block: exact Zod export names + file paths, router procedure signatures (`list(input): output`, `detail(input): output`), permission string(s), pagination shape, log file path/env var, seed or migration note if any. Task 4 copies this verbatim into Consumes.

### Task 13: Sys admin denied on app.* (backend bypass fix)

**Files:**
- Modify: `apps/server/src/routers/settings.ts` ONLY if fix is router-scoped; else modify permission helper where `hasPermission` is defined (e.g. `apps/server/src/lib/permissions.js` / middleware — subagent to resolve exact path via glob, single file only, NO broad refactor)
- Test (write only, DO NOT run): extend `apps/server/src/tests/settings.test.ts` — sys-admin caller CAN `get`/`getApp`/`update`/`updateApp` with NO explicit `settings@*` strings
- DO NOT touch: `apps/server/src/router.ts`, `packages/schemas/*`, `apps/client/**`

**Interfaces:**
- Consumes (verbatim from T12):
  - `settings.get` → `protected` + `hasPermission` `settings@read` (KEPT)
  - `settings.update` → `protected` + `hasPermission` `settings@update` (KEPT)
  - `settings.getApp` → `protected` + `hasPermission` `settings@app@read` (KEPT)
  - `settings.updateApp` → `protected` + `hasPermission` `settings@app@update` (KEPT)
  - `settings.getUser`/`updateUser` → `protected` ONLY (`settings@user@read/@update` REMOVED)
  - Bug: sys-admin caller (has-all-permissions, e.g. wildcard / `isSystemAdmin` / admin role — exact flag to be resolved by subagent) gets FORBIDDEN on `app.*` and therefore frontend shows deny card.
- Produces: exact bypass mechanism (e.g. `hasPermission` honors `*` / admin flag), procedures touched, test paths.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/settings/PLAN.md`
- `apps/server/src/routers/settings.ts`
- permission helper where `hasPermission` is defined + auth context (`ctx.user` shape / role / admin flag) — resolve via glob yourself
- `apps/server/src/routers/region.ts` (reference for correct admin-bypass pattern if present)

**Frozen contract:**
- Resource: `settings`, namespaces `app.*` (admin) vs `user.<userId>.*` (per-user)
- Rule: sys admin = has-all-permissions MUST pass ALL `settings@*` gates. Fix the CHECK (bypass), NOT the permission strings — do NOT rename `settings@read/@update/@app@read/@app@update`, do NOT invent new strings, do NOT change router namespace `trpcClient.settings.*`.
- Hard rules: `.js` import extensions; Prisma via `../lib/prisma.js`; `ctx.db` transactions; `protected`/`transactionalProtected` + `hasPermission`; mutations keep activity log + detail helpers.

**Steps:**
- [ ] Step 1: Repro via test — sys-admin caller with no explicit `settings@*` calls `getApp`/`get` → currently FORBIDDEN, must succeed.
- [ ] Step 2: Minimal fix — make `hasPermission` (or call-site) honor sys-admin all-access (wildcard / admin flag, whichever the codebase already uses — do NOT invent a second admin system).
- [ ] Step 3: `bun run check-types` server scope, self-review. DO NOT run vitest.

**Report back (mandatory):**
End with `## Produces` listing exact file + function changed, bypass logic (1 line), procedures now passing for sys admin, permission strings kept/removed, test file paths written.

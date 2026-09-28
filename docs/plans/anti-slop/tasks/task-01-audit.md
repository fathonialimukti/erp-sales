### Task 1: Anti-Slop Audit (read-only, whole repo)

**Files:**
- Create: none (read-only audit)
- Modify: none
- Test: none (do not write code in this task)

**Interfaces:**
- Consumes: AGENTS.md hard rules + user request "make repo not ai slop detected"
- Produces: ranked slop findings + concrete cleanup DAG for T2/T3/T4 (see Report back)

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/design-system/DESIGN.md`
- Reference backend: `apps/server/src/routers/region.ts`
- Reference frontend: `apps/client/src/pages/Region*.tsx`, `apps/client/src/index.css`, `apps/client/src/lib/motion.ts`
- `packages/schemas/src/index.ts` (exports only, to check naming)
- `apps/client/src/locales/en.json` + `id.json` (key parity spot-check)
- Skills: use `ponytail-audit` for whole-repo bloat scan, `ponytail-review` for diff-level over-engineering, `ponytail-debt` for deferred shortcuts. Load via skill tool.

**Frozen contract:**
- Stack: Bun workspaces + Turborepo; server tRPC v11 + Prisma 7 + Express; client React 19 + Vite + Tauri, Tailwind v4 + shadcn Aurora, tRPC vanilla client, react-intl en+id; schemas Zod `@repo/schemas`
- Backend law: `.js` imports; Prisma from `../lib/prisma.js`; txns via `ctx.db`; procedures `public`/`protected`/`transactionalProtected` + `hasPermission('resource@action')`; mutations write activity log; lists via `createListInputSchema`; ULID ids; `update*Schema` requires `currentId`
- Frontend law: `trpcClient.*` in `queryFn` only; semantic Tailwind tokens only (no raw hex, no gray text); functional components; all strings via `intl.formatMessage`
- Design is FROZEN. No redesign, no new UI in this task.

**Steps:**
- [ ] Step 1: Run `ponytail-audit` whole-repo scan (what to delete/simplify/replace with stdlib)
- [ ] Step 2: Run `ponytail-review` lens on recent work (`git log --oneline -10`, `git status`, `git diff --stat`) — generic comments, boilerplate shadcn/Vite leftovers, `any`, empty catch, `console.log`, TODO/placeholder, duplicated Zod/router/page patterns
- [ ] Step 3: Spot-check ERP laws: permission strings, activity logs, pagination helpers, `.js` imports, Prisma import path, i18n parity, semantic tokens, vanilla tRPC usage
- [ ] Step 4: Spot-check tests: `bunx vitest run` scope is OWNED BY YOU as quality-engineer (you may run tests; implementers may not) — report coverage gaps, placeholder asserts
- [ ] Step 5: Write ranked findings (file:line + what to cut + replacement), no code changes

**Preservation (mandatory):** additive changes only — do not delete or regress existing routes, procedures, pages, permission strings, or i18n keys. Removing/renaming an established feature needs explicit user approval. This task makes zero code edits.

**Report back (mandatory):**
End your report with a `## Produces` block listing:
- Exact files with slop (path + line-range where possible)
- Grouped by T2-backend-hygiene vs T3-frontend-craft vs docs/tests
- Suggested frozen contracts for T2/T3 (permission strings, i18n prefixes, router namespaces to fix)
- Later-layer briefs will copy this block verbatim into `Consumes:`.
- Plus one-sentence Commit/Push recommendation (this task: no commit, read-only) and full review package.

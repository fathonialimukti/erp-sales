### Task 1R: Deterministic Slop Scan (read-only, whole repo)

**Files:**
- Create: none (read-only scan)
- Modify: none
- Test: none (do not write code in this task)

**Interfaces:**
- Consumes: AGENTS.md hard rules + research synthesis (ai-slopcheck 72 rules, slop-scan normalized metrics, slopstop Layer 1 overcommented/placeholder/description-mismatch, deslop score, kill-ai-slop 33 visual tells, code-humanizer 16 patterns, Inithouse 9 tells)
- Produces: ranked scanner-grounded findings + concrete T2/T3/T4 contracts (see Report back)

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/design-system/DESIGN.md`
- Reference backend: `apps/server/src/routers/region.ts`
- Reference frontend: `apps/client/src/pages/Region*.tsx`, `apps/client/src/index.css`, `apps/client/src/lib/motion.ts`
- `apps/client/src/locales/en.json` + `id.json` (parity spot-check via script only)
- `docs/plans/anti-slop/tasks/task-01-audit.md` (prior ponytail audit, for delta — do not re-do its work, ground it with scanners)

**Frozen contract:**
- Stack: Bun workspaces + Turborepo; server tRPC v11 + Prisma 7 + Express; client React 19 + Vite + Tauri, Tailwind v4 + shadcn Aurora, tRPC vanilla client, react-intl en+id; schemas Zod `@repo/schemas`
- Backend law: `.js` imports; Prisma from `../lib/prisma.js`; txns via `ctx.db`; procedures `public`/`protected`/`transactionalProtected` + `hasPermission('resource@action')` kebab-case; mutations write activity log; lists via `createListInputSchema`; ULID; `update*Schema` requires `currentId`
- Frontend law: `trpcClient.*` in `queryFn` only; semantic Tailwind tokens only (no raw hex, no gray text); functional components; all strings via `intl.formatMessage` with en+id parity
- Design is FROZEN. No redesign, no new UI in this task.
- Scanners (run read-only, do NOT add config files, do NOT fix — report only):
  - `pip install ai-slopcheck` then `ai-slopcheck scan . --output findings.json --fail-on warning` (72 rules: stubs, silent catches, placeholders, secrets, await-in-loop, unguarded JSON.parse, loose equality, React antipatterns, debug code, deep nesting, large functions, duplication, removed routes)
  - `npx slop-scan --lint` / `--json` (log-and-continue, error-obscuring, empty catches, return-await noise, pass-through wrappers, duplicate helpers, placeholder comments, duplicated test mocks + blended score vs mature-OSS median 1.0)
  - `npx deslop --json` / `deslop score` (console.log, entry/exit logging, context-less TODO, triple null checks, empty catch log-only, obvious/divider comments, `=== true`, single Promise.all)
  - `node skill/scripts/scan.mjs` from kill-ai-slop catalogue if available (33 visual tells: gradients/glow/glass/emoji/mascot/stat-cards) — dependency-free, never edits
  - If a scanner is missing/blocked, note it and cover its signals manually (do not install globally, do not mutate repo)
- Preservation: additive only — this task makes zero code edits.

**Steps:**
- [ ] Step 1: `git status`, `git log --oneline -10`, `git diff --stat` for uniform-freshness / description-mismatch context
- [ ] Step 2: Run ai-slopcheck + slop-scan + deslop read-only, save JSON to /tmp (not repo), record scores (deslop 0-100, slop-scan blended vs 1.0, slopstop-style placeholder/overcomment tallies)
- [ ] Step 3: Run kill-ai-slop scan.mjs or manual visual-tell sweep (gradients, glass, emoji, stat-cards, cookie-cutter README, slop vocab robust/comprehensive/utilize/leverage)
- [ ] Step 4: Ground T1 ponytail findings with scanner evidence: notification authz (`notification.ts:8-107`), permission drift (`activity_log@read`, `applicationLog@read`, `skuCategory@*`), ULID dup (`ai-widgets.ts:32-50` vs `backup.ts:51-70`), dead `styles/*`, `console.log`s, dual toasts, `as any` cluster, `SalesOrder.css:1-2900` second system
- [ ] Step 5: Read-only typecheck/lint/i18n: `bun run check-types`, `bun run lint`, `bun scripts/check-i18n.mjs` — record PASS/warnings only. Server vitest needs PG+JWT_SECRET, client vitest jsdom pool broken, Playwright browsers missing — record blocked, do not fix (T5 owns unblocking)
- [ ] Step 6: Write ranked findings (file:line + rule-id + evidence + proposed fix + behavior risk), grouped for T2 vs T3 vs T4

**Preservation (mandatory):** additive changes only — do not delete or regress existing routes, procedures, pages, permission strings, or i18n keys. This task makes zero code edits. Removing/renaming an established feature needs explicit user approval.

**Report back (mandatory):**
End your report with a `## Produces` block listing:
- Scanner scores (deslop score, slop-scan blended + top hotspots, ai-slopcheck high/warning counts)
- Exact files with slop (path + line-range + rule-id where possible), grouped by T2-backend-hygiene vs T3-frontend-craft vs T4-prose-DNA vs docs/tests
- Suggested frozen contracts for T2/T3/T4 (permission strings, i18n prefixes, router namespaces to fix)
- Later-layer briefs will copy this block verbatim into `Consumes:`.
- Plus one-sentence Commit/Push recommendation (this task: no commit, read-only) and full review package.

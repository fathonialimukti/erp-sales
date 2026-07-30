# Plan — Problems Panel Cleanup (2026-07-30)

User saw noise in Problems panel (Ctrl+Shift+M) plus a deprecated TS warning while editing `apps/server/src/routes/ai-extract.ts`.

## Diagnosis (3 distinct issues)

### 1. 40 Prisma "already exists" errors — FALSE (tooling), NOT a code bug
`get_errors` reports every model/enum in `apps/server/src/prisma/schema.prisma` as a duplicate.
- **Cause**: `apps/server/src/prisma/generated/schema.prisma` (Prisma Client output, gitignored build artifact) duplicates the source schema. The Prisma VS Code extension loads both files and reports collisions.
- `prisma.config.ts` sets `schema: 'src/prisma/schema.prisma'`; `generator client { output = "./generated" }` writes the copy next to it.
- **Fix**: add `.vscode/settings.json` hiding the generated dir from the explorer/extension matcher. No source edit, no migration.
- Owned by orchestrator (config file, not product source).

### 2. AI SDK v7 `system` option @deprecated — REAL TS warning
`ai@7.0.42` marks `system` on `generateObject`/`streamText`/`generateText` as `@deprecated Use instructions instead.` (node_modules/ai/dist/index.d.ts:684). Shows as strikethrough in editor.
- 10 call sites across 7 files (all `system:` → `instructions:`):
  - `apps/server/src/routes/ai-extract.ts:57`
  - `apps/server/src/routes/ai.ts:179, 322, 356`
  - `apps/server/src/routes/ai-admin.ts:387`
  - `apps/server/src/routes/customer-ai.ts:46`
  - `apps/server/src/lib/ai-sales-order-validation.ts:153`
  - `apps/server/src/lib/email-concierge.ts` (one `system,` variable passed — see note in task-2)
- Behaviour-preserving rename. `instructions` is the same field.
- Owned by **Backend Engineer**.

### 3. ~85 Tailwind v4 class-modernization suggestions — FRONTEND lint
Tailwind IntelliSense flags shorthand replacements across ~20 client files. All behaviour-preserving. Module color tokens already registered in `index.css` `@theme inline` → `text-module-order` etc. are valid. Repo memory line 14 confirms lint enforces `text-module-x` over `text-[var(--module-x)]`.
- Owned by **Frontend Engineer**.

## Task DAG

```
T0 (orchestrator): .vscode/settings.json   — hide prisma/generated
  ↓
T1 Backend: system → instructions (7 files, 10 sites)  — Backend Engineer
  ↓
T2 Frontend: Tailwind class modernization (~20 files)  — Frontend Engineer
  ↓
T3 Verify: check-types + vitest                         — orchestrator
  ↓
T4 Code Review: whole-branch                            — Code Reviewer
```

Sequenced one-at-a-time per repo memory `erp-sales-conventions.md:32` (user prefers sequential subagents).

## Out of scope
- No Prisma source edit, no schema change, no DB migration.
- No AI SDK API change beyond the `system` → `instructions` rename.
- No Tailwind config change (classes compile identically).

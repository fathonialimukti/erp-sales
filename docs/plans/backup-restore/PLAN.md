# Database Backup & Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add database backup & restore — create/list/download/upload/delete backups and restore any of them with full wipe-and-replace semantics.

**Architecture:** JSON backups produced via Prisma (no `pg_dump`), stored as files in `apps/server/backups/` with metadata in a new `Backup` table. tRPC router exposes list/create/delete/download/restore; a dedicated Express route handles file upload. Restore is a single transaction: delete all rows in reverse FK order, insert in FK order, refuse on schema-version mismatch.

**Tech Stack:** tRPC v11, Prisma 7 (PostgreSQL), Express, Zod (`@repo/schemas`), React 19 + Vite + Tauri, Tailwind v4 + shadcn (Aurora UI), tRPC vanilla client, react-intl.

**Spec:** `docs/plans/backup-restore/SPEC.md` — the plan argues from the spec; executors read both.

## Global Constraints (repo law — AGENTS.md)

- Imports use `.js` extensions; Prisma client from `../lib/prisma.js`; transactions via `ctx.db`
- Procedures: `public` / `protected` / `transactionalProtected` + `hasPermission('backup@action')`
- Mutations write activity log (+ log-detail helpers); lists via `createListInputSchema` / pagination helpers
- IDs are ULID defaults; `update*Schema` requires `currentId`
- Client: tRPC vanilla only (`trpcClient.*` in `queryFn`), semantic Tailwind tokens (no raw hex, no gray text), functional components, all user-visible strings via `intl.formatMessage`
- Permission strings: `backup@create` | `backup@read` | `backup@delete` | `backup@restore`
- Router namespace: `trpcClient.backup.{list, create, delete, restore, download}`
- i18n prefix `backup.*` in `en.json` + `id.json` — exact key list frozen in task briefs 5 & 6
- **Testing ownership:** implementers write tests but never run them; `quality-engineer` runs all tests. Implementers verify with `bun run check-types` + scoped lint only.
- **Git is manual-only:** no agent ever `add`/`commit`/`push`/merges/opens PRs.
- Restore: full wipe & replace, single transaction, all-or-nothing; refuse on `schemaVersion` mismatch (`BAD_REQUEST`).
- Table enumeration & FK ordering derived from the Prisma schema at runtime (DMMF or schema parse) — no hardcoded table list.
- Backups dir: `apps/server/backups/` — created on demand, gitignored.
- Design law (FROZEN): `docs/design-system/DESIGN.md` · tokens `apps/client/src/index.css` · motion `apps/client/src/lib/motion.ts`

## Execution mode

**One subagent at a time (user instruction).** Tasks dispatch strictly sequentially in the order below, even where the DAG would allow parallelism. Each task's brief lives at the given path; the orchestrator pastes each implementer's `## Produces` block into the next brief's `Consumes:`.

## Task DAG

| # | Task | Agent | Brief |
|---|------|-------|-------|
| 1 | Schema + Prisma model | backend-engineer | `docs/plans/backup-restore/tasks/task-1-schema-and-model.md` |
| 2 | Backup service | backend-engineer | `docs/plans/backup-restore/tasks/task-2-backup-service.md` |
| 3 | Backup router + register | backend-engineer | `docs/plans/backup-restore/tasks/task-3-backup-router.md` |
| 4 | Upload endpoint | backend-engineer | `docs/plans/backup-restore/tasks/task-4-upload-endpoint.md` |
| 5 | Backup index page | frontend-engineer | `docs/plans/backup-restore/tasks/task-5-backup-page.md` |
| 6 | i18n keys | frontend-engineer | `docs/plans/backup-restore/tasks/task-6-i18n-keys.md` |
| 7 | Routes + nav | frontend-engineer | `docs/plans/backup-restore/tasks/task-7-routes-and-nav.md` |
| 8 | Server tests | backend-engineer | `docs/plans/backup-restore/tasks/task-8-server-tests.md` |
| 9 | Whole-branch review + test execution | quality-engineer | (dispatched with review package at the end) |

Dependency chain: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 (strictly sequential per execution mode).

## Self-Review

- Spec coverage: backup create (T2+T3), list (T3+T5), download (T3+T5), upload (T2+T4+T5), restore (T2+T3+T5), delete (T2+T3+T5), metadata model (T1), version refusal (T3), FK ordering (T2), i18n (T6), routes/nav (T7), tests (T8). ✔
- Placeholders: briefs contain exact paths, signatures, permission strings, and i18n keys; implementation detail deliberately resolved by implementers against reference files they read themselves. ✔
- Type consistency: service signatures in T2 `Produces` are copied verbatim into T3/T4 `Consumes`; i18n key list identical in T5/T6. ✔

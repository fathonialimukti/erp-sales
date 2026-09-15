# AI Chat Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generative-UI widgets in AI chat — inline form cards the AI can request mid-conversation, plus a server-enforced SQL confirmation gate for the AI Admin (exact confirmed SQL, one-time-use, transactional, results fed back for AI re-analysis).

**Architecture:** Tool-call widget protocol. The AI emits `request_form_input` / `request_confirmation` tool calls; payloads are Zod-validated (`@repo/schemas`) and persisted as JSON widgets on assistant messages. The AI loop pauses; the client renders interactive shadcn cards; submissions flow back as structured turns. SQL execution goes through an `AiActionConfirmation` gate table — the server executes exactly the confirmed snapshot, never re-generated, inside a `ctx.db` transaction, and appends an `action_result` the AI must re-analyze.

**Tech Stack:** tRPC v11 + Prisma 7 (PostgreSQL), Zod (`@repo/schemas`), React 19 + Vite + Tauri, Tailwind v4 + shadcn (Aurora UI), tRPC vanilla client, react-intl (en + id), Bun + Turborepo.

**Spec:** `docs/plans/ai-chat-widgets/SPEC.md` — the plan argues from the spec; executors read both.

## Global Constraints

Applies to every task implicitly:

- Imports use `.js` extensions; Prisma client from `../lib/prisma.js`; transactions via `ctx.db` (repo hard rule).
- Procedures: `public` / `protected` / `transactionalProtected` + `hasPermission('ai@...')` — exact permission string must match existing `ai@*` permissions in the repo; the router task reports the aligned strings in `## Produces`.
- Mutations write activity log (+ log-detail helpers). IDs are ULID defaults.
- Client: tRPC vanilla only (`trpcClient.*` in `queryFn`), semantic Tailwind tokens (no raw hex, no gray text), functional components, all user-visible strings via `intl.formatMessage`.
- **Git is manual-only** — no agent commits; the user commits at the end. (Overrides the writing-plans commit-step default; briefs have no commit steps.)
- **Testing ownership:** the quality-engineer runs all tests; implementers write tests and run `bun run check-types` only.
- One SQL statement per confirmation card; execution transaction timeout 30s; result caps: 20 sample rows to the AI (200 stored), values truncated ~200 chars (SPEC §6).
- Design law (FROZEN): `docs/design-system/` · tokens `apps/client/src/index.css` · motion `apps/client/src/lib/motion.ts`. UI craft owner: frontend-engineer + ui-ux-pro-max.

## Task DAG

```
Layer 1 (sequential):  T1 schemas → T2 Prisma gate model → T3 router mutations
Layer 2 (parallel):    T4 AI pipeline tools | T5 renderer+form card | T6 confirm card | T7 i18n
Layer 3 (sequential):  T8 wire into existing chat pages
Layer 4:               T9 QE whole-branch review (runs all tests)
```

Shared-file ownership: `packages/schemas/src/index.ts` → T1 only · `apps/server/prisma/schema.prisma` → T2 only · `apps/server/src/router.ts` → T3 only · locale files → T7 only · chat page/message components → T8 only.

| Task | Brief | Agent | Depends on |
|---|---|---|---|
| T1 | `tasks/task-1-widget-schemas.md` | backend-engineer | — |
| T2 | `tasks/task-2-prisma-confirmation-model.md` | backend-engineer | T1 |
| T3 | `tasks/task-3-ai-chat-router-mutations.md` | backend-engineer | T2 |
| T4 | `tasks/task-4-ai-pipeline-tools.md` | backend-engineer | T3 |
| T5 | `tasks/task-5-widget-renderer-form-card.md` | frontend-engineer | T3, T7 (keys frozen in spec) |
| T6 | `tasks/task-6-confirm-card.md` | frontend-engineer | T3, T7 (keys frozen in spec) |
| T7 | `tasks/task-7-i18n.md` | frontend-engineer | — |
| T8 | `tasks/task-8-wire-chat-pages.md` | frontend-engineer | T4–T7 |
| T9 | `tasks/task-9-qe-review.md` | quality-engineer | T1–T8 |

Note: T5/T6 consume T3's `## Produces` for the real router namespace, and the frozen `ai.widget.*` key list from SPEC §9 — so T5/T6/T7 can run in parallel despite the table above listing T7.

## Execution

Subagent-driven: orchestrator dispatches one fresh subagent per task with the brief file path; briefs carry frozen contracts; each implementer ends with a `## Produces` report that fills the next brief's `Consumes:` block. Final QE pass runs the full test suite.

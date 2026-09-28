# Copilot instructions — erp-sales project DNA

Applies to every Copilot agent in this repo. Full DNA: `CONTEXT.md`.
Agent bottom line: `AGENTS.md`. Product law: `PRODUCT.md`.
System map: `docs/ARCHITECTURE.md`. UI law: `docs/design-system/DESIGN.md`.

## STACK (exact)

Bun `1.3.14` + Turbo `2.10.7`. Client: React 19 + Vite + Tailwind v4 + shadcn,
tRPC v11 vanilla client, TanStack Query/Form/Table, jotai, react-intl (en+id),
motion (`motion/react`), Tauri wrapper. Server: Express 5 + tRPC v11 +
Prisma 7 (PostgreSQL + pgvector), `@repo/schemas` Zod 4 shared validation.
Ports: client 10021, server 10022 (pm2).

## NAMING

URLs kebab-case (`/sales-order`); tRPC namespaces camelCase (`salesOrder.list`);
permissions `resource@action` (never `resource_action`);
imports use `.js`; Prisma client from `../lib/prisma.js`; `update*Schema`
requires `currentId`.

## ERRORS

Log-then-rethrow, never silent: structured JSON stdout + `app_logs`
(`log@read`). Client translates Prisma errors (`lib/friendlyError.ts`),
reports to `/api/log/client`. Strict TS `exactOptionalPropertyTypes`;
no bare `!` without a safety comment.

## NEVER

Raw SQL (except read-only AI guard), magic strings, `any`, prod
`console.log`. No gray text/surfaces, no raw hex in JSX, no mint/module/chart
CTA, no gradient banners, no emoji icons, no cookie-cutter README.

## ALWAYS

i18n keys in both `en.json` + `id.json` via `intl.formatMessage`;
ULID ids (`generateUlid`); every mutation `hasPermission` + `logActivity`;
multi-writes in `prisma.$transaction` + state guard; lists via
`createListInputSchema`/pagination helpers; `RequirePermission` on private
modules; tRPC vanilla only; `data-ai-context` on page roots; motion presets
from `apps/client/src/lib/motion.ts`.

## DOMAIN

region → area → customer (+contacts) → outlet → SKU visits → sales orders,
plus visit logs, action programs, event proposals (4-tier: area → region →
finance → director), users/roles/permissions, activity log, notifications,
read-only reporting (xlsx+print), email CRM, knowledge base (pgvector RAG).
Approvals: draft → proposed → approved/rejected.

## BAN LIST

Slop vocab (keep 0 hits in PRODUCT/ARCHITECTURE/DESIGN/README): robust,
comprehensive, utilize, leverage, seamless, cutting-edge, delve, tapestry.
Divider/banner + `ponytail:` markers live in the T1 debt ledger — harvest,
do not blind-delete. Additive only: no route/procedure/page/permission/i18n
changes in docs tasks.

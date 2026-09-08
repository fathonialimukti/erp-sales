# Architecture

One-page map of the system for engineers (and AI agents). Product law lives in `PRODUCT.md` and `docs/design-system/DESIGN.md`.

## Topology

```
Browser / Tauri desktop
        │  http (cookie session, SameSite=Lax)
        ▼
Express 5 API (port 10022, pm2 single instance on VPS)
 ├── /trpc/v1        tRPC v11 — 30 routers, all app operations
 ├── /api/ai/*       16 AI endpoints (streaming chat, extract, form-fill, …)
 ├── /api/email/*    inbound webhook (Cloudflare Email Worker → shared secret) + auto-reply
 ├── /api/sales-order/:id/pdf   PDFKit streaming
 ├── /api/log/client client error reports → app_logs
 ├── /uploads/*      data-URL uploads, sandboxed CSP
 ├── /healthz /readyz           liveness / DB readiness
        ▼
PostgreSQL (+ pgvector)   Prisma 7 (pg driver adapter, pool 10)
```

Client: React 19 + Vite (port 10021) + Tailwind v4 + shadcn; tRPC vanilla client + TanStack Query + jotai; react-intl (en/id); Tauri 2 wrapper.

Monorepo: `apps/client`, `apps/server`, `packages/schemas` (shared Zod), `packages/eslint-config`, `packages/typescript-config`. Bun + Turborepo.

## Cross-cutting layers (apps/server/src)

| Layer | Files | Notes |
|---|---|---|
| Auth | `context.ts`, `lib/express-auth.ts`, `lib/token-blacklist.ts` | JWT (jti) in httpOnly cookie (Bearer fallback). tRPC: async context + `hasPermission` middleware (30s permission cache). Express routes: `withAuth({ permission, aiRateLimit })`. Revocation in `revoked_tokens` (DB), purged 30-min. |
| Authorization | `trpc.ts` | `resource@action` permission strings on every procedure; activity log on every mutation. |
| Rate limiting | `lib/rate-limiter.ts` | Login 5/min/IP (fixed window). AI: rolling-window global cap (`ai.globalRpm`, mirrors provider 10 req/min key quota) + per-user cap; **requests queue** (≤ `AI_QUEUE_MAX_WAIT_MS` 25s) instead of 429. Limits configurable in Settings → AI provider. |
| Logging | `lib/logger.ts`, `lib/app-log.ts` | Structured JSON to stdout (pm2 → file). Errors/warnings/security events also into `app_logs` → in-app System Logs (`log@read`). Retention 30d. |
| AI | `lib/ai-provider.ts`, `lib/rag.ts`, `lib/ai-db-tools.ts` | Settings-driven provider (openai-compatible); RAG = pgvector + Postgres FTS fused with RRF; read-only SQL guard for AI DB access. |
| Settings | `lib/settings-service.ts` | Dotted keys (`ai.model`), DB → env → default, 30s cache, secrets masked write-only. |
| Data integrity | routers | Multi-write flows wrapped in `prisma.$transaction` with conditional `updateMany` state guards; audit rows written in-transaction. Doc numbers: advisory lock inside the tx + unique constraint. |

## Domain model (Prisma, ULID ids)

Masters: region → area → customer(+contacts) → outlet; sku-category → sku; action-type/event-type/vendor; budget-type → budget-period → budget-line.

Transactions: sales-order (+items, approval workflow DRAFT→VALIDATING→PROPOSED→APPROVED/REJECTED with AI validation step), visit-log, action-program (4-tier approval: area → region → finance → director), event-proposal (same tiers), budget hard-block vs orders.

Platform: user/role/permission (role patterns expanded at seed), activity-log, notification, email-crm (conversation + concierge agent), knowledge-base (chunks + pgvector embeddings + `embeddingStatus`), app-settings/user-settings, app_logs, revoked_tokens.

## Client structure

- `routes.tsx` — every private module wrapped in `RequirePermission('resource@read')`; lazy routes with Suspense (`RouteLoader`); Dashboard lazy (recharts off first paint).
- Modules in `pages/<module>/` follow Index/Form/Detail recipes; `DataTable` + `FilterBar` + `EmptyState` + friendly Prisma error translation (`lib/friendlyError.ts`).
- State: jotai atoms (auth/permissions/UI), TanStack Query (staleTime 30s), TanStack Form on create/edit pages.
- i18n: `src/locales/{en,id}.json` — must stay in sync (`bun scripts/check-i18n.mjs`, enforced in CI).

## Conventions (enforced by habit, not tooling — see Known gaps)

- URLs kebab-case (`/sales-order`), tRPC namespaces camelCase (`salesOrder.list`), permissions `resource@action` (`skuCategory@read` — camelCase resources exist, keep nav + server in sync).
- Every mutation: `hasPermission` + `logActivity`; every multi-write: transaction + state guard.
- No bare `!` without a safety comment.

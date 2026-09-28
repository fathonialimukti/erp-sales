# Architecture

One-page map of the system for engineers (and AI agents). Product law lives in `PRODUCT.md` and `docs/design-system/DESIGN.md`.

## Topology

```
Browser / Tauri desktop
        │  http (cookie session, SameSite=Lax)
        ▼
Express 5 API (port 10022, pm2 single instance on VPS)
 ├── /trpc/v1        tRPC v11 — 32 routers (33 files in routers/; permission +
 │                   role nest under access-control, settings.ts exports 2),
 │                   all app operations
 ├── /api/ai/*       17 AI endpoints (streaming chat, extract, form-fill, …)
 ├── /api/email/*    inbound webhook (Cloudflare Email Worker → shared secret) + auto-reply
 ├── /api/sales-order/:id/pdf   PDFKit streaming
 ├── /api/log/client client error reports → app_logs
 ├── /uploads/*      data-URL uploads, sandboxed CSP
 ├── /healthz /readyz           liveness / DB readiness
        ▼
PostgreSQL (+ pgvector)   Prisma 7 (pg driver adapter, pool 10)
```

`apps/server/src/index.ts` mounts 24 `app.*` routes in total. `appRouter`
registers 32 sub-routers plus one bare `hello` procedure; those 32 routers
expose 114 mutations.

Client: React 19 + Vite (port 10021) + Tailwind v4 + shadcn; tRPC vanilla client + TanStack Query + jotai; react-intl (en/id); Tauri 2 wrapper.

Monorepo: `apps/client`, `apps/server`, `packages/schemas` (shared Zod), `packages/eslint-config`, `packages/typescript-config`. Bun + Turborepo.

## Cross-cutting layers (apps/server/src)

| Layer | Files | Notes |
|---|---|---|
| Auth | `context.ts`, `lib/express-auth.ts`, `lib/token-blacklist.ts` | JWT (jti) in httpOnly cookie (Bearer fallback). tRPC: async context + `hasPermission` middleware (30s permission cache). Express routes: `withAuth({ permission, aiRateLimit })`. Revocation in `revoked_tokens` (DB), purged 30-min. |
| Authorization | `trpc.ts` | `resource@action` permission strings on every procedure; activity log on every mutation. Measured: 108/114 mutations carry `hasPermission`, 113/114 are activity-logged, and the named exceptions are listed in `README.md` → *Authorization, audit, and CSRF*. |
| CSRF | `lib/csrf.ts`, `trpc.ts` | Signed + expiring double-submit token (HMAC keyed on `JWT_SECRET`, 1h TTL). `csrfOnMutation` hangs off `protectedProcedure`, covering 112/114 mutations; `login`/`demoLogin` are public by necessity. |

| Rate limiting | `lib/rate-limiter.ts` | Login 5/min/IP (fixed window). AI: single rolling-window global cap (`ai.globalRpm`, shared by all users — mirrors the API key's per-minute quota; **unset = unlimited**); **requests queue** (≤ `AI_QUEUE_MAX_WAIT_MS` 25s) instead of 429. Configurable in Settings → AI provider. |
| Logging | `lib/logger.ts`, `lib/app-log.ts` | Structured JSON to stdout (pm2 → file). Errors/warnings/security events also into `app_logs` → in-app System Logs (`log@read`). Retention 30d. |
| AI | `lib/ai-provider.ts`, `lib/rag.ts`, `lib/ai-db-tools.ts` | Settings-driven provider (openai-compatible, read from DB — no hardcoded key fallback); RAG = pgvector + Postgres FTS fused with RRF; read-only SQL guard for AI DB access with `ai@query` permission plus row (max 500) and byte (max 512 KiB) caps on results. |
| Settings | `lib/settings-service.ts` | Dotted keys (`ai.model`), DB → env → default, 30s cache, secrets masked write-only. |
| Data integrity | routers | Multi-write flows wrapped in `prisma.$transaction` with conditional `updateMany` state guards; audit rows written in-transaction. Doc numbers: advisory lock inside the tx + unique constraint. |

## Domain model (Prisma, ULID ids)

Masters: region → area → customer(+contacts) → outlet; sku-category → sku; action-type/event-type/vendor; budget-type → budget-period → budget-line.

Transactions: sales-order (+items, approval workflow DRAFT→VALIDATING→PROPOSED→APPROVED/REJECTED with AI validation step), visit-log, action-program (4-tier approval: area → region → finance → director), event-proposal (same tiers), budget hard-block vs orders.

Platform: user/role/permission (role patterns expanded at seed), activity-log, notification, email-crm (conversation + concierge agent), knowledge-base (chunks + pgvector embeddings + `embeddingStatus`), app-settings/user-settings, app_logs, revoked_tokens.

## Client structure

- `routes.tsx` — every private module wrapped in `RequirePermission('resource@read')`; lazy routes with Suspense (`RouteLoader`); Dashboard lazy (recharts off first paint).
- Modules in `pages/<module>/` follow Index/Form/Detail recipes; `DataTable` + `FilterBar` + `EmptyState` + friendly Prisma error translation (`lib/friendlyError.ts`).
- State: jotai atoms (auth/permissions/UI), TanStack Query (client default `staleTime` 30s, `gcTime` 10m), TanStack Form on create/edit pages.
- i18n: `src/locales/{en,id}.json` — 2131 keys in each file, key sets in sync, pruned to the ids the code actually references. `bun scripts/check-i18n.mjs` fails on hard drift and warns on the 11 `id.json` values still awaiting Indonesian; `bun scripts/sync-i18n.mjs --check` scans 266 source files / 2876 message call sites / 1929 unique ids (64 non-literal ids skipped) and fails if code references a missing id. Both run in the `i18n` CI job.

## Conventions (enforced by habit, not tooling)

- URLs kebab-case (`/sales-order`), tRPC namespaces camelCase (`salesOrder.list`), permissions `resource@action` (`skuCategory@read` — camelCase resources exist, keep nav + server in sync).
- Every mutation: `hasPermission` + `logActivity`; every multi-write: transaction + state guard. The four measured exceptions are named in `README.md` and in `CHANGELOG.md` → *Known gaps*.
- `exactOptionalPropertyTypes` is claimed in `CONTEXT.md` but enabled in no tsconfig — a real open gap, tracked in `CHANGELOG.md`.
- No bare `!` without a safety comment.


# Production-Readiness Plan — erp-sales

Status: **executed 2026-09-04** (Phases 0–7; a few items consciously deferred, listed at the end).

Constraints honored: single-instance API; no changes to the existing VPS/devcontainer/pm2 production topology; observability = structured file logs (pm2-captured stdout) + in-app System Logs viewer; AI provider key hard limit 10 req/min.

---

## Phase 0 — Hygiene & quick wins ✅

- Removed junk: root `.tmp-region-eval.json`, empty `scripts/strip-ai-context.mjs`
- Removed dead deps: server `install@0.13.0`; `@faker-js/faker` → devDeps; client `zustand`, `@trpc/tanstack-react-query`, `r3f-managed-glb`, `@tanstack/react-devtools`, `@tanstack/react-form-devtools`, `@types/three`
- `CORS_ORIGIN` now supports multiple comma-separated origins (`apps/server/src/index.ts`)
- `DB_POOL_MAX` default 1 → 10; gzip `compression` enabled; `trust proxy` enabled
- Playwright e2e port fixed (1420 → 10021)
- README rewritten; `SECURITY.md` + `CHANGELOG.md` added
- Body limits kept as-is deliberately: photo uploads travel as base64 data URLs through JSON

## Phase 1 — Data integrity ✅

- **Prisma migrations adopted.** Baseline `20260904000000_init` generated from the schema and marked applied; `20260904090000_production_readiness` adds `app_logs` + `revoked_tokens`. New models since are migrated with `bun run db:deploy` (`prisma migrate deploy`) — `db push --force-reset` remains a dev-only script.
- **Document-number race fixed** (`routers/sales-order.ts`): number generation moved inside the create transaction behind `pg_advisory_xact_lock(hashtext(prefix))`; the `documentNumber @unique` constraint remains the backstop. Regression test: `tests/routers/sales-order-doc-number.test.ts` (8 concurrent creates).
- **Approval flows transactional + race-guarded** in `sales-order`, `action-program`, `event-proposal`: conditional `updateMany` state guards (TOCTOU), notification + audit log written inside the transaction. `sendApprovalNotification` accepts a transaction client.
- Reject now restricted to in-flight states (VALIDATING/PROPOSED) — previously any state could be rejected.

## Phase 2 — Security ✅

- **Shared Express auth middleware** (`lib/express-auth.ts`): `withAuth({ permission, aiRateLimit })` replaces the copy-pasted cookie/Bearer + jwt.verify blocks in all 12 API route files. Admin AI endpoints now require `ai-admin@access` at the middleware layer.
- **AI rate limiting reworked** (`lib/rate-limiter.ts`): rolling-window global limiter (`ai.globalRpm`, default 10/min — the provider key's hard quota) + per-user limiter (`ai.userRpm`). **Requests queue instead of being dropped** (max wait `AI_QUEUE_MAX_WAIT_MS`, 25s). Both limits editable in Settings → AI provider (DB → env → default).
- Public customer AI chat is rate-limited (global + synthetic `public:customer-chat` window).
- **Zod env validation before `app.listen`** (`lib/env-validate.ts`) — placeholder JWT secrets rejected in production; PORT/pool/rate-limit vars typed.
- **DB-backed token revocation** (`revoked_tokens` keyed by JWT `jti`, purged every 30 min) — logout survives restarts. In-memory fast path retained for legacy tokens.
- Login timing equalized (dummy bcrypt compare for unknown emails); login failures + rate-limit hits logged as security events.
- `Permissions-Policy` + CSP (`default-src 'none'; frame-ancestors 'none'`) on all API responses; uploads served with sandboxed CSP (`/uploads`).
- Permission middleware now cached (30s TTL, invalidated on role/permission/user mutations) — removes a 3-table join from every gated call.
- Fixed nav/server permission mismatch: `/sku-category` was gated `sku@read` in nav but requires `skuCategory@read` on the server.
- CSRF: documented accepted mitigation (SameSite=Lax cookies + strict CORS allow-list); the `csrfProtectedProcedure` infra remains available for opt-in use.

## Phase 3 — Observability ✅

- `app_logs` table + `lib/app-log.ts` (`logApp`) — errors/warnings/security events land in the DB; high-volume HTTP access logs stay on stdout (pm2 file capture).
- HTTP access-log middleware with request IDs; tRPC `onError` logging.
- `uncaughtException` / `unhandledRejection` handlers; `pm2-logrotate` recommended for log files.
- **In-app System Logs viewer**: `/system-logs` page (level/module/search/date filters), `systemLog` tRPC router, `log@read` permission (seeded), nav entry + icon.
- Client error reporting: `ErrorBoundary` + boundary → `POST /api/log/client` (IP rate-limited, zod-validated, 16KB cap) → same viewer.
- Stray `console.*` in runtime code replaced with the structured logger; retention pruning (30d, `APP_LOG_RETENTION_DAYS`).

## Phase 4 — CI/CD ✅

- `.github/workflows/ci.yml`: quality (lint/typecheck/build), server tests (pgvector/pg16 service, schema push + seed), Playwright e2e (bootstrap: `continue-on-error` until specs are isolated), locale-sync job.
- `scripts/check-i18n.mjs` — fails on en/id key drift; the 13 previously missing `id.json` keys fixed (now 3456 keys, in sync).
- `.github/dependabot.yml` (bun + actions, weekly).

## Phase 5 — Client hardening ✅

- `Suspense` + `RouteLoader` for lazy chunks; Dashboard moved to lazy (recharts+d3 off the first paint); mermaid dynamically imported (≈440KB off the eager graph; entry 884KB → 796KB).
- Query defaults: `staleTime: 30s`, dropped `refetchOnMount: 'always'` (kills the refetch storm).
- **Route-level permission guards** (`RequirePermission`) on every module route — deep links without permission redirect to the dashboard (server remains source of truth).
- i18n completed (3456 keys, en/id in sync; `roles.detail.*` + analytics nav key).
- Settings page gained AI rate-limit fields.

## Phase 6 — Testing ✅

- **187/187 server tests passing** (was 167/187 with 20 pre-existing failures):
  - `vitest` `isolate: true` (vi.mock leaked across files), cache reset in test setup
  - fixed permission drift in tests (permission/sku-category/access-control seeded the wrong permission strings)
  - fixed a real bug the email test exposed: inbound threading now strips `Re:/Fwd:` prefixes for subject lookup
  - settings env-fallback test now establishes its own precondition (shared dev DB has persisted rows)
- Concurrency regression test for document numbering.

## Phase 7 — Consistency & docs ✅

- This plan + `docs/ARCHITECTURE.md` + README/SECURITY/CHANGELOG.
- `exactOptionalPropertyTypes`: **deferred** — enabling it surfaces ~93 server errors (spread-of-optional patterns) plus client fallout; unsafe to force in one pass. Documented for incremental adoption.

## Known gaps / next steps

1. **ESLint is broken repo-wide**: typescript-eslint 8.65 does not support TypeScript 7.0 (`strict`/type-checked configs also unused). Fix by pinning TS 6 for lint or upgrading typescript-eslint — then wire `lint` into branch protection.
2. ~~Playwright e2e in CI is `continue-on-error`~~ — **resolved**: e2e is hermetic (dedicated Vite on :10025 → local API), uses a storageState setup project (one login per run, rate-limit safe), and is **20/20 green + hard-required in CI**.
3. `db:all` (`db push --force-reset`) is still referenced for dev convenience — make `migrate dev` the default flow for schema changes going forward.
4. Production cookie set without explicit session table: revocation is jti-based; consider short-lived access tokens + refresh if requirements evolve.
5. `exactOptionalPropertyTypes` adoption (see Phase 7).
6. The `.github/agents/` backend-engineer rule "never runs tests" contradicts the new CI gates — revisit agent instructions.

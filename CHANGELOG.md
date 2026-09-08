# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is SemVer.

## [Unreleased]

### Production-readiness pass (2026-09-04)

Full details: `docs/plans/production-readiness/PLAN.md`.

#### Added
- **Prisma migrations** (baseline + `app_logs`/`revoked_tokens`); `db:deploy` runs `migrate deploy`
- **In-app System Logs viewer** (`/system-logs`, `log@read` permission): server errors/warnings/security events + client-reported errors in one place; `app_logs` retention (30d)
- Shared Express auth middleware (`withAuth`) across all AI/PDF/email routes; admin AI endpoints now require `ai-admin@access` at the middleware
- Route-level permission guards on every client module route; nav/server permission mismatch fixed (`skuCategory@read`)
- GitHub Actions CI (lint/typecheck/build, Postgres-backed server tests, Playwright e2e bootstrap, locale sync), dependabot
- Client error reporting endpoint (`POST /api/log/client`) wired into the React ErrorBoundary
- `SECURITY.md`, `docs/ARCHITECTURE.md`, production-readiness plan doc
- Sales-order document-number concurrency test; `AI_QUEUE_MAX_WAIT_MS` setting

#### Changed
- **AI rate limiting**: rolling-window global cap (`ai.globalRpm`, mirrors the provider's hard 10 req/min key quota) + per-user cap (`ai.userRpm`) — **requests queue instead of being dropped** (25s wait budget); both editable in Settings → AI provider
- AI document-number generation is now serialized inside the create transaction (advisory lock) — duplicate `SO-YYYYMMDD-####` numbers under concurrency are impossible
- Sales-order / action-program / event-proposal approval flows are transactional with conditional state guards (no double-approve/reject races); reject restricted to in-flight states
- JWT revocation is DB-backed (`revoked_tokens` by `jti`) — logout survives restarts
- Environment validation is Zod-based and fail-fast before listen; placeholder JWT secrets rejected in production
- Security headers: CSP + Permissions-Policy on API responses; sandboxed CSP on `/uploads` (SVG XSS mitigation)
- Permission checks cached (30s TTL, invalidated on role/permission/user mutations)
- Client: Suspense route loading, Dashboard lazy (recharts off first paint), mermaid dynamic import (entry 884KB → 796KB), query `staleTime` 30s (no refetch storm)
- Email inbound threading strips `Re:/Fwd:` subject prefixes (bug fix exposed by tests)
- CORS_ORIGIN supports multiple comma-separated origins; DB pool default 10; gzip compression; trust-proxy enabled
- Playwright e2e port corrected (1420 → 10021), then made **hermetic** (dedicated Vite dev server on :10025 → local API; a reused dev server pointing at the production API gets its SameSite=Lax cookies blocked cross-site); storageState setup project (one login per run — rate-limit safe); dead routes fixed (`/invoice`, `/roles` → `/access-control`, `/system-logs`); login-page `<main>` race fixed — **20/20 e2e green and hard-required in CI**
- Server tests: vitest per-file isolation + cache resets + permission-drift and precondition fixes — **188/188 passing** (was 167/187)
- vitest browser-mode scaffolding removed from the client (broken since inception: no setup file, no tests); client test runner is Playwright only
- README rewritten; i18n en/id fully in sync (3456 keys)

#### Removed
- Junk artifacts and dead dependencies (see plan doc Phase 0)

### Known gaps
- ESLint broken repo-wide: typescript-eslint 8.65 does not support TS 7.0 (pre-existing)
- Playwright e2e in CI is `continue-on-error` until specs are isolated
- `exactOptionalPropertyTypes` documented in PRODUCT.md but not yet enforceable (~93 server errors)

## [Unreleased] — earlier notes folded above


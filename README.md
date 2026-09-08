# erp-sales

A B2B field-sales / CRM ERP: regions → areas → customers → outlets → SKU visits → sales orders, with approval workflows, budgeting, reporting, and AI woven into daily ops (order extraction, customer chat, email concierge, knowledge base).

Trust-first, boardroom-ready. English + Bahasa Indonesia.

## Stack

| Layer     | Tech |
|-----------|------|
| Client    | React 19 + Vite + Tailwind v4 + shadcn, tRPC v11 vanilla client, TanStack Query/Form, jotai, react-intl, Tauri desktop wrapper |
| Server    | Express 5 + tRPC v11, Prisma 7 (PostgreSQL, pgvector), Zod 4, AI SDK v7 |
| Shared    | `@repo/schemas` (Zod validation, shared client/server) |
| Tooling   | Bun + Turborepo, ESLint, Prettier, Vitest (server), Playwright (e2e) |

## Monorepo layout

```
apps/
  client/        React SPA (port 10021) + src-tauri/ desktop wrapper
  server/        Express + tRPC API (port 10022)
packages/
  schemas/       Zod schemas shared end-to-end
  eslint-config/ Shared ESLint configs
  typescript-config/ Shared tsconfigs
docs/            Design system, plans, security report
scripts/         backup-db.sh
```

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.3
- PostgreSQL (with the `vector` extension available for the knowledge base)
- pm2 (production only)

## Getting started

```sh
bun install

# Server env — copy and edit (DATABASE_URL, JWT_SECRET, ...)
cp apps/server/.env.example apps/server/.env

# Generate the Prisma client (required before dev/start)
bun run init

# Dev database: push schema + seed + ingest knowledge base
bun run --cwd apps/server db:all

# Run client + server
bun run dev
```

- Client: http://localhost:10021
- API: http://localhost:10022 (`/healthz`, `/readyz`)
- tRPC: http://localhost:10022/trpc/v1

## Scripts (root)

| Script | Purpose |
|--------|---------|
| `bun run dev` | Turbo dev — client + server |
| `bun run build` | Build all apps/packages |
| `bun run lint` | ESLint, zero warnings allowed |
| `bun run check-types` | tsc across the monorepo |
| `bun run test` | Server (Vitest) + client (Playwright) tests |
| `bun run tsc` | Direct tsc pass over server/client/schemas |
| `bun run init` | `prisma generate` |
| `bun run prod` | `prisma generate` + pm2 start `ecosystem.config.js` |
| `bun run prod:restart` / `prod:stop` / `prod:logs` | pm2 management |

## Server specifics

```sh
cd apps/server
bun run db:all      # dev only: db push --force-reset + seed + KB ingest
bun run ai:ingest   # re-ingest src/knowledge/*.md into the RAG index
bun run test        # Vitest — needs a reachable Postgres
```

Tests run sequentially against a real database (see `src/tests/helpers/seed.ts`).

## Environment

- `apps/server/.env.example` — API: DB, JWT, CORS, pool, AI provider + rate limits, SMTP, email webhook secret
- `apps/client/.env.example` — `VITE_TRPC_URL`

Never commit real `.env` files or provider keys. The upstream AI provider key has a hard 10 req/min quota — enforce with `AI_GLOBAL_RPM` (default 10).

## Conventions

- Route URLs are kebab-case (`/sales-order`); tRPC namespaces and permission strings are camelCase (`salesOrder.list`, `sales-order@read`)
- All user-visible strings go through react-intl in **both** `en.json` and `id.json`
- ULID string ids everywhere; every mutation is permission-gated (`resource@action`) and activity-logged
- Design law: `docs/design-system/DESIGN.md` — text is never gray, one primary action per region, dense scannable tables

## Documentation

- `docs/design-system/DESIGN.md` — UI law (tokens, motion, do/don't)
- `docs/security-testing-report.md` — security assessment + remediation status
- `docs/plans/` — implementation plans (budgeting, KB embedding, production readiness)

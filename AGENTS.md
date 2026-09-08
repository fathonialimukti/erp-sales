# ERP Sales — Agent Bottom Line

Applies to every agent (opencode: `.opencode/agents/` · Copilot: `.github/agents/`). Skills live in `.agents/skills/` (managed by the `skills` CLI, see `skills-lock.json`).

## Stack

- **Monorepo:** Bun workspaces + Turborepo (`apps/*`, `packages/*`)
- **`apps/server`:** tRPC v11 + Prisma 7 (PostgreSQL) + Express
- **`apps/client`:** React 19 + Vite + Tauri, Tailwind v4 + shadcn (Aurora UI), tRPC vanilla client, react-intl (en + id)
- **`packages/schemas`:** Zod domain schemas (`@repo/schemas`)

## Commands

```bash
bun run dev            # all apps via turbo
bun run check-types    # type safety across all packages
bun run lint
bunx vitest run        # unit + integration (scoped or full)
bunx playwright test   # e2e
```

## Hard rules

- Imports use `.js` extensions; Prisma client from `../lib/prisma.js`; transactions via `ctx.db`
- Procedures: `public` / `protected` / `transactionalProtected` + `hasPermission('resource@action')`
- Mutations write activity log (+ log-detail helpers); lists via `createListInputSchema` / pagination helpers
- IDs are ULID defaults; `update*Schema` requires `currentId`
- Client: tRPC vanilla only (`trpcClient.*` in `queryFn`), semantic Tailwind tokens (no raw hex, no gray text), functional components, all user-visible strings via `intl.formatMessage`
- UI craft: `docs/design-system/DESIGN.md` is design law — frontend-engineer owns visual quality

## Testing & git

- **Testing ownership:** the `quality-engineer` agent runs all tests; implementers write but never run them
- **Git is manual-only:** agents never `add`/`commit`/`push`/`merge`/open PRs — recommend only

## Reference docs

- Product: `PRODUCT.md` · Architecture: `docs/ARCHITECTURE.md`
- Design system: `docs/design-system/DESIGN.md` · Feature plans: `docs/plans/`

# ERP Sales — Agent Bottom Line

Applies to every agent (opencode: `.opencode/agents/` · Copilot: `.github/copilot-instructions.md`). Skills live in `.agents/skills/` (managed by the `skills` CLI, see `skills-lock.json`).

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

- Imports use `.js` extensions; Prisma client from `../lib/prisma.js`; multi-write handlers open `prisma.$transaction(async (tx) => …)` and thread `tx` into every write and helper
- Procedures: `public` / `protected` + `hasPermission('resource@action')`
- Mutations write activity log (+ log-detail helpers); lists via `createListInputSchema` / pagination helpers
- IDs are ULID defaults; `update*Schema` requires `currentId`
- Client: tRPC vanilla only (`trpcClient.*` in `queryFn`), semantic Tailwind tokens (no raw hex, no gray text), functional components, all user-visible strings via `intl.formatMessage`
- UI craft: `docs/design-system/DESIGN.md` is design law — frontend-engineer owns visual quality

## Testing & git

- **Testing ownership:** the `quality-engineer` agent runs all tests; implementers write but never run them
- **Git:** the `orchestrator` agent may `add` and `commit` when asked. **Pushing requires its own explicit order, every time** — a request to commit is never a request to push. `merge` and PR creation stay manual-only for every agent, always.

## Reference docs

- Product: `PRODUCT.md` · Architecture: `docs/ARCHITECTURE.md`
- Design system: `docs/design-system/DESIGN.md` · Feature plans: `docs/plans/`

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

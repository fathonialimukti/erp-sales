# Contributing

## Getting started

```sh
bun install
cp apps/server/.env.example apps/server/.env
bun run init
bun run --cwd apps/server db:all
bun run dev
```

- Client: http://localhost:10021
- API: http://localhost:10022 (`/healthz`, `/readyz`)
- tRPC: http://localhost:10022/trpc/v1

## Adding a new domain resource

1. **Schema** — `packages/schemas/src/<domain>.ts` → export from `index.ts`
2. **Router** — `apps/server/src/routers/<domain>.ts` → register in `router.ts`
3. **Pages** — `apps/client/src/pages/<Domain>{Index,Detail,Form}Page.tsx`
4. **i18n** — keys in `apps/client/src/locales/en.json` + `id.json`
5. **Routes** — add entries to `apps/client/src/routes.tsx`
6. **Tests** — `apps/server/src/tests/<domain>.test.ts`

## Conventions

- Route URLs are kebab-case (`/sales-order`); tRPC namespaces and permission strings are camelCase (`salesOrder.list`, `sales-order@read`)
- All user-visible strings go through react-intl in **both** `en.json` and `id.json`
- ULID string ids everywhere
- Design law: `docs/design-system/DESIGN.md`

Every mutation is *nearly* permission-gated and activity-logged — 108/114 and
113/114 respectively. The named exceptions live in `README.md` under
*Authorization, audit, and CSRF*; check there before assuming a new mutation
should copy an existing one's gate.


## Testing

- **Type safety:** `bun run check-types`
- **Lint:** `bun run lint`
- **Server tests:** `bun run --cwd apps/server test` (needs a reachable Postgres)
- **Client unit tests:** `bun run --cwd apps/client test:unit` (Vitest + jsdom)
- **e2e:** `bun run --cwd apps/client test` (Playwright)
- **i18n gates:** `bun scripts/check-i18n.mjs` and `bun scripts/sync-i18n.mjs --check`
- **Dependencies:** `bun audit --audit-level=low`

All seven of these also run in `.github/workflows/ci.yml`.

## Releases

The repository has **0 git tags**. `apps/client` and `apps/server` are both
pinned at `0.1.0`; the `packages/*` workspaces are at `0.0.0`. There is no
released version yet, and every change so far is recorded under
`## [Unreleased]` in `CHANGELOG.md` with no version number or date attached.

The intended process, once a release is actually cut:

1. Land the work on the default branch with `CHANGELOG.md` updated under
   `## [Unreleased]`.
2. Decide the version by SemVer against the app packages (both move together —
   they are deployed as a unit behind the same API).
3. Bump `version` in `apps/client/package.json` and `apps/server/package.json`.
4. Rename the `## [Unreleased]` heading to `## [x.y.z] - YYYY-MM-DD`.
5. Tag: `git tag -a vX.Y.Z -m "X.Y.Z"` and push the tag.

**Tags and releases are a human action.** Agents never run `add`, `commit`,
`push`, `merge`, or `tag`; they recommend only. The version bump and the tag
above are described so the human owner has the steps written down — not as
agent instructions.

## Git

- Never commit real `.env` files or provider keys
- Commits are manual — agents never `add`/`commit`/`push`/`merge`/`tag`


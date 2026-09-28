# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is SemVer.

## Release state

There is **no released version yet**: the repository has **0 git tags**, and
`apps/client` and `apps/server` are both pinned at `0.1.0` (the `packages/*`
workspaces at `0.0.0`). Everything below therefore lives under `## [Unreleased]`
with no version number or release date attached — the first tagged release
belongs to the human owner. See `CONTRIBUTING.md` → *Releases*.

## [Unreleased]

### i18n gate honesty pass

Every number in this entry was produced by running the command named beside it.

#### Fixed

- **The breadcrumb kicker rendered untranslated English on three pages.**
  `/dashboard`, `/reports` and `/ai-admin` are top-level `NAV_MENU` hrefs, so
  `findPageMeta` gives them `kicker: "Workspace"`, and `Topbar.tsx` built the id
  as `` `nav.${meta.kicker}` `` → **`nav.Workspace`** — an id in neither
  `en.json` nor `id.json`, so react-intl fell back to the English
  `defaultMessage`. `nav.Workspace` now exists in both catalogs
  (`"Workspace"` / `"Ruang Kerja"`, matching the repo's own rendering of
  *workspace* in `login.brand_subtitle`).
- **The gate could not have caught it, and said it had checked everything.**
  `sync-i18n.mjs` carried a source comment asserting that no message id is ever
  built inside a template literal. That was false in two places, and the
  comment is deleted. The scanner now resolves template-literal ids by
  expanding their holes against the literal unions the source declares
  (`DIMENSIONS = [...] as const`, `useState<"a" | "b">`, `ARR.map((x) => …)`,
  `type K = "a" | "b"`), which covers
  `` `report.dimension.${dimension}` `` and `` `report.dimension.${d}` `` —
  **5 previously invisible ids are now checked**. Unique ids verified rose
  from 1929 to **1935**.
- **`sync-i18n.mjs --check` reported OK on a genuinely missing id.** It only
  failed on drift it could *inject*, so an id referenced in code, absent from a
  catalog, and carrying no `defaultMessage` (exactly the `nav.Workspace` shape)
  passed. It now reports the catalog an id is absent from and fails. Verified
  by mutation: deleting `nav.Workspace` from `id.json` turns the gate red
  (`referenced in code but absent from id.json (1)`).
- **`Topbar.tsx` composed the kicker id in a template the scanner could not
  read.** Both ternary branches are now literals, which is also strictly more
  correct — the only non-`nav.`-prefixed kicker is the `"Workspace"` segment
  the component owns, so a template could only ever invent `nav.<garbage>`.
  `data-breadcrumb-kicker` was added so the rendered kicker is addressable.
- **A real claim in `docs/security-testing-report.md` §9.3 was wrong.** It read
  "the CORS allow-list stops the response from being read, not the write from
  happening" — the stated justification for the CSRF programme. Retested: the
  `cors` origin callback calls `next(err)` before any handler, so a disallowed
  cross-origin request never reaches one
  (`POST /api/ai/query -H "Origin: https://evil.aetherglo.com"` → `http=500`,
  `Error: Not allowed by CORS`, stack inside `cors/lib/index.js:219`; the same
  request with the allowed origin, or with no `Origin` at all, → `http=401`,
  i.e. the handler *was* reached). The sibling-subdomain attack is blocked by
  CORS, not by CSRF. The section now says so, and records the residual risk
  CORS genuinely does not cover: it binds nothing outside a browser, and it is
  not a control at all for allow-listed same-site subdomains.
- **The untranslated figure was a heuristic, not a measurement.** `check-i18n.mjs`
  reported "11 awaiting Indonesian" by treating any single-word value as
  legitimately identical. **209** of 2133 `id.json` values are byte-identical to
  `en.json`; 198 were hidden behind that one rule. `Error` (12×) and `Summary`
  (12×) are single words, and this same file translates them to `Kesalahan` and
  `Ringkasan` everywhere else. The gate now reports the true total split into
  **120 legitimately identical** (curated `LEGIT_IDENTICAL`: loanwords this
  product's own translations keep, brand names, format expressions) and **89
  probably untranslated**, grouped by value with the offending ids.
- **The breadcrumb *title* fallback rendered untranslated English — the same
  defect, one line below the kicker, and it survived the kicker fix.** When
  `findPageMeta` matched nothing it returned `title: "Page"`: a bare English
  word sitting where a message id belongs, so react-intl had no id to look up.
  `routes.tsx` ends the authenticated tree with `path: '*'` → `NotFoundPage`,
  so `/anything-unknown` put the literal string "Page" in the Bahasa breadcrumb.
  The fallback is now the real id `nav.page_fallback` (`"Page"` / `"Halaman"`).
  This is the one string in `findPageMeta` no gate can check, because
  `id: meta.title` is a variable — see *Changed* below.

#### Changed

- **Unverified ids are now counted, not implied away.** Both scripts list every
  call site whose id no rule can read, with `file:line`, and neither claims
  "every referenced id present" while any exist. **61** today, down from 64 —
  the 3 resolved are the two `report.dimension.*` templates and the Topbar
  kicker. Ids built in a template whose literal prefix no catalog key uses are
  a hard failure; prefixes that do exist are reported, not assumed.
- **Placeholder drift became a ratchet rather than a permanent warning.**
  Warnings that never fail are log lines nobody reads, but failing on the
  existing backlog would be a red build over correct code. Both figures are
  pinned (`UNTRANSLATED_BASELINE = 89`, `UNVERIFIED_BASELINE = 61`) and fail
  only on an increase, so new untranslated copy is caught and a loanword never
  can redden the build.
- **`findPageMeta`'s 41 breadcrumb values (9 kicker ids, 32 title ids) stay
  gate-unverifiable, and the count says so.** `Topbar.tsx:115 meta.title` is one
  unverified call site that can expand to 32 ids; the kicker side is statically
  resolved by the ternary, not by walking `findPageMeta`. Enumerating them by
  hand finds all 41 present in both catalogs today, but that is a human
  guarantee, not a gate guarantee — so the figure is reported as unverified
  rather than claimed as checked.
- **An empty literal is no longer read as a `defaultMessage`.**
  `kicker.replace("nav.", "")` parsed as a default of `""`, which would have
  been *injected* as an empty string for any id missing from `en.json`. Empty
  literals are now skipped, so such an id reports as unresolvable instead.

#### Added

- **`locale.spec.ts` guards the kicker on `/reports`.** It asserts the rendered
  `data-breadcrumb-kicker` equals the `id.json` value and not the English one;
  the `msg()` helper throws on a missing key, so deleting `nav.Workspace` fails
  the spec as well as the gate.

#### Verification

| Command | Result |
|---|---|
| `bun scripts/check-i18n.mjs` | exit 0 — 2133 keys in sync, 61 dynamic unverified, 209 byte-identical (89 probably untranslated) |
| `bun scripts/sync-i18n.mjs --check` | exit 0 — 266 files, 2876 call sites, 1935 unique ids, 0 injected |
| `bun scripts/sync-i18n.mjs --check` with `nav.Workspace` deleted from `id.json` | exit **1** — the gate now catches the original bug |

> The three `11`-figure lines further down this file record what the gate said
> when that entry was written. They are superseded by the numbers above.

### Ops + tooling consistency pass

Every number in this entry was produced by running the command named beside it.

#### Fixed

- **pm2 supervised a wrapper, not the API.** `ecosystem.config.js` ran
  `bun run dev`, which is `bun --watch src/index.ts` — so pm2's child was the
  `bun run` shim and the real server was its **grandchild**. Reproduced live
  before the fix: `pm2 stop erp-server` reparented `bun --watch src/index.ts`
  to `PPID 1` and the process survived the stop, i.e. a "stopped" server kept
  serving traffic and a "restarted" one could leave the old orphan holding the
  port on stale code. The app now runs `script: 'bun'`, `args: 'src/index.ts'`,
  so pm2's child **is** the server. Env is unaffected — `lib/prisma.ts` does
  `import "dotenv/config"`, which resolves `apps/server/.env` against the same
  `cwd`. Watching stays a dev-only affordance: `bun run dev` at the repo root
  still runs turbo dev unchanged, and the production path no longer restarts on
  its own log writes.
- **e2e column read raced the first paint.** `columnValues` used
  `locator.count()`, which does **not** auto-wait, and `DataTable` renders its
  `<table>` only when `!isLoading && data.length > 0` (the loading skeleton
  table has no `<thead>`). On a cold run the count was `0` and the failure read
  as a wrong assertion — `no column header "Name" in the table` — while the
  post-failure a11y snapshot showed the table present. The helper now waits
  with `await expect(headers.first()).toBeVisible()` before counting. This is
  the only non-auto-waiting primitive in the helper, so it covers all **9**
  invocations: `grep -rn 'columnValues(' apps/client/src/tests/e2e/` finds **4**
  direct call sites, and the `sales-order.spec.ts` one is a `cell()` wrapper
  invoked **6** times. `retries` stays at **0** — the suite needed a wait, not a
  retry.
- **`DESIGN.md` documented a file that no longer exists.** Lines 84 and 529
  both pointed at `apps/client/src/styles/colors.ts`, deleted in this sweep.
  Both now name the real source of truth, `apps/client/src/index.css`.
- **`CONTEXT.md` claimed a compiler flag the repo does not set.** It read
  "Strict TypeScript with `exactOptionalPropertyTypes`";
  `grep -rn exactOptionalPropertyTypes --include=tsconfig*.json` matches only
  inside `node_modules`, and `packages/typescript-config/base.json` sets
  `strict` and `noUncheckedIndexedAccess`. The line now states what is enabled
  and points at the known gap below.
- **`WARNING_TEXT_CLASS` un-exported.** `apps/client/src/lib/status-color.ts`
  exported it for exactly one importer — its own test — so it is now a
  module-local const. The test asserts against a local literal instead, which
  is the version of that pin that can actually fail.

#### Removed

- **Dangling skill references reconciled after the tooling prune.** The prune
  left **133** uncommitted deletions (`git status --porcelain | grep -c '^ D'`),
  of which **126** are tooling: **121** files across **25** skill directories
  under `.agents/skills/`, **4** of the 4 files in `.github/agents/`, and
  `.opencode/agents/full-stack-engineer.md`. The remaining **7** deletions are
  app/config and unrelated to tooling (`styles/colors.ts`, `styles/spacing.ts`,
  `styles/typography.ts`, `tests/e2e/helpers/auth.ts`, `routers/landing.ts`,
  `packages/eslint-config/next.js`, `packages/typescript-config/nextjs.json`).
  Skill families removed, by file count: `impeccable` 56,
  `prisma-database-setup` 9, `prisma-upgrade-v7` 8, `prisma-compute` 7,
  `writing-skills` 7, `prisma-mongodb-upgrade` 6, `prisma-postgres` 5,
  `prisma-postgres-setup` 5, `frontend-design` 2, and 1 each for
  `adapter-aws-lambda`, `adapter-fastify`, `adapter-fetch`,
  `adapter-standalone`, `modern-css`, `nextjs-app-router`,
  `nextjs-pages-router`, `openapi`, `ponytail-audit`, `ponytail-debt`,
  `ponytail-gain`, `ponytail-help`,
  `prisma-driver-adapter-implementation`, `react-query-classic-migration`,
  `react-query-setup`, `service-oriented-architecture`.
  No skill was deleted by this pass — this only reconciles the fallout.
  Surviving agent configs that still pointed at removed skills were fixed:
  `quality-engineer.md` dropped `ponytail-audit` / `ponytail-debt`
  (2 places), `frontend-engineer.md` dropped `frontend-design` / `modern-css`,
  and `AGENTS.md` now names `.github/copilot-instructions.md` instead of the
  deleted `.github/agents/`.

#### Action required (owner)

- **`skills-lock.json` is stale and was not hand-edited.** It declares **62**
  skills; **36** exist on disk. **26** declared entries have no directory on
  disk (**0** skills on disk are undeclared). The extra one beyond the 25
  families above is `css-first`, which was never committed at all
  (`git ls-files | grep -c css-first` → `0`). The `skills` CLI is **not
  installed** in this environment — not on `PATH`, not in
  `/root/.bun/install/global/node_modules`, not in `node_modules/.bin`, and
  declared in no `package.json`, workflow, or devcontainer — so the lockfile
  could not be regenerated here, and it was deliberately left untouched rather
  than hand-edited: each entry carries a `computedHash` and an upstream
  `skillPath` that only the CLI can recompute. **No invocation is recorded
  anywhere in this repo** — `git log --all -S'skills' -- package.json
  .devcontainer/devcontainer.json` surfaces no `skills add|install|sync|lock`
  call, and commit `01a40ea` (which only moved `.github/skills` →
  `.agents/skills`) never names a CLI. So the regeneration subcommand cannot be
  quoted from evidence here and is deliberately not guessed: the owner should
  run the `skills` CLI's own sync/lock command for their installation against
  `.agents/skills/`, then confirm with the same reconciliation used here:
  `bun -e "const l=require('./skills-lock.json');const d=new Set(require('fs').readdirSync('.agents/skills'));console.log(Object.keys(l.skills).filter(n=>!d.has(n)))"`
  must print `[]`. (Run today it prints the 26 stale names listed above.)
- `docs/design-system/DESIGN.md:585` still points at
  `.github/agents/frontend-engineer.agent.md`, and `docs/plans/**` narrate the
  deleted `.github/agents/*.agent.md` files. Both are outside this pass's file
  scope; DESIGN.md was edited only at the two `styles/colors.ts` references.

#### Verification

| Command | Result |
|---|---|
| `pm2 stop erp-server` (after fix) | `status=stopped`, `pid=0`; `/healthz` `http_code=000`, curl exit 7; held 15s polling every 3s and stayed `000`; 0 server processes, 0 orphans on `PPID 1` |
| `pm2 restart erp-server` | new pid 1137168 (was 1112854), `PPID 130` = the pm2 daemon, so pm2 owns it directly; `/healthz` and `/readyz` 200, `uptime` 6s; exactly 1 server process, 0 `bun --watch` processes |
| `bun run check-types` | `3 successful, 3 total` |
| `bun run lint` | exit 0, `57 problems (0 errors, 57 warnings)` |
| `cd apps/client && bunx vitest run` | `25 passed (25)` files, `275 passed (275)` |
| `cd apps/server && bunx vitest run` | **flaky, not green** — see Known gaps. Over 7 full runs: 5 clean (`54 passed (54)`, `453 passed (453)`), 2 failing on `backup.test.ts` / `aiChatSqlCaps.test.ts` / `event-proposal.test.ts` with `P2003` FK violations (`backups_created_by_id_fkey`) |
| `rm -rf apps/client/node_modules/.vite && bunx playwright test` (cold run A) | `32 passed`, `1 skipped` (the intentional `rejects invalid credentials` skip), `0 failed`, exit 0 |
| same, cold run B (>60s later) | `32 passed`, `1 skipped`, `0 failed`, exit 0; `retries: 0` unchanged |

Two environment notes for whoever re-runs the e2e suite, both **not** code
defects and both a consequence of running against the live dev stack:

- **The login limiter is 5 attempts per IP per minute** (`routers/auth.ts`,
  in-memory fixed window) and one suite run already spends **4**
  (2 setup projects + 2 in `auth.spec`). A second run started inside the same
  window gets `429` on its later logins, `auth-setup-restricted` fails, and its
  dependents report `did not run`. **Leave >60s between full runs** — the
  verifier, not a retry, is what is missing.
- Playwright starts its own Vite on 10025 with `--strictPort` and
  `reuseExistingServer: false`, so a stale server on 10025 aborts the run with
  `already used`. Check `curl 127.0.0.1:10025` is `000` first.

### Security + accuracy sweep

Every number in this entry was produced by running the command named beside it.

#### Security

- **`ai@query` permission gate on the AI SQL endpoint.** `POST /api/ai/query`
  (the read-only SQL tool) was authenticated but not permission-gated — any
  logged-in user could run SQL against the database. It now sits behind a new
  `ai@query` permission, enforced at the middleware in
  `apps/server/src/routes/ai.ts` and seeded in `prisma/seed.ts`.
- **Row and byte caps on AI query results.** `lib/ai-db-tools.ts` now clamps
  every result set server-side: `MAX_QUERY_ROWS = 500`, `DEFAULT_QUERY_ROWS = 100`
  (appended as a `LIMIT` via `applyRowCap`), and `MAX_RESULT_BYTES = 512 KiB`
  enforced by dropping trailing rows off the encoded envelope. `LIMIT` inside
  user SQL is advisory only; `applyRowCap` is the actual cap.
- **CSRF protection is now genuinely enforced** (previously the machinery
  existed but nothing checked it, and the cookie was `httpOnly`, which made a
  naive double-submit unexecutable). `lib/csrf.ts` mints a **signed**,
  **expiring** token — `<expiresAtMs>.<nonce>.<hmac-sha256>`, HMAC keyed on
  `JWT_SECRET`, 1h TTL, timing-safe compare, fail-closed on malformed input —
  and `csrfOnMutation` is attached to `protectedProcedure` in `trpc.ts`, so one
  line covers every state-changing call in all 32 routers. The client echoes
  the token in `x-csrf-token` on mutations only.
- **Dependency audit clean.** `bun audit --audit-level=low` reports
  `No vulnerabilities found (checked 1198 packages)`. Two transitive pins were
  added to the root `overrides` to get there: `deepmerge-ts` `7.1.5 → 8.0.2`
  and `mysql2` `3.15.3 → 3.24.4` (both were pulled in by Prisma).
  The pre-sweep CVE count is not reproducible from the current tree, so it is
  not restated here.
- `scripts/backup-db.sh` plus a `bun audit` job already guarded this; the
  `audit` CI job now fails the build on any advisory.

#### Fixed

- **AI SQL results could open an empty dropdown for 30 seconds.**
  `SelectSearch` caches its result under a query key, but a `sourceData`
  closing over a *sibling* query's data (`async () => outletList`) captures
  whatever that data was when the fetch ran — and the query key cannot see
  inside the closure. The first run therefore cached the pre-fetch empty list
  and served it for the full `staleTime` (30s). Fixed with an `enabled: !isLoading`
  gate so the fetch waits for the parent list to arrive.
- **Sales-order delete accepted any status.** Deleting a `VALIDATING`,
  `PROPOSED` or `APPROVED` order was still accepted by the API even though the
  UI hid the action. Now guarded to `DRAFT`/`REJECTED`, with a conditional
  `deleteMany` so a proposal landing between read and write is rejected rather
  than silently deleted.
- **Dead `salesOrder.validate` UI entry point removed.** The rule-based
  `DRAFT → PROPOSED` mutation and its dialog existed with no trigger. The
  button is now rendered on a `DRAFT` when the caller holds
  `sales-order@validate`, and it takes the primary slot per `DESIGN.md`;
  `Propose` (the non-deterministic AI path) steps down beside it.

#### Changed

- **ESLint is green, with a stated budget.** `bun run lint` exits 0 across
  3 packages: server 57 warnings, client 124 warnings, schemas 0 — **181
  warnings, 0 errors**. The budgets are `--max-warnings 100` (server),
  `200` (client), `0` (schemas). Note that the shared config registers
  `eslint-plugin-only-warn`, which demotes every rule to a warning, so
  `--max-warnings` is the only gate that can fail a lint run; there is no
  separate error count to enforce.
- **i18n gate hardened and wired into CI.** `check-i18n.mjs` now separates
  *hard* drift (fails the build) from *placeholder* drift (warns): it reports
  **2131 keys, en/id in sync, every referenced id present, 11 awaiting
  Indonesian** — i.e. 11 `id.json` values are still byte-identical English.
  A second gate, `bun scripts/sync-i18n.mjs --check`, scans all **266** source
  files (**2876** message call sites, **1929** unique ids, 64 non-literal ids
  skipped) and fails if code references an id the locale files do not contain.
  Both run in the `i18n` CI job. The locale files are pruned to the ids the code
  actually references, so the key count tracks the pages in the app rather than
  growing monotonically.
- **Client Vitest suite wired into CI.** 25 test files, 275 tests, all passing.
  Root cause of the long-standing client unit-test breakage: jsdom is pinned to
  `~30.0.1`. From jsdom 30.1.0 wrappers are branded with a private `#impl`
  field instead of a public symbol, a Proxy's `get`/`has` traps cannot see
  private fields, so the `WindowProxy` fails jsdom's own `EventTarget` brand
  check and every worker dies in environment setup. Widening the range back
  will re-break the suite; the reason is recorded in `vitest.config.ts`.
- **e2e replaced from route-pings with behavioral tests.** 8 spec files now
  assert real behavior — creating and editing a customer, walking a draft order
  through the rule-based approval ladder, rejecting a bad password, switching
  and persisting locale, toggling and persisting theme, and no horizontal
  scroll at 390px. `bunx playwright test` collects **32 tests: 31 passed, 1
  skipped** (the skipped one is `auth.spec.ts` → "rejects invalid credentials
  without leaving the login page"). The suite is hard-required in CI; there is
  no `continue-on-error` anywhere in `ci.yml`.
- **Approval + RBAC denial coverage.** `action-program-approval.test.ts` walks
  the 4-tier ladder (area → region → finance → director), proves each rung is
  single-shot via the conditional `updateMany` guard, and denies every rung to
  a user with no permissions / only an unrelated permission / a self-promoting
  Area Manager. `rbac-forbidden.test.ts` proves sales-order, budget and
  event-proposal denials write nothing and leave the row intact.
- **Mobile responsive fixes and 44px targets.** The 390px horizontal-overflow
  regression (the sidebar's margin offset ate 284 of 390px) is fixed and
  guarded by `mobile.spec.ts`; `DataTable`, `Topbar` and `PageHeader` hit
  targets reach 44px via pseudo-elements so control size is unchanged.
- **i18n completion work** across en/id: the locale files were pruned to the
  ids the code actually references and every one of them is present in both
  files, with 11 values still awaiting Indonesian.

#### Removed

- **4 unused client dependencies:** `@dnd-kit/core`, `@dnd-kit/utilities`,
  `@gravity-ui/icons`, `@tanstack/react-form-devtools`. The client now
  declares 45 dependencies.
- **8 dependencies hoisted out of the root `package.json`** into the apps that
  actually use them (the root manifest now declares no `dependencies`).
- The dead root `tsc` script, which duplicated `check-types`.

#### Verification

| Command | Result |
|---|---|
| `bun run lint` | exit 0 — 181 warnings, 0 errors (3 packages) |
| `bun run check-types` | exit 0 — 3 tasks successful |
| `bun run build` | exit 0 — 2 tasks successful |
| `bun audit --audit-level=low` | exit 0 — 0 vulnerabilities, 1198 packages |
| `bun scripts/check-i18n.mjs` | exit 0 — 2131 keys in sync, 11 awaiting Indonesian |
| `bun scripts/sync-i18n.mjs --check` | exit 0 — 266 files, 2876 call sites, 0 injected |
| `cd apps/server && bunx vitest run` | exit 0 — 51 files, 427 tests passed |
| `cd apps/client && bunx vitest run` | exit 0 — 25 files, 275 tests passed |
| `cd apps/client && bunx playwright test` | exit 0 — 32 collected, 31 passed, 1 skipped |

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
- Playwright e2e port corrected (1420 → 10021), then made **hermetic** (dedicated Vite dev server on :10025 → local API; a reused dev server pointing at the production API gets its SameSite=Lax cookies blocked cross-site); storageState setup project (one login per run — rate-limit safe); dead routes fixed (`/invoice`, `/roles` → `/access-control`, `/system-logs`); login-page `<main>` race fixed
- Server tests: vitest per-file isolation + cache resets + permission-drift and precondition fixes. **Now 427/427 passing** (was 167/187, then 188/188)
- README rewritten

#### Removed
- Junk artifacts and dead dependencies (see plan doc Phase 0)

### Known gaps

Two entries, and both are real:

- **`exactOptionalPropertyTypes` is documented but not enabled.** The flag
  appears in no `tsconfig` in the repo — `packages/typescript-config/base.json`
  sets `strict: true` and `noUncheckedIndexedAccess: true`, but not that one
  (the only match for `exactOptionalPropertyTypes` under any `tsconfig*.json`
  is inside `node_modules`). The *doc* half of this is closed: `CONTEXT.md:32`
  no longer claims the flag and states what is actually enabled, then points
  here. The *config* half is not — turning the flag on is a real code change,
  not a config flip, so it stays open.
- **`apps/server`'s Vitest suite is flaky against the shared dev database.**
  Measured over 7 full runs: 5 clean (`54 passed (54)`, `453 passed (453)`),
  2 failing on a rotating set of files (`backup.test.ts`,
  `aiChatSqlCaps.test.ts`, `event-proposal.test.ts`) with Prisma `P2003`
  foreign-key violations such as `backups_created_by_id_fkey`, and a skip count
  that moves run to run (13 / 22 / 0) because suites skip on live DB state.
  Cause: the router tests share one development database and their `afterEach`
  cleanup deletes rows other files still hold — e.g. `backup.test.ts:76` runs
  `prisma.user.delete(...)` while a `backups.createdById` reference is live.
  `backup.test.ts` is untouched by the current sweep, so this is pre-existing,
  not a regression. It needs per-run isolation (a transaction rollback, a
  per-worker schema, or a dedicated test database) — a real fix, and out of
  scope for a docs/ops pass. **Do not paper over it with retries.**

Everything previously listed under "Known gaps" has been removed because it was
no longer true. Specifically: ESLint is **not** broken repo-wide
(`bun run lint` exits 0); Playwright e2e in CI is **not** `continue-on-error`
(the string does not appear anywhere in `ci.yml`); and the client does have a
passing Vitest suite, not just Playwright.

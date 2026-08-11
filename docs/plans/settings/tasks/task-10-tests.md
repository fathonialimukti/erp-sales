# Task 10: Tests

**Files:**
- Create: `apps/server/src/tests/routers/settings.test.ts`
- Create: `apps/client/src/tests/settings.test.tsx` (if client test infra supports it — check existing client tests first)

**Interfaces:**
- Consumes: `settingsRouter`/`userSettingsRouter` (T3), `settings-service` (T2), seed helpers from `apps/server/src/tests/helpers/seed.ts`.

## Frozen contract

### Server tests (`settings.test.ts`)
Follow existing router test patterns (see `apps/server/src/tests/routers/region.test.ts` or `user.test.ts`). Use `createCaller`/test context helpers already in the repo.

Cover:
1. **Personal settings** — `userSettings.get` returns defaults when nothing set; `userSettings.update` persists; `userSettings.get` returns updated values; self-scope enforced (a user cannot read/write another user's settings — verify router forces `ctx.user.userId`).
2. **App settings read** — `settings.get` requires `settings@read` (FORBIDDEN without); returns masked secrets (`••••••` / `hasValue`), never plaintext.
3. **App settings write** — `settings.update` requires `settings@update`; persists non-secret values; secret write-only semantics (empty string keeps existing, non-empty overwrites).
4. **Env fallback** — with no DB rows, `getSettingValue` returns env values (set `process.env.AI_MODEL` etc. in test, assert fallback).
5. **Cache invalidation** — after `setAppSettings`, a subsequent `getAppSettings` reflects the new value (not stale cache).

### Client tests
- Only if the client test harness supports component tests (check `apps/client/src/tests/` for existing patterns). If not feasible, skip client tests and note it.

**Steps:**
- [ ] Write server settings tests
- [ ] Run `bunx vitest run src/tests/routers/settings.test.ts`
- [ ] Add client tests if harness supports
- [ ] Run full `bunx vitest run` (server) — confirm no regressions from T4 refactor

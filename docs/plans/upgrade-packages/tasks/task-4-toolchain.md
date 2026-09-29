### Task 4: Root Toolchain + Lockfile Reconciliation

**Files:**
- Modify: `package.json` (root), `turbo.json`, `tsconfig*.json` (root bases), `bun.lock` / lockfile (sole owner of lockfile regeneration)
- Never touch: `apps/*/package.json`, `packages/*/package.json` version ranges (those belong to Tasks 2–3; only resolve peer conflicts here in coordination with their reports)

**Interfaces:**
- Consumes: Task 2 + Task 3 `## Produces` reports (exact bumped versions, peer requirements)
- Produces: single coherent install (`bun install`), aligned toolchain (TypeScript, Turborepo, lint/build tooling), repo-wide `bun run check-types` clean

**Reads (in your own context):**
- Root `package.json`, `turbo.json`, Task 2 + Task 3 reports, `bun.lock` conflict sections

**Frozen contract:**
- No procedure/permission/i18n renames; `.js` import extensions preserved; Turbo pipeline semantics unchanged (only version-compatible config updates)

**Steps:**
- [ ] Step 1: Bump root/toolchain deps per Task 1 matrix (TypeScript, Turbo, ESLint/Prettier, Vitest/Playwright shared config)
- [ ] Step 2: Run `bun install` once as the sole lockfile writer; resolve peer conflicts by aligning ranges, preferring Task 2/3 choices, never downgrading silently
- [ ] Step 3: Run `bun run check-types` repo-wide; fix only cross-package peer/config breakage
- [ ] Step 4: Self-review diff (expect `bun.lock` + small configs only)

**Report back (mandatory):** End with `## Produces` — toolchain versions, lockfile regeneration notes, peer resolutions, check-types status.

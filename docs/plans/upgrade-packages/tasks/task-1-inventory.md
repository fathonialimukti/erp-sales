### Task 1: Inventory & Baseline (read-only)

**Files:**
- Modify: none (read-only audit; write results only to your report back, not to repo files)

**Interfaces:**
- Consumes: nothing
- Produces: version matrix (current vs latest for every workspace), breaking-change shortlist, baseline `bun run check-types` + `bun run lint` status

**Reads (in your own context):**
- `package.json` (root), `apps/server/package.json`, `apps/client/package.json`, `packages/schemas/package.json`, `bun.lock`, `turbo.json`

**Frozen contract:**
- No code changes in this task. Do not run `bun update`, do not edit any `package.json`, do not delete lockfile.

**Steps:**
- [ ] Step 1: List every workspace `package.json` dependency + devDependency with current pinned range and `latest` dist-tag (use `bun outdated`-style lookup or registry metadata; do not mutate files)
- [ ] Step 2: Flag majors with known breaking migrations relevant to this stack: tRPC v11, Prisma 7, React 19, Vite, Tauri, Tailwind v4, Zod, TypeScript, Turborepo
- [ ] Step 3: Record baseline `bun run check-types` and `bun run lint` pass/fail (read-only runs allowed; implementers never run tests per AGENTS.md — but baseline typecheck/lint observation is allowed for audit; do NOT run vitest/playwright)
- [ ] Step 4: Self-review the matrix for accuracy

**Report back (mandatory):** End with `## Produces` — full version table, list of breaking majors + migration notes links, baseline check-types/lint status.

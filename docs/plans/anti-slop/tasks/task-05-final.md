### Task 5: Final Review (whole-branch, after T1R+T2+T3+T4)

**Files:**
- Create: none (review only)
- Modify: none
- Test: own full verification package (you own testing)

**Interfaces:**
- Consumes: T1R ## Produces + T2 ## Produces + T3 ## Produces + T4 ## Produces verbatim (paste when dispatching)
- Produces: final lean/minor-only verdict + Commit/Push recommendation

**Reads (in your own context — no context is provided):**
- `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/design-system/DESIGN.md`
- `docs/plans/anti-slop/tasks/task-01R-scan.md`, `task-02-backend.md`, `task-03-frontend.md`, `task-04-prose-dna.md`
- Skills: `ponytail-review`, `verification-before-completion`

**Frozen contract:**
- Quality gate: ship when lean or minor-only + no high-severity slop (`deslop` high=0, `ai-slopcheck --fail-on warning` clean, `slop-scan` blended near 1.0)
- Reviewer must demand full report + one-sentence Commit/Push recommendation and no git writes
- Commands you may run: `bun run check-types`, `bun run lint`, `bunx vitest run`, `bunx playwright test`, `bun scripts/check-i18n.mjs`, scanners from T1R (read-only)

**Steps:**
- [ ] Step 1: `git status`, `git diff --stat`, `git log --oneline -10` review
- [ ] Step 2: Typecheck + lint + i18n parity + scanners (server vitest needs PG+JWT_SECRET, client from apps/client, Playwright browsers — record blocked vs green)
- [ ] Step 3: Cross-task regression (routes, permissions, i18n keys preserved; renames have seed/nav sync)
- [ ] Step 4: Final verdict

**Preservation (mandatory):** additive only. Flag any deletion/regression.

**Report back (mandatory):**
End with `## Produces` + Session Changes + full findings + one-sentence Commit/Push recommendation. No git writes.

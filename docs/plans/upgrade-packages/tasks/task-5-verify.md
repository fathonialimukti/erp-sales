### Task 5: Full Verification (quality-engineer)

**Files:**
- Modify: none (verification only; if you find failures, report them — do not implement fixes in this task)

**Interfaces:**
- Consumes: Task 2 + Task 3 + Task 4 `## Produces` reports
- Produces: verification verdict — `bun run check-types`, `bun run lint`, `bunx vitest run`, `bunx playwright test` (as applicable), ponytail-review over-engineering notes

**Reads (in your own context):**
- Task 2–4 reports, changed `package.json` files, `docs/plans/upgrade-packages/tasks/` briefs

**Frozen contract:**
- Testing ownership: you run all tests; implementers never run them. Report failures with file:line + repro, don't fix.

**Steps:**
- [ ] Step 1: Run `bun run check-types` and `bun run lint`
- [ ] Step 2: Run `bunx vitest run` (scoped or full) and `bunx playwright test` if e2e is green to attempt
- [ ] Step 3: Ponytail-review the upgrade diff for bloat/speculative abstraction (one line per finding)
- [ ] Step 4: Self-review verdict for evidence-before-assertion (paste failing output, not summaries)

**Report back (mandatory):** End with `## Produces` — pass/fail per suite with evidence, Session Changes summary, Commit/Push recommendation (never push without explicit order).

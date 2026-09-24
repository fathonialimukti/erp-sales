### Task 3: QE verification + .gitignore + push recommendation

**Files:**
- Modify: `.gitignore` (append `logs/` entry if missing — runtime logs
  `logs/app-*.log` are untracked and must never be committed)
- Read-only: `apps/client/src/components/FormField.tsx`,
  `apps/client/src/components/PageHeader.tsx`,
  `apps/client/src/pages/region/RegionFormPage.tsx`,
  `apps/client/src/tests/Form*.test.tsx`

**Interfaces:**
- Consumes: the `## Produces` blocks from Task 1 (FormField condition +
  prop list) and Task 2 (cosmetic-only confirmation) — pasted into your
  dispatch prompt verbatim.
- Produces: test/typecheck evidence, `.gitignore` update, Commit/Push verdict.

**Reads (in your own context — no context is provided):**
- The files listed above + `AGENTS.md` (you own all test execution).

**Frozen contract:**
- Run in `apps/client`: `bunx vitest run src/tests/FormField.test.tsx
  src/tests/FormFooter.test.tsx src/tests/FormLayout.test.tsx
  src/tests/FormPreview.test.tsx src/tests/FormSection.test.tsx`
  — expect 44/44 (the 2 previously failing `showValid` tests must now pass).
- Run `bunx tsc --noEmit` in `apps/client` — must exit 0.
  (Do NOT trust `bun run check-types` turbo cache-hit output; run tsc directly.)
- Confirm via `git status --porcelain` that `logs/` is ignored after your edit
  and that `opencode.json` is still dirty-but-unrelated (flag it for exclusion
  at commit time — do NOT revert it yourself).
- Playwright e2e: not required; note as post-push recommendation if relevant.

**Steps:**
- [ ] Step 1: Append `logs/` to `.gitignore` (only if no covering entry exists).
- [ ] Step 2: Run the vitest set + tsc; record exact pass/fail counts and output.
- [ ] Step 3: Full report + one-sentence Commit/Push recommendation. No git writes
    (no add/commit/push/merge) — recommending only.

**Preservation (mandatory):** additive only. The `.gitignore` append is the
sole file modification allowed in this task.

**Report back (mandatory):**
End your report with a `## Produces` block: exact test counts, tsc exit code,
`.gitignore` state, and the one-sentence Commit/Push recommendation.

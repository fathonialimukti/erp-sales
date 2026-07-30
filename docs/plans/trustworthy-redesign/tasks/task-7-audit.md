### Task 7: Residual leakage audit (read-only)

**Agent:** Code Reviewer
**Layer:** 3 (after T2–T6) — read-only, no git writes

**Files (read-only):**
- Scan: all ~24 `PageHeader` call sites (apps/client/src/pages/**/Index|Detail|Form|Dashboard)
- Scan: `apps/client/src/components/{KpiCard,StatusChip,DataTable}.tsx` + any summary-card components
- Scan: page bodies for residual gradient / oversaturation / module-rainbow / explicit `font-bold`/`font-semibold` on body/table cells (now that T1 lowers body weight to `font-normal`)

**Interfaces:**
- Consumes: T1 (new law), T2 (new PageHeader), T3–T6 (new surfaces)
- Produces: a **findings list** (file + line + issue + recommended fix) — no code changes, no git writes

**Frozen contract — what to flag:**
1. Any page that places its **own** gradient sub-header or saturated fill that duplicates/conflicts with the new flat `PageHeader`
2. Module-rainbow on table body cells or primary buttons (law ban, predates redesign)
3. Residual `backdrop-blur-*`, `bg-card/NN` opacity, `ring-primary/5`, `bold-mesh` usage T2–T6 missed
4. Explicit `font-bold`/`font-semibold` on body/table cells that should now be `font-normal` (per T1 amended §3) — **group these into one cleanup follow-up task**, do not fix inline
5. Any gray text (`text-gray-*`, `text-slate-*`, `text-zinc-*`, neutral `--muted-foreground` regression) — T1 must keep `--muted-foreground` chromatic
6. KpiCard / StatusChip: confirm module wash dropped to 8% (T1) and no gradient plates remain

**Steps:**
- [ ] Grep workspace for the 6 flag categories
- [ ] Cross-check against T1–T6 changed files to separate "fixed" from "still leaking"
- [ ] Produce ranked findings: which pages/components still need a follow-up pass
- [ ] Return full report + one-sentence Commit/Push recommendation; **no** git writes

**Do not:** edit any file. Do not `git add/commit/push`. This is evidence-gathering for the orchestrator + user to decide a follow-up cleanup task.

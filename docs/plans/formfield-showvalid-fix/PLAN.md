# formfield-showvalid-fix — Fix Plan (push-readiness blockers)

## Goal

Make the uncommitted guided-form-experience batch push-ready. One functional
blocker + commit hygiene; nothing else.

## Blocker (from push-readiness review)

`FormField.tsx:43` gates the valid-check icon on `showValid && !error && value`,
but zero of 21 `<FormField>` call sites pass `value=`, and ~30 sites use bare
`showValid` or plain boolean expressions. Result: the green check never renders
in production AND 2 unit tests fail (`FormField.test.tsx` renders `showValid`
with no `value` and expects `svg.text-success`).

## Task DAG

```
T1: FormField fix      (FormField.tsx — drop `value` gate)      [frontend]
T2: Micro-cleanups     (PageHeader.tsx, RegionFormPage.tsx)     [frontend]  } parallel (disjoint files)
  ↓↓↓
T3: QE verification    (vitest + tsc + logs/ .gitignore + report) [quality]
  ↓
User commits + pushes (manual — agents never do git writes)
```

## Out of scope (deferred, non-blocking)

- FormLayout `auto`/`standard` duplicate branch; FormFooter callback-identity
  autosave design — real but need their own plans, not push blockers.
- `opencode.json` provider config (+83 lines, unrelated) — excluded at commit
  time by the user, no code task.
- Playwright e2e — recommended after push, not a gate.

## Rulings

- R1: No worktree — fix lives inside the existing dirty tree; a worktree would
  split the uncommitted feature batch. Cost if wrong: none (3 disjoint files).
- R2: No per-task reviewers — repo orchestration mandates one final QE gate;
  T1/T2 are single-file mechanical fixes. Cost if wrong: QE catches it in T3.
- R3: Implementers don't run tests or commit (repo hard rules) — QE runs
  vitest + tsc; user commits. Cost if wrong: none, enforced by tool policy.
- R4: T1+T2 parallel despite skill's serial rule — disjoint file sets, repo
  DAG model governs. Cost if wrong: trivial merge, files don't overlap.
- R5: No model knob on the Task harness — subagent_type only, session default
  applies. Cost if wrong: negligible for mechanical edits.

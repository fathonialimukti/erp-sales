### Task 2: Micro-cleanups (cosmetic, zero behavior change)

**Files:**
- Modify: `apps/client/src/components/PageHeader.tsx`
- Modify: `apps/client/src/pages/region/RegionFormPage.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: identical rendered output; no prop/API changes.

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/PageHeader.tsx` (progress-dots block: `isCurrent && ""`
  renders an empty-string class — remove the dead branch)
- `apps/client/src/pages/region/RegionFormPage.tsx` (whitespace noise:
  over-indented `<form.Field`; single-quoted `'@tanstack/react-form'` import —
  normalize to repo double-quote style)
- `AGENTS.md`

**Frozen contract:**
- PageHeader: delete the `isCurrent && ""` clause; keep dot colors
  (`bg-success/30` completed, accent current, `bg-muted` upcoming) and the
  `pageHeader.progress.label` intl string exactly as-is.
- RegionFormPage: whitespace/quotes only. No logic, prop, or import changes.

**Steps:**
- [ ] Step 1: Apply the minimal edits above.
- [ ] Step 2: Self-review via `git diff` — confirm cosmetic-only.
- [ ] Step 3: Do NOT run tests (quality-engineer owns test execution). Do NOT commit.

**Preservation (mandatory):** additive/cosmetic only — no route, procedure,
page, permission, or i18n changes.

**Report back (mandatory):**
End your report with a `## Produces` block: exact lines changed per file and
explicit confirmation of zero behavior change.

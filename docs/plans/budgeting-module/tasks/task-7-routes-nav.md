### Task 7: Client routes + nav + module color

**Files:**
- Modify: `apps/client/src/routes.tsx`, `apps/client/src/constants/nav-menu.ts`, `apps/client/src/components/Sidebar.tsx`, `apps/client/src/types/module.ts`, `apps/client/src/index.css`

**Frozen contract:**

## 1. Routes (`routes.tsx`)

Add lazy imports + route entries for the new pages (kebab-case paths, matching existing pattern). The pages themselves are created in Task 8 — **this task adds the imports/routes referencing them** (they must exist for typecheck; if Task 8 hasn't landed yet, coordinate — this task runs AFTER Task 8's page files exist, OR create the route entries and let Task 8 create the files. **Order: Task 8 creates pages first, then this task wires routes.** If you run first, create minimal placeholder page files too.)

Routes to add (each with index/create/:id/:id-edit children like `region`):
- `/budget` → `BudgetPage` (single page, no detail/form — list + remaining progress)
- `/budget-type` → `BudgetTypeIndexPage` / `BudgetTypeDetailPage` / `BudgetTypeFormPage`
- `/budget-period` → `BudgetPeriodIndexPage` / `BudgetPeriodDetailPage` / `BudgetPeriodFormPage`
- `/budget-line` → `BudgetLineIndexPage` / `BudgetLineDetailPage` / `BudgetLineFormPage`
- `/action-type` → `ActionTypeIndexPage` / `ActionTypeDetailPage` / `ActionTypeFormPage`
- `/event-type` → `EventTypeIndexPage` / `EventTypeDetailPage` / `EventTypeFormPage`
- `/vendor` → `VendorIndexPage` / `VendorDetailPage` / `VendorFormPage`

Use the `lazyNamed` helper exactly like existing pages.

## 2. Nav (`nav-menu.ts` + `Sidebar.tsx` — two-gate rule)

- `nav-menu.ts`: add a new top-level group `nav.budgeting` (icon: reuse `icons.navPlanning` or add a new icon — check `assets/icons.ts`; if no budget icon exists, reuse `navPlanning`). Children:
  - `nav.budget` → `/budget`, permission `budget@read`
  - `nav.budget_line` → `/budget-line`, permission `budget-line@read`
  - `nav.budget_type` → `/budget-type`, permission `budget-type@read`
  - `nav.budget_period` → `/budget-period`, permission `budget-period@read`
  - `nav.action_type` → `/action-type`, permission `action-type@read`
  - `nav.event_type` → `/event-type`, permission `event-type@read`
  - `nav.vendor` → `/vendor`, permission `vendor@read`
- `Sidebar.tsx`: add a new section `budgeting` (id `"budgeting"`, name `nav.section.budgeting`) with the 7 hrefs in its filter array. **Two-gate rule = both nav-menu.ts AND Sidebar.tsx must list the item.**

## 3. Module color (`types/module.ts` + `index.css`)

- `types/module.ts`: add `"budget"` to `ModuleKey` union + `KNOWN_MODULES` set.
- `index.css`: add `--color-module-budget: var(--module-budget)` in the `:root` color mapping block (near line 52-66), and `--module-budget: oklch(0.46 0.2 260)` in the light block (near line 122-136) + `--module-budget: oklch(0.52 0.2 260)` in the dark block (near line 191-195). **Hue 260° violet is free** (settings is 320, planning 280, user 270 — 260 is distinct enough; if 260 collides visually with user/planning, use 340 rose — pick 260 violet per PLAN.md suggestion).
- The master pages (Task 8) use `module="budget"` for their PageHeader/eyebrow.

**Steps:**
- [ ] Add module color (types + css)
- [ ] Add nav entries (nav-menu.ts + Sidebar.tsx)
- [ ] Add routes (routes.tsx) — coordinate with Task 8 page files
- [ ] Verify: `cd apps/client && bun run check-types` — must pass
- [ ] Report: files changed, typecheck result

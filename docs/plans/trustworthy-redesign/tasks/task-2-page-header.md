### Task 2: PageHeader — flat structured toolbar

**Agent:** Frontend Engineer
**Layer:** 2 (parallel) — depends on T1

**Files:**
- Modify: `apps/client/src/components/PageHeader.tsx`

**Interfaces:**
- Consumes: T1 new tokens (`--primary` Aurora Azure, `--module-*` 8% wash, `--card`, `--border`, `--foreground`) + T1 PageHeader recipe clause
- Produces: **same `<PageHeader />` component API** — `title, description?, module?, eyebrow?, onBack?, actions?, icon?, media?, className?`. All ~24 call sites (Dashboard, customer/outlet/area/region/sales-order/visit-log/sku/action-program/event-proposal/users/access-control/activity-logs/email-crm/knowledge-base/reports index+detail+form) keep working unchanged.

**Frozen contract:**
- Resource: shared component (no domain router)
- Signature preserved: module accent = **3px left rail + eyebrow color** (wayfinding flare)
- Signature removed: **gradient fill + white-type hero + radial overlay**
- New chrome: `bg-card border-b border-border` (flat), title `text-foreground font-bold` (black), description/eyebrow `text-muted-foreground` (chromatic Azure), actions right-aligned
- Left rail color: `var(--module-X)` when `module` set; fall back to `--primary` when not
- `onBack` back button: `text-foreground` (not white) — sits on light card now
- Icon plate: keep, but on `bg-muted` (soft fill) with module color icon — NOT on gradient

**Steps:**
- [ ] Read current `PageHeader.tsx` (the gradient hero version)
- [ ] Replace hero recipe: remove `linear-gradient` + `radial-gradient overlay` + `bg-linear-to-br from-primary to-primary`; render `bg-card border-b border-border` flat
- [ ] Replace text colors: white → `text-foreground` (title), `text-muted-foreground` (description/eyebrow)
- [ ] Add 3px left rail: a `<span>` absolutely positioned, `bg-[var(--module-X)]` / `bg-primary`, width 3px, full height — only when `module` set or as subtle default
- [ ] Back button + icon plate: light-surface variants (black icon, soft `bg-muted` plate)
- [ ] Verify API unchanged (props + data-slot + data-module attrs for tests)
- [ ] Run `bun run check-types`; spot-check 1–2 pages render (Dashboard, CustomerIndexPage)
- [ ] Self-review

**Do not:** change the prop signature. Do not touch any page file (they inherit the fix). Do not reintroduce gradient. `ui-ux-pro-max` available if needed.

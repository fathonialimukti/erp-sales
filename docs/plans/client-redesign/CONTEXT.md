# Client CRM Redesign — Shared Context Pack

**Feature:** client-redesign  
**Spec:** `docs/superpowers/specs/2026-07-23-client-crm-redesign-design.md`  
**Design system:** `design-system/erp-sales-crm/MASTER.md`  
**Status:** Spec + plan approved 2026-07-23 — ready for Phase 1 (tokens)  
**Plan:** `docs/superpowers/plans/2026-07-23-client-crm-redesign.md`  
**Scope:** `apps/client` only (no backend)

---

## FROZEN CONTRACT — do not reinterpret

```
## FROZEN CONTRACT — do not reinterpret, do not re-read conventions
Resource: client-crm-redesign (visual only)
Direction: Professional Blue + Colorful Accents CRM
Primary brand: #2563EB (--color-primary-*)
Deal/success: #059669 (--color-accent-* repurposed as success/deal)
Border cool: #E4ECFC
Style: Glassmorphism shell + solid cards + iOS module tiles
Icons: SVG only; Family A module tiles (baked colors); Family B chrome mono
Planning icon: navPlanning (calendar+checklist, teal→emerald); alias navProgram
New icons required: navEmailCrm, navKnowledge, navAi, navPlanning
Tables: density modes .tbl--comfortable | .tbl--crm (default CRM indexes) | .tbl--compact (line items)
Tables: sticky header, status chips, row actions, selected = primary-50 + 3px primary bar
Charts: Recharts + --chart-1..5 / positive / negative tokens; tooltips+labels required
Pipeline: Sales Order showcase; Table|Pipeline toggle; v1 read-only board (no drag required)
Stack: plain CSS + apps/client/src/ui/ — NO Tailwind, NO HeroUI
Typography: Poppins (UI); optional Open Sans secondary
Approach: Foundation-first phases 1→6
Rate limit: max 1–2 parallel Frontend subagents
Spec: docs/superpowers/specs/2026-07-23-client-crm-redesign-design.md
Design system: design-system/erp-sales-crm/MASTER.md
Context pack: docs/plans/client-redesign/CONTEXT.md
Design is FROZEN. Do NOT invoke brainstorming or re-open palette/icon debates.
```

---

## Key paths

| Area | Path |
|------|------|
| Tokens | `apps/client/src/styles/tokens.css` |
| Global CSS | `apps/client/src/index.css` |
| Page system | `apps/client/src/styles/page-system.css`, `module-page.css` |
| UI kit | `apps/client/src/ui/*` |
| Icons dir | `apps/client/src/assets/icons/` |
| Icon registry | `apps/client/src/assets/icons.ts` |
| Icon component | `apps/client/src/ui/Icon.tsx` |
| Nav menu | `apps/client/src/constants/nav-menu.ts` |
| Shell | `apps/client/src/layouts/PrivateLayout.tsx` + `.css` |
| Sidebar | `apps/client/src/components/Sidebar.tsx` + `.css` |
| Topbar | `apps/client/src/components/Topbar.tsx` |
| Dashboard | `apps/client/src/pages/Dashboard.tsx` + `.css` |
| Table styles | `apps/client/src/ui/Table.css`, `styles/module-page.css` |
| Sales Order pages | `apps/client/src/pages/sales-order/*` |
| Reports | `apps/client/src/pages/reports/*`, `styles/reports.css` |

---

## Current state (pre-redesign)

- Tokens already have emerald accent, glass, Poppins, iOS type scale
- Shell is already floating iOS-style glass
- ~80 local SVGs exist; quality mixed; some nav icons already colorful tiles
- Email CRM reuses sales-order icon; Knowledge/AI reuse sparkle
- UI kit exists (Button, Card, Table, …) with emerald-leaning primary
- Table has basic hover/active but no density variants; active bar still emerald-leaning
- Dashboard uses Recharts without shared chart tokens
- No pipeline/kanban view yet

---

## Phase checklist (implementation)

- [x] Phase 1 — Tokens (primary blue, module accents, shell vars, **chart + stage tokens**)
- [x] Phase 2 — SVG icon remake + `icons.ts` + nav-menu wiring
- [ ] Phase 3 — Shell + UI kit + **table density + chips + filter bar** (shell/UI kit recolor + table density done; chips still open)
- [ ] Phase 4 — Dashboard chart theme ✅ + **Sales Order table + pipeline v1** + Customer index ✅
- [ ] Phase 5 — Remaining modules; compact nested tables; optional extra pipelines
- [ ] Phase 6 — Review, a11y, `bun run check-types`

---

## Module accent map (quick)

Customers `#EC4899` · Orders `#3B82F6` · Visits `#F97316` · SKU `#8B5CF6` · Planning `#14B8A6` · Events fuchsia · Users indigo · Reports cyan · Email sky · Knowledge/AI violet–indigo

---

## Table / chart / pipeline (quick)

- Densities: `.tbl--comfortable` | `.tbl--crm` (CRM indexes) | `.tbl--compact` (line items)
- Selected row: primary-50 + 3px primary left bar
- Charts: `--chart-1..5`, positive/negative; Recharts only
- Pipeline v1: Sales Order, read-only columns, Table|Pipeline toggle

---

## Icon tile recipe (copy into icon tasks)

```
viewBox 0 0 64 64
rx=16 gradient rect + shine + white multi-layer glyph
unique gradient ids per file
no currentColor on tile
stable light/dark
must read at 20–28px
```

---

## Constraints for specialists

- Client-only; do not touch `apps/server` or `packages/schemas` unless a type import path forces a no-op
- Prefer editing existing files over new abstraction layers
- Keep `data-ai-context` on pages
- i18n: do not break existing keys; only add if new visible strings appear
- After each phase: note files changed in this CONTEXT under “Session log”

---

## Session log

| Date | Event |
|------|--------|
| 2026-07-23 | Design approved; spec + MASTER + CONTEXT written |
| 2026-07-23 | Tweak: CRM table density, chart tokens, pipeline UI added to spec/MASTER/CONTEXT |
| 2026-07-23 | Spec OK; implementation plan written |
| 2026-07-23 | **Task 1 complete** — primary blue scale, cool border, module/chart/stage tokens; focus ring → primary. Files: `apps/client/src/styles/tokens.css`, `apps/client/src/index.css`, `docs/plans/client-redesign/CONTEXT.md` |
| 2026-07-23 | **Task 2 complete** — Family A iOS module tiles remade (`nav-*.svg`, unique gradient ids); new `navPlanning`/`navEmailCrm`/`navKnowledge`/`navAi`; alias `navProgram→navPlanning`; nav-menu wired. Files: `apps/client/src/assets/icons/nav-*.svg`, `apps/client/src/assets/icons.ts`, `apps/client/src/constants/nav-menu.ts`, `docs/plans/client-redesign/CONTEXT.md` |
| 2026-07-23 | **Task 3 complete** — Shell + core UI kit recolor to primary blue. Primary CTA/focus/active chrome → `--color-primary-*`; deal/success stays emerald. Files: `ui/Button|Chip|Card|Input|Textarea|Checkbox|Dropdown|Spinner|Avatar|FormDatePicker|SelectSearch.css`, `Chip.tsx`, `Sidebar|Topbar|PageHeader|SearchPalette|Navbar|NotificationDrawer|ButtonGroup|RowActions.css`, `PrivateLayout.css`, `tokens.css` (`--ios-accent*` → primary), `docs/plans/client-redesign/CONTEXT.md` |
| 2026-07-23 | **Task 4 complete** — Table density (`.tbl--comfortable` / `.tbl--crm` / `.tbl--compact`), selected row primary-50 + 3px primary bar, `.tbl__cell--money`, optional `Table density` prop, `.pg__view-toggle*` styles, `.m-table-card` padding aligned to CRM. Files: `ui/Table.css`, `ui/Table.tsx`, `styles/page-system.css`, `styles/module-page.css`, `docs/plans/client-redesign/CONTEXT.md` |
| 2026-07-23 | **Task 6 complete** — Customer index CRM density showcase: `ModuleTable density="crm"` → `.tbl--crm`, status `Chip` column, skeleton loading rows, filter toolbar spacing. Files: `pages/customer/CustomerIndexPage.tsx`, `components/ModulePage.tsx`, `locales/en.json`, `locales/id.json`, `docs/plans/client-redesign/CONTEXT.md` |
| 2026-07-23 | **Task 5 complete** — Dashboard charts themed with `--chart-*` tokens; main chart/skeleton height 280px; KPI delta chips use chart-positive/negative + % text. Files: `pages/Dashboard.tsx`, `pages/Dashboard.css`, `docs/plans/client-redesign/CONTEXT.md` |

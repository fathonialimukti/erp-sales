# Client CRM Redesign — Shared Context Pack

**Feature:** client-redesign  
**Spec:** `docs/superpowers/specs/2026-07-23-client-crm-redesign-design.md`  
**Design system:** `design-system/erp-sales-crm/MASTER.md`  
**Status:** Design approved 2026-07-23 — implementation not started until plan is written and phases dispatched  
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

---

## Current state (pre-redesign)

- Tokens already have emerald accent, glass, Poppins, iOS type scale
- Shell is already floating iOS-style glass
- ~80 local SVGs exist; quality mixed; some nav icons already colorful tiles
- Email CRM reuses sales-order icon; Knowledge/AI reuse sparkle
- UI kit exists (Button, Card, Table, …) with emerald-leaning primary

---

## Phase checklist (implementation)

- [ ] Phase 1 — Tokens (primary blue scale, module accents, shell vars, focus ring)
- [ ] Phase 2 — SVG icon remake + `icons.ts` + nav-menu wiring
- [ ] Phase 3 — Shell + UI kit recolor/polish
- [ ] Phase 4 — Dashboard + Customer + Sales Order showcase
- [ ] Phase 5 — Remaining modules
- [ ] Phase 6 — Review, a11y, `bun run check-types`

---

## Module accent map (quick)

Customers `#EC4899` · Orders `#3B82F6` · Visits `#F97316` · SKU `#8B5CF6` · Planning `#14B8A6` · Events fuchsia · Users indigo · Reports cyan · Email sky · Knowledge/AI violet–indigo

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

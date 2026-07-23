# Aurora Commerce Rebuild — Shared Context Pack

**Feature:** aurora-commerce client UI rebuild  
**Spec:** `docs/superpowers/specs/2026-07-23-aurora-commerce-rebuild-design.md`  
**Design system:** `design-system/aurora-commerce/MASTER.md`  
**Status:** Design approved 2026-07-23 — awaiting user review of written spec, then implementation plan  
**Scope:** `apps/client` presentation layer only (no backend)

---

## FROZEN CONTRACT — do not reinterpret

```
## FROZEN CONTRACT — do not reinterpret, do not re-read conventions
Resource: aurora-commerce-rebuild (full client UI)
Direction: Aurora Commerce — calm indigo chrome + colorful module meaning
Stack: Tailwind CSS v4 + shadcn/ui (new-york, Aurora-themed) — NOT plain CSS kit
Primary: #4F46E5 (--primary) Aurora Indigo
Success/deal only: #10B981 (--success) Mint — never default CTA
Canvas: #F4F7FF | Card: #FFFFFF | Border: #E0E7FF
Signature: aurora mesh shell + color-owned module tiles
Typography: Plus Jakarta Sans (headings) + Inter (body) + JetBrains Mono (IDs)
Tables: DataTable domain component; default density "crm"; TP1–TP12 mandatory
Tables: sticky header, StatusChip, money right+tabular-nums, selected = primary soft + 3px indigo bar
FilterBar part of table system; ≤8 default columns; row click → detail
Icons: Lucide chrome + custom colorful module tiles; no emoji
Charts: Recharts + --chart-1..5 / positive / negative
Pipeline: Sales Order Table|Pipeline toggle (existing v1 behavior, restyle)
i18n: react-intl; both en.json + id.json
Data: vanilla tRPC + TanStack Query (unchanged)
Forms: @tanstack/react-form + shadcn fields
Old kit: abandon apps/client/src/ui/** after cutover; delete obsolete CSS
Backend: untouched
MCP available: shadcn, context7, playwright, chrome-devtools
Design system: design-system/aurora-commerce/MASTER.md
Spec: docs/superpowers/specs/2026-07-23-aurora-commerce-rebuild-design.md
Context pack: docs/plans/aurora-commerce/CONTEXT.md
Design is FROZEN. Do NOT re-open palette/stack debates or re-brainstorm.
```

---

## Module accent map

| Module | Hex | Token |
|--------|-----|-------|
| Customers | `#EC4899` | `--module-customer` |
| Outlets | `#F43F5E` | `--module-outlet` |
| Orders | `#3B82F6` | `--module-order` |
| Visits | `#F97316` | `--module-visit` |
| SKU | `#8B5CF6` | `--module-sku` |
| Planning | `#14B8A6` | `--module-planning` |
| Events | `#D946EF` | `--module-event` |
| Users | `#6366F1` | `--module-user` |
| Reports | `#06B6D4` | `--module-report` |
| Email CRM | `#0EA5E9` | `--module-email` |
| Knowledge | `#8B5CF6` | `--module-knowledge` |
| AI | `#6366F1` | `--module-ai` |

---

## Key paths

| Area | Path |
|------|------|
| Theme entry | `apps/client/src/index.css` |
| shadcn ui | `apps/client/src/components/ui/*` |
| Domain components | `apps/client/src/components/*` |
| Utils `cn()` | `apps/client/src/lib/utils.ts` |
| Routes | `apps/client/src/routes.tsx` |
| Shell | `apps/client/src/layouts/PrivateLayout.tsx` |
| Nav | `apps/client/src/constants/nav-menu.ts` |
| Icons | `apps/client/src/assets/icons.ts` + `assets/icons/` |
| Locales | `apps/client/src/locales/en.json`, `id.json` |
| Old kit (purge later) | `apps/client/src/ui/*` |
| Old styles | `apps/client/src/styles/*` |

---

## Phase checklist

- [ ] Phase 1 — Foundation (Tailwind v4, shadcn init, Aurora tokens, fonts)
- [ ] Phase 2 — UI kit (primitives + DataTable, StatusChip, FilterBar, PageHeader, …)
- [ ] Phase 3 — Shell (AppShell, Sidebar, Topbar, drawers)
- [ ] Phase 4 — Showcase (Login, Landing, Dashboard, Customer, Sales Order + pipeline)
- [ ] Phase 5 — Remaining modules template sweep
- [ ] Phase 6 — Purge old CSS kit, update instructions, a11y + check-types + screenshots

---

## MCP / tools for implementers

| MCP / skill | Use |
|-------------|-----|
| **shadcn MCP** | Add/list components, registry, correct install commands |
| **context7** | Tailwind v4 + library docs |
| **playwright / chrome-devtools** | Visual QA |
| **frontend-design** | Keep Aurora distinctive (avoid default zinc) |
| **ui-ux-pro-max** | Density/a11y; override monochrome defaults with Aurora tokens |

---

## Principles quick ref

- P1–P10: Master design principles  
- TP1–TP12: Table principles (default density `crm`)  
- Mint never global CTA  
- Glass shell / solid tables  
- One kit only after cutover  

---

## Notes from design session

- User chose direction **A — Aurora Commerce** for portfolio rebuild  
- Full UI kit rebuild authorized; CSS files may be deleted after replacement  
- Table principles explicitly approved  
- shadcn MCP installed in `.vscode/mcp.json` for implementation  

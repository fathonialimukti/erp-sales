# Aurora Commerce Rebuild — Shared Context Pack

**Feature:** aurora-commerce client UI rebuild  
**Spec:** `docs/superpowers/specs/2026-07-23-aurora-commerce-rebuild-design.md`  
**Design system:** `design-system/aurora-commerce/MASTER.md`  
**Status:** Spec + plan approved 2026-07-23 — ready for Phase 1 (foundation)
**Plan:** `docs/superpowers/plans/2026-07-23-aurora-commerce-rebuild.md`  
**Scope:** `apps/client` presentation layer only (no backend)

---

## FROZEN CONTRACT — do not reinterpret

```
## FROZEN CONTRACT — do not reinterpret, do not re-read conventions
Resource: aurora-commerce-rebuild (full client UI)
Direction: Aurora Commerce — colorful custom nav + solid work surfaces
Stack: Tailwind CSS v4 + shadcn/ui (new-york, Aurora-themed) — NOT plain CSS kit
Primary: #4F46E5 (--primary) Aurora Indigo
Success/deal only: #10B981 (--success) Mint — never default CTA
Canvas: #F4F7FF | Card: #FFFFFF | Border: #E0E7FF
Signature: aurora mesh canvas + color-owned CUSTOM nav SVG tiles
Typography: Plus Jakarta Sans (headings) + Inter (body) + JetBrains Mono (IDs)
Icons P11: Lucide = basic chrome ONLY (search, bell, edit, trash, chevron, …)
Icons P11: Nav modules = CUSTOM colorful SVGs ONLY (never Lucide in nav rows)
Shell: FULL visual redesign of Sidebar + Topbar — drop ios-sb / old CSS
Shell logic KEEP: NAV_MENU, permissions, sections, path active, atoms,
  search palette, notif drawer, AI host, UserMenuPopover + user-menu-anchor
Avatar P12: exactly ONE UserAvatarMenu visible
  - sidebar expanded + lg: avatar in sidebar footer only
  - sidebar collapsed OR mobile: avatar in topbar only
  - single UserMenuPopover host in PrivateLayout
Tables: DataTable; default density "crm"; TP1–TP12 mandatory
Tables: sticky header, StatusChip, money right+tabular-nums, selected = primary soft + 3px indigo bar
FilterBar part of table system; ≤8 default columns; row click → detail
Charts: Recharts + --chart-1..5 / positive / negative
Pipeline: Sales Order Table|Pipeline toggle (restyle existing v1)
i18n: react-intl; both en.json + id.json
Data: vanilla tRPC + TanStack Query (unchanged)
Forms: @tanstack/react-form + shadcn fields
React/Tailwind: composition, cn(), token-driven, no new shell CSS files
Motion: `motion` (Framer) ONLY — no anime.js / animate.css
Motion style: professional, not bloated — shared presets in lib/motion.ts
  - page enter: fade+8px y, 200-280ms
  - shell: subtle opacity only
  - KPI/list stagger: 40-50ms, max ~8 items
  - tables: NO per-row bounce; optional light container fade only
  - always useReducedMotion / reduced-motion skip
  - no layout thrashing, no scroll-jacking, no perpetual decoration
Old kit: src/ui is Aurora adapters; page CSS purge ongoing
Backend: untouched
MCP: shadcn, context7, playwright, chrome-devtools
Skills: frontend-design, ui-ux-pro-max (override monochrome with Aurora)
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
| Shell layout | `apps/client/src/layouts/PrivateLayout.tsx` |
| Sidebar (rebuild visual) | `apps/client/src/components/Sidebar.tsx` |
| Topbar (rebuild visual) | `apps/client/src/components/Topbar.tsx` |
| User menu (keep logic) | `apps/client/src/components/UserMenuPopover.tsx` |
| Nav data (keep) | `apps/client/src/constants/nav-menu.ts` |
| Custom nav SVGs | `apps/client/src/assets/icons/` |
| Locales | `apps/client/src/locales/en.json`, `id.json` |
| Old kit (compat adapters) | `apps/client/src/ui/*` — thin shadcn/Tailwind wrappers; prefer `@/components/ui` for new code |
| Old styles (mid-migration) | `apps/client/src/styles/*` still imported by `index.css` for page-system/module-page/reports until page rewrites |

---

## Avatar placement (implement exactly)

```tsx
const showAvatarInSidebar = sidebarOpen && isLgUp;
// Sidebar footer: {showAvatarInSidebar && <UserAvatarMenu variant="sidebar" />}
// Topbar end:    {!showAvatarInSidebar && <UserAvatarMenu variant="topbar" />}
// PrivateLayout: single <UserMenuPopover /> host
```

---

## Phase checklist

- [ ] Phase 1 — Foundation (Tailwind v4, shadcn init, Aurora tokens, fonts)
- [ ] Phase 2 — UI kit (primitives + DataTable, StatusChip, FilterBar, PageHeader, UserAvatarMenu, …)
- [ ] Phase 3 — Shell visual rebuild + custom nav SVGs + P12 avatar (logic reused)
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
| **ui-ux-pro-max** | Density/a11y/motion; **override** monochrome defaults with Aurora tokens |

---

## Principles quick ref

- P1–P12: Master design principles (incl. icon dual-family + single avatar)
- TP1–TP12: Table principles (default density `crm`)
- Mint never global CTA
- Colorful custom nav / solid tables
- Rebuild design, reuse logic
- One kit only after cutover

---

## Notes from design session

- User chose direction **A — Aurora Commerce** for portfolio rebuild
- Full UI kit rebuild authorized; CSS files may be deleted after replacement
- Table principles explicitly approved
- **Tweak:** Lucide only for basic icons; nav must use custom created SVGs
- **Tweak:** Change app design not structure; drop sidebar/topbar visual design; keep logic
- **Tweak:** Resolve dual avatar (sidebar + topbar) via P12 single surface
- **Tweak:** Make it colorful; use ui-ux-pro-max; React + Tailwind best practices
- shadcn MCP installed in `.vscode/mcp.json` for implementation

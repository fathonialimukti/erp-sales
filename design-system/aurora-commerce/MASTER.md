# Design System Master — Aurora Commerce CRM

> **LOGIC:** When building a specific page, first check `design-system/aurora-commerce/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below + the approved spec.

---

**Project:** ERP Sales CRM — Aurora Commerce rebuild  
**Generated:** 2026-07-23  
**Status:** Approved  
**Category:** SaaS Sales CRM (portfolio-grade)  
**Design dials:** Variance 7/10 | Motion 6/10 | Density 7/10  
**Spec:** `docs/superpowers/specs/2026-07-23-aurora-commerce-rebuild-design.md`  
**Context:** `docs/plans/aurora-commerce/CONTEXT.md`  
**Stack:** Tailwind CSS v4 + shadcn/ui (new-york base, Aurora-themed)  
**Icons:** Lucide (chrome) + custom colorful module tiles  
**Supersedes:** `design-system/erp-sales-crm/` plain-CSS redesign (abandoned for this track)

---

## North star

> **Calm chrome. Colorful meaning. Portfolio-grade polish.**

Signature element: **aurora mesh shell + color-owned modules**.  
Chrome stays calm indigo/glass. Color lives in module tiles, status chips, KPIs, pipeline stages, and empty states — not rainbow chrome.

---

## Design principles (P1–P10)

| ID | Principle | Rule |
|----|-----------|------|
| **P1** | Color carries meaning | Indigo = brand/CTA; mint = deal/success only; module accents = domain identity; red/amber = danger/warning only |
| **P2** | Glass for shell, solid for work | Sidebar/topbar/drawers = frosted glass; tables/forms = solid white cards |
| **P3** | One signature, quiet surroundings | Aurora mesh + module color is the memorable thing; cut non-serving flourishes |
| **P4** | Density with breath | CRM density 7/10: compact tables, generous page margins |
| **P5** | Progressive color intensity | Shell low → module entry high → status medium-high → body neutral |
| **P6** | Motion is feedback | 150–250ms hover; 200–400ms enter/exit; honor `prefers-reduced-motion` |
| **P7** | Accessibility is brand | Text ≥4.5:1; visible focus; never color-only status; targets ≥40–44px |
| **P8** | Tokens over one-offs | No raw hex in components except token definitions |
| **P9** | Portfolio honesty | Landing/login expressive; app interior prioritizes scan speed |
| **P10** | Rebuild cleanly | One kit only; delete old plain-CSS kit after cutover |

---

## Color system

### Semantic tokens (shadcn mapping)

| Token | Hex | Role |
|-------|-----|------|
| `--background` | `#F4F7FF` | App canvas (cool tint) |
| `--foreground` | `#0F172A` | Primary text |
| `--card` | `#FFFFFF` | Solid work surfaces |
| `--card-foreground` | `#0F172A` | Card text |
| `--popover` | `#FFFFFF` | Menus, popovers |
| `--primary` | `#4F46E5` | **Aurora Indigo** — CTA, links, active nav |
| `--primary-foreground` | `#FFFFFF` | On primary |
| `--secondary` | `#EEF2FF` | Soft indigo fill |
| `--secondary-foreground` | `#3730A3` | On secondary |
| `--muted` | `#F1F5F9` | Muted surfaces |
| `--muted-foreground` | `#64748B` | Secondary text |
| `--accent` | `#EEF2FF` | Chrome hover fills |
| `--accent-foreground` | `#312E81` | On accent |
| `--destructive` | `#EF4444` | Danger |
| `--border` | `#E0E7FF` | Cool indigo border |
| `--input` | `#E0E7FF` | Input border |
| `--ring` | `#4F46E5` | Focus ring |
| `--success` | `#10B981` | **Mint Deal** — revenue, approved, positive |
| `--success-foreground` | `#FFFFFF` | On success |
| `--warning` | `#F59E0B` | Warning |
| `--info` | `#3B82F6` | Informational |

### Primary scale

| Step | Hex | Notes |
|------|-----|--------|
| 50 | `#EEF2FF` | Soft fills, selected rows |
| 100 | `#E0E7FF` | Borders, chips |
| 200 | `#C7D2FE` | |
| 300 | `#A5B4FC` | |
| 400 | `#818CF8` | |
| 500 | `#6366F1` | |
| **600** | **`#4F46E5`** | Brand primary |
| 700 | `#4338CA` | Hover primary |
| 800 | `#3730A3` | |
| 900 | `#312E81` | |

### Aurora mesh (shell atmosphere only)

| Stop | Hex | Opacity |
|------|-----|---------|
| Violet | `#A78BFA` | 8–18% |
| Cyan | `#22D3EE` | 8–18% |
| Rose | `#FB7185` | 8–18% |

Blur 60–100px. Static or very slow drift. Never compete with content.

### Module accents

| Token | Hex | Domain |
|-------|-----|--------|
| `--module-customer` | `#EC4899` | Customers |
| `--module-outlet` | `#F43F5E` | Outlets |
| `--module-order` | `#3B82F6` | Sales orders |
| `--module-visit` | `#F97316` | Visit logs |
| `--module-sku` | `#8B5CF6` | SKU / catalog |
| `--module-planning` | `#14B8A6` | Action programs |
| `--module-event` | `#D946EF` | Event proposals |
| `--module-user` | `#6366F1` | Users / access |
| `--module-report` | `#06B6D4` | Reports |
| `--module-email` | `#0EA5E9` | Email CRM |
| `--module-knowledge` | `#8B5CF6` | Knowledge |
| `--module-ai` | `#6366F1` | AI surfaces |

**Module color usage:** nav tiles, page eyebrow, KPI icon plates, empty-state tint.  
**Not for:** body text, table gridlines, primary buttons, full row backgrounds.

### Pipeline / stage colors

| Stage | Color role |
|-------|------------|
| Draft | slate / neutral |
| Proposed | indigo / primary |
| Approved | mint / success |
| Rejected | destructive |

### Chart tokens

| Token | Hex |
|-------|-----|
| `--chart-1` | `#4F46E5` |
| `--chart-2` | `#06B6D4` |
| `--chart-3` | `#EC4899` |
| `--chart-4` | `#F97316` |
| `--chart-5` | `#8B5CF6` |
| `--chart-positive` | `#10B981` |
| `--chart-negative` | `#EF4444` |

Charts always show tooltips + labels; never color-only meaning.

---

## Typography

| Role | Family | Weight | Size | Use |
|------|--------|--------|------|-----|
| Display | Plus Jakarta Sans | 700 | 30–36px | Landing hero only |
| Heading | Plus Jakarta Sans | 600–700 | 18–24px | Page / card titles |
| Body | Inter | 400–500 | 14–16px | UI copy, forms |
| Label | Inter | 500–600 | 12–13px | Field labels, chips |
| Table | Inter | 400–500 | 13–14px | Dense data |
| Mono | JetBrains Mono | 400–500 | 12–13px | IDs, codes, doc numbers |

**Type scale:** `xs` 12 · `sm` 13–14 · `base` 15–16 · `lg` 18 · `xl` 20 · `2xl` 24 · `3xl+` landing only.

**Rules:** sentence case UI labels; tabular nums for money; no decorative display fonts in app chrome.

---

## Spacing & layout

| Token | px | Use |
|-------|-----|-----|
| 1 | 4 | Icon gaps |
| 2 | 8 | Inline compact |
| 3 | 12 | Chip padding |
| 4 | 16 | Control padding |
| 6 | 24 | Card / section padding |
| 8 | 32 | Section gaps |
| 10 | 40 | Page block gaps |
| 12 | 48 | Major sections |

| Element | Spec |
|---------|------|
| Page padding | 24px desktop / 16px mobile |
| Sidebar | 260px expanded / 72px collapsed |
| Topbar | 56–64px |
| Card radius | 12–16px (`rounded-xl`) |
| Control radius | 8–10px (`rounded-lg`) |
| Dialog radius | 16–20px (`rounded-2xl`) |
| Content practical max | ~1440–1600px |

---

## Elevation & shape

| Level | Treatment | Use |
|-------|-----------|-----|
| 0 | Flat canvas | Page background |
| 1 | Border / whisper shadow | Default cards, tables |
| 2 | Soft shadow | Raised cards, dropdowns |
| 3 | Stronger + blur | Modals, command palette |
| Glass | `backdrop-blur-xl` + white 70–80% | Sidebar, topbar, floating panels |

Prefer cool indigo borders over heavy shadows.

---

## Iconography

| Family | Use |
|--------|-----|
| Lucide | Chrome actions, form, table actions |
| Custom module tiles | Domain identity (gradient plate + glyph) |

Sizes: 16 / 20 / 24. Stroke 1.5–2px. **No emoji as UI icons.**  
Module tiles: baked gradients; do not invert with CSS filters.

---

## Motion

| Token | Value | Use |
|-------|-------|-----|
| fast | 120–150ms | Hover color |
| normal | 200–250ms | Buttons, chips |
| enter | 250–350ms | Dialog / sheet |
| stagger | 40–60ms | Dashboard KPI grid only |

Easing: standard `cubic-bezier(0.2, 0.8, 0.2, 1)`.  
Always respect `prefers-reduced-motion: reduce`.

---

## Breakpoints

| Name | Min | Behavior |
|------|-----|----------|
| sm | 640 | Comfortable forms |
| md | 768 | 2-col forms; sidebar may collapse |
| lg | 1024 | Full shell |
| xl | 1280 | Wide tables |
| 2xl | 1536 | Dashboard multi-column |

Mobile: sidebar → sheet; tables may horizontal-scroll; identity + status + amount stay scannable.

---

## Component architecture

```
tokens (CSS vars + Tailwind @theme)
        ↓
shadcn primitives (apps/client/src/components/ui/*)
        ↓
domain components (AppShell, DataTable, ModuleTile, …)
        ↓
page templates (Index / Detail / Form / Dashboard / Pipeline)
```

### shadcn primitives

Button, Input, Textarea, Label, Checkbox, Switch, Radio, Select,  
Dialog, Sheet, Dropdown Menu, Popover, Tooltip, Tabs, Badge, Card,  
Separator, Avatar, Skeleton, Progress, Table, Pagination, Command,  
Scroll Area, Toast/Sonner, Form helpers, Calendar / Date picker.

### Domain components

| Component | Responsibility |
|-----------|----------------|
| `AppShell` | Aurora mesh + glass sidebar/topbar |
| `Sidebar` / `NavModuleTile` | Colorful module nav |
| `Topbar` | Search, notifications, AI, user |
| `PageHeader` | Title, module eyebrow, actions |
| `FilterBar` | Search + filters + count |
| `DataTable` | Densities, sticky header, row actions |
| `StatusChip` | Approval/status with icon + label |
| `KpiCard` | Dashboard metric + accent plate |
| `PipelineBoard` | Stage columns, tinted headers |
| `EmptyState` | Module-tinted empty + CTA |
| `ConfirmDialog` | Draft / propose / delete |
| `EntityMeta` | ID, timestamps, approval strip |

### Button hierarchy

| Variant | When |
|---------|------|
| `default` (primary indigo) | Save, Create, Propose |
| `secondary` / `outline` | Secondary |
| `ghost` | Tertiary / table row |
| `destructive` | Delete, reject |
| `success` (mint) | Explicit approve/money moments only — rare |

---

## Table design principles (CRM-critical)

> **Scan fast. Act faster. Color only for status and selection — never decoration.**

Tables are the primary work surface. Full rules below are **normative** for all index and nested tables.

### Table principles (TP1–TP12)

| ID | Principle |
|----|-----------|
| **TP1** | One primary object per row; identity column first |
| **TP2** | Status is a chip (icon + label), never full-row status paint |
| **TP3** | Actions right-aligned; row click → detail; confirm destructive |
| **TP4** | Density intentional: comfortable ~52 / **crm ~44 (default)** / compact ~36 |
| **TP5** | Sticky header; stable column widths; no layout jump on load |
| **TP6** | Typed columns: identity, secondary, status, date, money (right + tabular-nums), actions |
| **TP7** | Selection ≠ status: selected = primary soft fill + 3px indigo left bar |
| **TP8** | FilterBar is part of the table system (search, filters, count, create nearby) |
| **TP9** | Loading skeletons, empty, no-results, error are first-class |
| **TP10** | Default 5–8 columns; extra fields on detail page |
| **TP11** | Calm sort + server pagination; show range “1–20 of N” |
| **TP12** | Nested/line-item tables use **compact** and stay quiet |

### Density map

| Density | Row ~height | Use |
|---------|-------------|-----|
| Comfortable | 52px | Small masters (Region, Area) |
| **CRM (default)** | **44px** | All CRM index pages |
| Compact | 36px | Line items, nested tables, permissions |

### Column order (left → right)

1. Optional checkbox  
2. **Primary identity**  
3. Key relations (area, customer, owner)  
4. Status  
5. Dates  
6. Money / metrics  
7. Actions  

### Column type rules

| Type | Align | Format |
|------|-------|--------|
| Identity | left | medium weight foreground |
| Secondary | left | muted |
| Status | left | StatusChip |
| Date | left | locale, never raw ISO |
| Money / qty | **right** | tabular-nums |
| Boolean | center | chip or icon+label |
| Actions | **right** | ghost icons / menu |

### Interaction

| Event | Behavior |
|-------|----------|
| Row click | Navigate to detail (if `read`) |
| Action click | `stopPropagation` — no row nav |
| Hover | Soft muted wash; actions more visible |
| Selected | primary soft + 3px left bar |
| Delete | ConfirmDialog always |

### StatusChip map

| State | Tone |
|-------|------|
| Draft | slate / neutral |
| Proposed | indigo |
| Approved | mint / success |
| Rejected | destructive |
| Active / Inactive | success / muted |
| Warning / Overdue | warning |

### FilterBar anatomy

```
[ Search ........ ] [ status ▾ ] [ filters ]   count   [ + Create ]
```

- Search debounce ~300ms  
- Empty (no data) ≠ empty (no matches) copy  
- Optional Table | Pipeline toggle for Sales Order  

### DataTable target API

```tsx
<DataTable
  density="crm"
  columns={columns}
  data={rows}
  isLoading={bool}
  isError={bool}
  empty={<EmptyState module="customer" />}
  onRowClick={(row) => navigate(...)}
  selection="none" | "single" | "multi"
  stickyHeader
  toolbar={<FilterBar />}
  footer={<Pagination />}
/>
```

Page authors configure columns + density + empty module — **no ad-hoc table restyles**.

### Table anti-patterns (banned)

- 12+ always-visible columns  
- Full-row status coloring  
- Tiny &lt;32px action hit targets  
- Delete without confirm  
- Raw `true`/`false` or ISO dates  
- Nested comfortable tables for line items  
- Module rainbow on every cell  
- Pagination without total/count  
- Clickable row without hover/focus affordance  

### Table a11y checklist

- Real table semantics (`th` scope)  
- Sortable headers announce state  
- Action aria-labels include entity name  
- Status not color-only  
- Contrast AA  
- Keyboard reaches actions without row-click-only  

---

## Page templates

### Index
`PageHeader` → `FilterBar` → `DataTable` (density crm) → pagination → delete confirm  

### Detail
`PageHeader` (edit/delete) → summary cards → related compact tables → history  

### Form
Loader shell → `PageHeader` → section cards → items compact table → actions → status modal (draft/propose)  

### Dashboard
Greeting → KPI row (module colors) → Recharts (chart tokens) → recent activity  

### Pipeline
Table | Pipeline toggle → stage columns → cards (amount + customer)  

### Auth / Landing
Expressive aurora mesh; portfolio-first; still on-token  

**Every page:** `data-ai-context` on outermost wrapper with `{ section, ... }`.

---

## Shell layout

```
┌─ aurora mesh background ─────────────────────────┐
│ ┌ glass sidebar ┐ ┌ glass topbar ──────────────┐ │
│ │ logo          │ │ search · notif · AI · user │ │
│ │ module tiles  │ ├────────────────────────────┤ │
│ │ nav groups    │ │ main (solid cards)         │ │
│ └───────────────┘ └────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## Content & voice

- Plain verbs: “Save draft”, “Propose”, “Approve”  
- Same action name in button → toast → activity log  
- Errors: what failed + how to fix  
- Empty: one sentence + one primary CTA  
- i18n: `react-intl`; keys both `en.json` and `id.json`  

---

## Anti-patterns (global bans)

| Ban | Why |
|-----|-----|
| Default zinc-only shadcn theme | Kills portfolio distinctiveness |
| Mint as global primary CTA | Confuses brand with success |
| Rainbow sidebar backgrounds | Breaks P1 |
| Emoji icons | Unprofessional |
| Placeholder-only form labels | A11y fail |
| Hover-only critical actions | Keyboard/touch fail |
| Dual UI kits long-term | Maintenance hell |
| Heavy liquid-glass on data tables | Readability fail |
| Animating layout width/height for polish | Jank / CLS |

---

## Quality bar (definition of done)

- [ ] Aurora identity obvious in ≤3s on dashboard  
- [ ] Module color on nav + page accent  
- [ ] CRM tables use DataTable + density rules  
- [ ] No orphaned old CSS kit on production path  
- [ ] WCAG AA text/controls  
- [ ] Focus rings visible  
- [ ] `prefers-reduced-motion` respected  
- [ ] Responsive 375 / 768 / 1280  
- [ ] `bun run check-types` passes  
- [ ] Portfolio screenshots: Login, Dashboard, Pipeline, Customer index  

---

## Implementation mapping

| Artifact | Path |
|----------|------|
| Theme / tokens | `apps/client/src/index.css` (Tailwind v4 `@theme`) |
| shadcn ui | `apps/client/src/components/ui/*` |
| Domain UI | `apps/client/src/components/*` |
| This master | `design-system/aurora-commerce/MASTER.md` |
| Page overrides | `design-system/aurora-commerce/pages/*.md` |
| Spec | `docs/superpowers/specs/2026-07-23-aurora-commerce-rebuild-design.md` |
| Context pack | `docs/plans/aurora-commerce/CONTEXT.md` |
| Old kit (delete after cutover) | `apps/client/src/ui/**`, obsolete colocated `*.css` |

---

## Pre-delivery checklist

- [ ] No emoji icons  
- [ ] `cursor-pointer` on clickable elements  
- [ ] Hover 150–300ms  
- [ ] Light text contrast ≥4.5:1  
- [ ] Focus visible  
- [ ] Reduced motion respected  
- [ ] Responsive 375 / 768 / 1024 / 1440  
- [ ] Tables: TP checklist (identity first, chips, money right, ≤8 cols, crm density)  

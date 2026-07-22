# Client CRM Redesign — Design Spec

**Date:** 2026-07-23  
**Status:** Approved  
**Scope:** Client-only visual redesign (`apps/client`)  
**Approach:** Foundation-first (tokens → icons → shell/UI kit → pages)

---

## 1. Intent

Redesign the ERP Sales client into a **modern, professional, colorful CRM**:

- Calm professional **blue** chrome (trust, SaaS CRM)
- **Colorful iOS-style module tiles** for navigation and KPIs
- Uniform design system (tokens + UI kit + page templates)
- SVG-only icons, theme-stable in light and dark mode

**Not in scope:** backend/API changes, new product features, Tailwind/HeroUI, dark-mode-first.

---

## 2. Product personality

| Axis | Choice |
|------|--------|
| Audience | Sales / field / ops teams using CRM daily |
| Tone | Professional, sharp, energetic |
| Signature | Colorful iOS module tiles on calm blue chrome |
| Avoid | Emerald-only brand, emoji icons, rainbow chrome, neon consumer UI |

---

## 3. Visual identity & tokens

### 3.1 Color roles (Professional Blue + Colorful Accents)

| Role | Token | Hex | Use |
|------|--------|-----|-----|
| Primary | `--color-primary-500` | `#2563EB` | Primary buttons, focus ring, active nav, links |
| Primary soft | `--color-primary-50` / `100` | blue tints | Selected rows, soft chips, hover fills |
| Deal / success | `--color-accent-500` | `#059669` | Revenue, approved, positive deltas |
| Surface 0 | `--color-surface-0` | `#F8FAFC` | Page background |
| Surface 1 | `--color-surface-1` | `#FFFFFF` | Cards, panels |
| Foreground | `--color-foreground` | `#0F172A` | Body text |
| Muted | `--color-muted` | slate | Secondary labels |
| Border | `--color-border` | `#E4ECFC` | Cool blue-gray borders |
| Danger | semantic | `#DC2626` | Destructive only |
| Warning | semantic | amber | Warnings only |
| Info | semantic | blue | Informational only |

**Migration note:** Existing `--color-accent-*` emerald scale becomes **deal/success**, not the primary brand. Introduce `--color-primary-*` blue scale as brand chrome. Update focus rings, primary buttons, and active nav to primary blue.

### 3.2 Module accent palette

Used for **module tiles, KPI icons, empty states** — not for global chrome.

| Module | Accent | Hex |
|--------|--------|-----|
| Customers | Pink | `#EC4899` |
| Orders | Blue | `#3B82F6` |
| Visits | Orange | `#F97316` |
| SKU / catalog | Violet | `#8B5CF6` |
| Programs / Planning | Teal | `#14B8A6` |
| Events | Fuchsia | `#D946EF` |
| Users / access | Indigo | `#6366F1` |
| Reports | Cyan | `#06B6D4` |
| Email CRM | Sky | `#0EA5E9` |
| Knowledge / AI | Violet–Indigo | `#8B5CF6` → `#6366F1` |

### 3.3 Typography

- **UI / headings:** Poppins 400–700
- **Dense body / tables (optional secondary):** Open Sans or system-ui
- **Base size:** ~15px (iOS-leaning scale already in tokens)
- No decorative display fonts in app chrome

### 3.4 Shape, depth, motion

| Token area | Direction |
|------------|-----------|
| Radius | Controls 8–12px; cards 16–20px; shell 16–24px; module tiles rx=16 @ 64px artboard |
| Glass | Frosted sidebar/topbar; solid cards for readability |
| Shadows | Soft slate; primary glow only on primary CTA |
| Motion | 150–250ms default; press scale ok; respect `prefers-reduced-motion` |
| Density | Dashboard-leaning (~7/10); touch targets ≥ 44px in shell |

### 3.5 Explicit anti-patterns

- Emerald as the only brand color
- Emoji as icons
- Random gradients on every surface
- Dark mode by default
- Mixing outline + filled icon styles without family rules
- `filter: invert()` on multi-color SVG tiles
- Recoloring module tiles via CSS for active/dark states

---

## 4. Icon system (SVG only)

### 4.1 Format decision

**Production icons = SVG only.**  
Raster/AI images are not used for nav or UI icons. Optional SVG preview sheet for design review is allowed.

### 4.2 Two families

| Family | Where | Look | Theme |
|--------|-------|------|-------|
| **A. Module tiles** | Sidebar modules, KPIs, empty states, quick actions | Complex iOS app-icon: gradient rounded square + multi-layer white glyph | Baked colors — identical light/dark |
| **B. Chrome controls** | Back, close, chevron, search, menu, edit, delete | Simple mono outline/filled | `currentColor` / slate tokens |

### 4.3 Module tile recipe

```
viewBox 0 0 64 64
- rounded rect rx=16, unique 2-stop gradient
- top shine overlay (white 0.30 → 0)
- multi-part white glyph (opacity layers 1 / 0.85 / 0.7)
- optional small accent detail (check, pin, spark)
```

Rules:

1. Unique gradient per module (no shared hue pairs)
2. Glyph must read at 20–28px sidebar size
3. No `currentColor` on tile bg or main glyph
4. No CSS invert for dark mode
5. Unique gradient IDs per file (`g-customer`, not `g`)
6. Representational metaphor only

### 4.4 Nav inventory (representational)

| Nav item | Icon key | Metaphor | Gradient direction |
|----------|----------|----------|--------------------|
| Dashboard | `navDashboard` | Rising bar chart | Emerald → green |
| Reports | `navReports` | Chart + trend | Cyan → teal |
| Region | `navRegion` | Map / territory | Blue → indigo |
| Area | `navArea` | Grid / zones | Sky → blue |
| Customer | `navCustomer` | People | Pink → rose |
| Outlet | `navOutlet` | Storefront | Amber → orange |
| SKU Category | `navSkuCategory` | Tags | Violet → purple |
| SKU | `navSku` | Package | Purple → indigo |
| Sales Order | `navSalesOrder` | Document + check | Blue → primary |
| Email CRM | `navEmailCrm` **(new)** | Envelope + spark | Sky → blue |
| Visit Log | `navVisit` | Clipboard + pin | Orange → deep orange |
| **Planning** | `navPlanning` **(new primary)** | **Calendar + checklist** | **Teal → emerald** |
| Event Proposal | `navEvent` | Calendar star / ticket | Fuchsia → purple |
| Users | `navUsers` | User group | Indigo → blue |
| Access Control | `navRoles` | Shield + key | Slate-blue → indigo |
| Activity Logs | `navActivity` | Timeline list | Slate → blue-gray |
| Notifications | `navNotifications` | Bell + badge | Red → rose |
| Knowledge Base | `navKnowledge` **(new)** | Book + spark | Violet → indigo |
| AI Admin | `navAi` **(new)** | Sparkle / node | Indigo → violet |

### 4.5 Planning icon (explicit)

- **Key:** `navPlanning` (alias `navProgram` during migration)
- **Metaphor:** iOS planning board — teal→emerald tile, white calendar, checklist rows, accent check
- **Used for:** Programs group, Action Program pages, dashboard “New program”
- **Related domain glyphs:** `planningDocument`, `planningCalendar`, `planningBudget`

### 4.6 Registry & files

- Path: `apps/client/src/assets/icons/`
- Prefer `nav-*.svg` naming; temporary `chrome-nav-*` aliases ok during migration
- Typed registry: `apps/client/src/assets/icons.ts`
- Stop reusing Sales Order icon for Email CRM

---

## 5. Shell + UI kit

### 5.1 Shell

Keep floating iOS shell structure (`PrivateLayout`, sticky sidebar, topbar).

| Surface | Treatment |
|---------|-----------|
| Page bg | Cool blue-gray wash + faint primary tint |
| Sidebar / topbar | Frosted glass, border `#E4ECFC` |
| Active nav | Soft primary fill + primary text; **tile colors unchanged** |
| Content | Solid surface-1, radius 16–20px, soft shadow |
| Focus | Primary blue ring |

### 5.2 UI kit (`apps/client/src/ui/`)

Upgrade in place (plain CSS + tokens):

- Button: primary = blue; deal/success may use green; danger red; min height 40–44px
- Card: larger radius; optional module accent variant
- Input/Select/Textarea: cool borders, primary focus, error near field
- Chip: semantic + soft module variants + pipeline stage variants
- Table: CRM density system (see §6) — sticky header, status chips, row actions
- Modal: glass overlay, solid panel
- EmptyState: large module tile + CTA
- Icon: registry URLs; migrate off `solar:` placeholders over time
- **New/extended surfaces:** Pipeline board, chart theme tokens, filter bar, KPI strip (see §6–§8)

**Stack constraints:** No Tailwind, No HeroUI, No CSS-in-JS. Local UI kit only. Charts stay on **Recharts** with shared theme tokens.

---

## 6. CRM data surfaces — Table system

CRM work is table-heavy. Tables must feel **dense enough to scan**, not sparse marketing cards.

### 6.1 Density modes

| Mode | Token / class | Row min-height | Cell padding | Font | When |
|------|----------------|----------------|--------------|------|------|
| **Comfortable** | `.tbl--comfortable` (default for simple masters) | 48px | 12×16 | 13.5–14px | Region, Area, small lists |
| **CRM / default index** | `.tbl--crm` **(default for sales CRM indexes)** | 40px | 8×12 | 13px | Customer, Order, Visit, Email, Outlet |
| **Compact** | `.tbl--compact` | 32px | 6×10 | 12–12.5px | Line items, nested tables, reports |

Rules:

- Index pages for transactional CRM entities default to **`.tbl--crm`**
- Nested line-item tables default to **`.tbl--compact`**
- Touch/action hit areas stay ≥ 32px even in compact (icon buttons 32×32)
- No zebra stripes by default (noise); use hairline row borders + hover fill

### 6.2 Table anatomy

```
┌ Filter bar (search · status · date · owner · more)  [View: Table | Pipeline]
├ Sticky thead (uppercase micro-label, surface-2, freeze on scroll)
├ Body rows
│  ├ Leading: checkbox (bulk) optional
│  ├ Primary cell: entity name + optional subtitle (code, email)
│  ├ Status chip (semantic / stage)
│  ├ Money / date / owner columns (tabular nums for money)
│  └ Row actions (⋯ menu) — always last, right-aligned
├ Empty state (module tile + CTA) when 0 rows
└ Footer: selection count · pagination · page size
```

### 6.3 Table interaction rules

| Behavior | Spec |
|----------|------|
| Sticky header | Yes inside scroll container (`.tbl-wrapper` / `.m-table-card`) |
| Row hover | `surface-2` / soft primary tint |
| Active / selected row | `primary-50` fill + **3px primary left bar** (not green) |
| Clickable row | Entire row navigates to detail; actions column `stopPropagation` |
| Bulk select | Optional checkbox column; sticky selection bar when count > 0 |
| Sorting | Header button + chevron; sorted column uses primary text weight |
| Loading | Skeleton rows (same density), not full-page spinner only |
| Empty | Module EmptyState inside table card |
| Responsive | Horizontal scroll; freeze first column optional later (phase 5+) |
| Money | Right-align; `font-variant-numeric: tabular-nums` |
| Dates | Medium weight muted; relative + absolute tooltip optional |

### 6.4 Column patterns (CRM)

| Column type | Presentation |
|-------------|--------------|
| Entity | Bold name + muted secondary line (code / city / email) |
| Status / stage | Chip (see §8.1) — never raw enum string alone |
| Owner / assignee | Avatar 24px + name (or initials chip) |
| Amount | Right-aligned tabular currency |
| Pipeline stage | Chip colored by stage token |
| Health / priority | Dot + label (color not sole signal) |
| Actions | `RowActions` ⋯ only; max 1 visible icon button if critical |

### 6.5 Filter bar (above every CRM index)

- Height ~40–44px controls in one wrap row
- Search (debounced 300ms) + 1–4 filters + overflow “More filters”
- Active filter chips removable under the bar
- Right side: **view toggle** `Table | Pipeline` when pipeline applies
- Persist filters in URL query when cheap; otherwise local state

Implementation touchpoints: `Table.css`, `module-page.css` (`.m-table-card`), `page-system.css` (`.pg` filter bar), `ModulePage` / index pages.

---

## 7. CRM data surfaces — Chart system

Library: **Recharts** (already in Dashboard). Shared theme via CSS variables / a small chart theme object — no one-off hex in page files.

### 7.1 Chart color tokens

| Token | Role | Hex / source |
|-------|------|----------------|
| `--chart-1` | Primary series | `#2563EB` |
| `--chart-2` | Secondary series | `#06B6D4` |
| `--chart-3` | Tertiary | `#8B5CF6` |
| `--chart-4` | Quaternary | `#F97316` |
| `--chart-5` | Quinary | `#EC4899` |
| `--chart-positive` | Up / win | `#059669` |
| `--chart-negative` | Down / loss | `#DC2626` |
| `--chart-grid` | Grid lines | slate-200 / slate-800 dark |
| `--chart-axis` | Axis labels | muted |
| `--chart-tooltip-bg` | Tooltip | surface-1 + shadow |

Never encode meaning with color alone — tooltips + labels required.

### 7.2 Chart type map (CRM)

| Need | Chart | Notes |
|------|-------|-------|
| Revenue / orders over time | **Area** (primary fill 10–15% opacity) + line | Dashboard default |
| Compare categories (top customers, SKUs) | **Bar** (horizontal if many labels) | Max ~10 bars before “Other” |
| Stage conversion | **Funnel** or staged bar | Show % between stages as text |
| KPI vs target | **Bullet** or compact progress | Prefer text % always visible |
| Pipeline value by stage | Stacked bar or stage summary cards | Pair with pipeline board |
| Share of total | Donut (sparingly) | Always center total + legend |

Avoid: 3D, rainbow pie with >5 slices, animation >300ms on data charts.

### 7.3 Chart chrome

- Card header: title + period select + optional legend
- Tooltip: white/surface card, 12–13px, border cool, shadow-md
- Empty: “No data for this period” + clear filters CTA
- Loading: skeleton chart block (fixed height to avoid CLS)
- Height defaults: KPI spark 48px; dashboard main 280px; report 360px
- `prefers-reduced-motion`: disable series animation

---

## 8. CRM data surfaces — Pipeline UI

Pipeline is a first-class CRM view for **Sales Orders** (and later Email CRM / opportunities if modeled). Not every module needs it.

### 8.1 Stage model (visual)

Stages map to existing approval / business flow where possible:

| Stage key | Label (example) | Chip / column color |
|-----------|-----------------|---------------------|
| `draft` | Draft | slate / neutral |
| `proposed` | Proposed | info blue |
| `approved` | Approved / Won | deal green |
| `rejected` | Rejected / Lost | danger red |
| `in_progress` | In progress (visits/programs) | primary blue |
| custom module stages | … | from module accent soft fills |

Chips: soft bg + solid text/dot; **never color-only** (include label).

### 8.2 Pipeline board layout

```
┌ Filter bar (same as table)                    [Table | Pipeline]
├ Stage summary strip (count · total value per stage)
└ Horizontal board (scroll-x)
   ┌ Stage col ┐ ┌ Stage col ┐ ┌ Stage col ┐
   │ header    │ │ header    │ │ header    │
   │ count·sum │ │ count·sum │ │ count·sum │
   │ ┌ card ┐  │ │ ┌ card ┐  │ │           │
   │ │ deal │  │ │ │ deal │  │ │  empty    │
   │ └──────┘  │ │ └──────┘  │ │           │
   └───────────┘ └───────────┘ └───────────┘
```

### 8.3 Pipeline column

| Element | Spec |
|---------|------|
| Width | 280–300px fixed; board `overflow-x: auto` |
| Header | Stage name + count badge + optional sum (tabular money) |
| Header accent | 3px top border in stage color |
| Body | Vertical stack, gap 8px, padding 8–12px, surface-2 well |
| Empty column | Muted “No items” |

### 8.4 Pipeline card (deal / order card)

| Element | Spec |
|---------|------|
| Container | surface-1, radius 12px, border cool, shadow-xs; hover shadow-md |
| Title | Entity name, 1 line ellipsis, semibold |
| Subtitle | Customer / outlet / code, muted |
| Amount | Prominent tabular currency (deal green if positive) |
| Meta row | Owner avatar · date · optional priority dot |
| Footer | Stage chip (readonly on card) or days-in-stage |
| Click | Open detail |
| Drag (phase 5+) | Optional; if not implemented, stage change via detail/actions only |

**v1 (phases 4–5):** read-only board (no drag-drop required). Stage changes stay on detail/form.  
**v2 (later):** drag-drop + optimistic stage update if product asks.

### 8.5 View toggle

- Segmented control: `Table` | `Pipeline`
- Same filters feed both views
- Remember last view per module in localStorage (e.g. `view:sales-order`)
- Pipeline hidden if user lacks read permission or module has no stages

### 8.6 Where pipeline applies

| Module | Pipeline? | Notes |
|--------|-----------|-------|
| Sales Order | **Yes** | Primary showcase |
| Email CRM | Optional later | Thread status columns |
| Action Program / Event | Optional | Approval stages |
| Customer / SKU / Region | **No** | Table only |
| Visit Log | Optional list by status | Not full kanban unless needed |

---

## 9. Other CRM UI patterns

### 9.1 KPI strip

- 4–6 cards: icon tile (module color) + label + value + delta chip
- Delta: green up / red down + % text
- Loading: skeleton KPI
- Click-through to filtered index when useful

### 9.2 Status & semantic chips

| Variant | Use |
|---------|-----|
| `neutral` | Draft, unknown |
| `info` | Proposed, in review |
| `success` | Approved, won, active |
| `warning` | Due soon, partial |
| `danger` | Rejected, overdue, lost |
| `primary` | In progress / assigned to me |

Soft background + stronger label; 11–12px semibold; radius full.

### 9.3 Activity / timeline

- Vertical spine, 8px dots in primary/muted
- Relative time + actor + message
- Used on Dashboard + detail drawers

### 9.4 Detail header summary

- Title + status chip + key metrics inline (amount, owner, dates)
- Actions: Edit / Delete / Propose / Approve (permission-gated)

### 9.5 Empty, error, loading

| State | Pattern |
|-------|---------|
| Empty list | Module tile + title + primary CTA |
| Empty chart | Muted copy + adjust filters |
| Error | Inline alert + retry |
| Loading page | Skeleton layout matching final density (no layout jump) |

---

## 10. Page templates

1. **Index (table)** — header, filter bar, CRM table, pagination, permissions  
2. **Index (pipeline)** — same filters + stage strip + board (when enabled)  
3. **Detail** — back/edit/delete, summary metrics, related tables, approval/timeline  
4. **Form** — outer loader + inner form; draft/propose modal pattern retained  
5. **Dashboard** — KPI strip, charts (themed), activity, quick actions  
6. **Report** — filter bar + chart + compact/export table  

Every page keeps `data-ai-context` on the outermost wrapper.

---

## 11. Rollout phases

| Phase | Scope | Outcome |
|-------|--------|---------|
| 0 | Spec + design-system MASTER + CONTEXT pack | Frozen contract |
| 1 | Tokens: primary blue, module accents, shell vars, **chart + stage tokens** | Global foundation |
| 2 | Full SVG icon remake (nav + planning + email/knowledge/AI) + registry | Theme-stable iOS icons |
| 3 | Shell + UI kit + **table density variants + chips + filter bar** | Uniform chrome + CRM tables |
| 4 | Dashboard charts theme + **Sales Order table density + pipeline v1** + Customer index | Visual proof |
| 5 | Remaining modules; optional pipeline elsewhere; compact nested tables | Full consistency |
| 6 | Review + a11y + `bun run check-types` | Ship gate |

**Rate limit:** Prefer sequential Frontend phases or max 1–2 parallel subagents; avoid large parallel fan-out (API ~50 rpm).

---

## 12. Success criteria

- [ ] Primary chrome is professional blue; deal green only for success/revenue
- [ ] All sidebar module icons are representational iOS tiles with unique gradients
- [ ] Planning icon exists and is used for Action Program / Programs
- [ ] Email CRM, Knowledge, AI have dedicated icons
- [ ] Module tiles look the same in light and dark mode
- [ ] UI kit components use tokens only (no raw one-off hex in pages)
- [ ] **CRM indexes use `.tbl--crm` density; nested line items use compact**
- [ ] **Tables: sticky header, status chips, row actions, selected = primary bar**
- [ ] **Charts use shared `--chart-*` tokens; tooltips + labels (not color alone)**
- [ ] **Sales Order has Table | Pipeline toggle; pipeline v1 read-only board**
- [ ] Index/Detail/Form/Dashboard/Report share page-system patterns
- [ ] No emoji icons; no Tailwind/HeroUI introduced
- [ ] Contrast ≥ 4.5:1 for text; focus visible; reduced-motion respected
- [ ] Typecheck passes

---

## 13. Source of truth files

| Artifact | Path |
|----------|------|
| This spec | `docs/superpowers/specs/2026-07-23-client-crm-redesign-design.md` |
| Design system master | `design-system/erp-sales-crm/MASTER.md` |
| Orchestration context | `docs/plans/client-redesign/CONTEXT.md` |
| Tokens (implementation) | `apps/client/src/styles/tokens.css` |
| Icon registry | `apps/client/src/assets/icons.ts` |
| UI kit | `apps/client/src/ui/` |
| Table styles | `apps/client/src/ui/Table.css`, `styles/module-page.css` |
| Charts | Recharts + dashboard/report pages |

---

## 14. Approvals

| Decision | Status |
|----------|--------|
| Palette: Professional Blue + Colorful Accents | Approved |
| Approach: Foundation-first (A) | Approved |
| Icons: SVG iOS module tiles + planning icon | Approved |
| Shell + UI kit + phased rollout | Approved |
| Full design (Sections 1–4) | **Approved 2026-07-23** |
| **CRM tables, charts, pipeline UI (§6–§9)** | **Approved 2026-07-23** |
| Written spec + implementation plan | **Approved 2026-07-23** |

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
- Chip: semantic + soft module variants
- Table: CRM density, sticky header, status chips
- Modal: glass overlay, solid panel
- EmptyState: large module tile + CTA
- Icon: registry URLs; migrate off `solar:` placeholders over time

**Stack constraints:** No Tailwind, No HeroUI, No CSS-in-JS. Local UI kit only.

---

## 6. Page templates

1. **Index** — header, search, primary CTA, table/cards, pagination, permission gates  
2. **Detail** — back/edit/delete, summary cards, related sections, approval history when relevant  
3. **Form** — outer loader + inner form; draft/propose modal pattern retained  
4. **Dashboard** — KPI tiles (module icons), charts, activity, quick actions  

Every page keeps `data-ai-context` on the outermost wrapper.

---

## 7. Rollout phases

| Phase | Scope | Outcome |
|-------|--------|---------|
| 0 | Spec + design-system MASTER + CONTEXT pack | Frozen contract |
| 1 | Tokens: primary blue, module accents, shell vars | Global foundation |
| 2 | Full SVG icon remake (nav + planning + email/knowledge/AI) + registry | Theme-stable iOS icons |
| 3 | Shell (Sidebar/Topbar/PrivateLayout) + core UI kit | Uniform chrome |
| 4 | Dashboard + showcase modules (Customer, Sales Order) | Visual proof |
| 5 | Remaining modules polish | Full consistency |
| 6 | Review + a11y + `bun run check-types` | Ship gate |

**Rate limit:** Prefer sequential Frontend phases or max 1–2 parallel subagents; avoid large parallel fan-out (API ~50 rpm).

---

## 8. Success criteria

- [ ] Primary chrome is professional blue; deal green only for success/revenue
- [ ] All sidebar module icons are representational iOS tiles with unique gradients
- [ ] Planning icon exists and is used for Action Program / Programs
- [ ] Email CRM, Knowledge, AI have dedicated icons
- [ ] Module tiles look the same in light and dark mode
- [ ] UI kit components use tokens only (no raw one-off hex in pages)
- [ ] Index/Detail/Form/Dashboard share page-system patterns
- [ ] No emoji icons; no Tailwind/HeroUI introduced
- [ ] Contrast ≥ 4.5:1 for text; focus visible; reduced-motion respected
- [ ] Typecheck passes

---

## 9. Source of truth files

| Artifact | Path |
|----------|------|
| This spec | `docs/superpowers/specs/2026-07-23-client-crm-redesign-design.md` |
| Design system master | `design-system/erp-sales-crm/MASTER.md` |
| Orchestration context | `docs/plans/client-redesign/CONTEXT.md` |
| Tokens (implementation) | `apps/client/src/styles/tokens.css` |
| Icon registry | `apps/client/src/assets/icons.ts` |
| UI kit | `apps/client/src/ui/` |

---

## 10. Approvals

| Decision | Status |
|----------|--------|
| Palette: Professional Blue + Colorful Accents | Approved |
| Approach: Foundation-first (A) | Approved |
| Icons: SVG iOS module tiles + planning icon | Approved |
| Shell + UI kit + phased rollout | Approved |
| Full design (Sections 1–4) | **Approved 2026-07-23** |

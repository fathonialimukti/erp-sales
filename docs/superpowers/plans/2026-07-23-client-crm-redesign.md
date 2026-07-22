# Client CRM Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the ERP Sales client into a modern professional CRM with blue chrome, colorful iOS module tiles, CRM table density, themed charts, and a Sales Order pipeline view.

**Architecture:** Foundation-first client-only visual redesign. Tokens and chart/stage variables land first; SVG icon set and registry next; shell + UI kit (including table density) next; then Dashboard/Customer/Sales Order showcase including pipeline v1; remaining modules last. No backend changes.

**Tech Stack:** React 19, Vite, plain CSS + `apps/client/src/ui/`, local SVG icons, Recharts, TanStack Table/Query, react-intl, Jotai. No Tailwind, no HeroUI.

## Global Constraints

- Scope: `apps/client` only (no `apps/server`, no `packages/schemas` unless forced no-op)
- Primary brand: `#2563EB` (`--color-primary-*`); deal/success: `#059669` (not default CTA)
- Border cool: `#E4ECFC`
- Icons: SVG only; Family A module tiles (baked colors); Family B chrome mono
- Planning icon: `navPlanning` (calendar+checklist, teal→emerald); alias `navProgram`
- New icons: `navEmailCrm`, `navKnowledge`, `navAi`, `navPlanning`
- Tables: `.tbl--comfortable` | `.tbl--crm` (CRM indexes) | `.tbl--compact` (line items)
- Selected row: `primary-50` + 3px primary left bar
- Charts: Recharts + `--chart-*` tokens; tooltips + labels required
- Pipeline: Sales Order showcase; Table|Pipeline toggle; v1 read-only (no drag)
- Keep `data-ai-context` on page wrappers
- Rate limit: max 1–2 parallel Frontend subagents
- Spec: `docs/superpowers/specs/2026-07-23-client-crm-redesign-design.md`
- Design system: `design-system/erp-sales-crm/MASTER.md`
- Context: `docs/plans/client-redesign/CONTEXT.md`
- Design is FROZEN — do not re-brainstorm palette/icons

---

## File map

| Path | Responsibility |
|------|----------------|
| `apps/client/src/styles/tokens.css` | Primary blue scale, module accents, chart/stage tokens, shell vars, focus ring |
| `apps/client/src/index.css` | Global focus ring / imports if needed |
| `apps/client/src/assets/icons/*.svg` | Module tile + chrome SVGs |
| `apps/client/src/assets/icons.ts` | Typed registry + aliases |
| `apps/client/src/constants/nav-menu.ts` | Wire new icon keys |
| `apps/client/src/ui/Button.css` | Primary → blue |
| `apps/client/src/ui/Table.css` | Density variants + selected primary bar |
| `apps/client/src/ui/Chip.css` | Semantic + stage chips |
| `apps/client/src/ui/Card.css` | Radius / border cool |
| `apps/client/src/styles/page-system.css` | Filter bar, view toggle hooks |
| `apps/client/src/styles/module-page.css` | Table card density alignment |
| `apps/client/src/layouts/PrivateLayout.css` | Page wash / shell primary tint |
| `apps/client/src/components/Sidebar.css` | Active nav primary (not emerald) |
| `apps/client/src/pages/Dashboard.tsx` + `.css` | Chart theme tokens |
| `apps/client/src/pages/sales-order/*` | CRM table density + pipeline v1 |
| `apps/client/src/pages/customer/*` | CRM table density showcase |
| `apps/client/src/locales/en.json` + `id.json` | Pipeline/view toggle strings only if new UI copy |
| `docs/plans/client-redesign/CONTEXT.md` | Session log after each phase |

---

### Task 1: Design tokens (primary blue, modules, charts, stages)

**Files:**
- Modify: `apps/client/src/styles/tokens.css`
- Modify: `apps/client/src/index.css` (focus ring if still accent-green)
- Update: `docs/plans/client-redesign/CONTEXT.md` session log

**Interfaces:**
- Produces: `--color-primary-50`…`900`, `--color-primary-500=#2563EB`, `--color-ring`, `--color-border=#E4ECFC`, `--module-*`, `--chart-1`…`5`, `--chart-positive`, `--chart-negative`, `--chart-grid`, `--chart-axis`, `--chart-tooltip-bg`, `--stage-draft|proposed|approved|rejected|in-progress` (+ bg variants)
- Consumes: existing surface/slate/radius/space scales (keep)

- [ ] **Step 1: Add primary blue scale and rebind brand aliases**

In `tokens.css` `:root`, add (exact hexes):

```css
/* Brand primary (professional blue) */
--color-primary-50:  #eff6ff;
--color-primary-100: #dbeafe;
--color-primary-200: #bfdbfe;
--color-primary-300: #93c5fd;
--color-primary-400: #60a5fa;
--color-primary-500: #2563eb;
--color-primary-600: #1d4ed8;
--color-primary-700: #1e40af;
--color-primary-800: #1e3a8a;
--color-primary-900: #1e3a8a;

--color-ring: var(--color-primary-500);
--color-border: #e4ecfc;
--color-border-strong: #cfd9f0;
```

Keep `--color-accent-*` emerald scale but document in comment: **deal/success only**, not primary CTA.

- [ ] **Step 2: Add module, chart, and stage tokens**

```css
/* Module accents (tiles/KPIs only) */
--module-customers: #ec4899;
--module-orders: #3b82f6;
--module-visits: #f97316;
--module-sku: #8b5cf6;
--module-planning: #14b8a6;
--module-events: #d946ef;
--module-users: #6366f1;
--module-reports: #06b6d4;
--module-email: #0ea5e9;
--module-knowledge: #8b5cf6;

/* Charts */
--chart-1: #2563eb;
--chart-2: #06b6d4;
--chart-3: #8b5cf6;
--chart-4: #f97316;
--chart-5: #ec4899;
--chart-positive: #059669;
--chart-negative: #dc2626;
--chart-grid: var(--color-slate-200);
--chart-axis: var(--color-slate-500);
--chart-tooltip-bg: var(--color-surface-1);

/* Pipeline / approval stages */
--stage-draft: var(--color-slate-500);
--stage-draft-bg: var(--color-slate-100);
--stage-proposed: var(--color-state-info);
--stage-proposed-bg: var(--color-state-info-bg);
--stage-approved: var(--color-state-success);
--stage-approved-bg: var(--color-state-success-bg);
--stage-rejected: var(--color-state-danger);
--stage-rejected-bg: var(--color-state-danger-bg);
--stage-in-progress: var(--color-primary-500);
--stage-in-progress-bg: var(--color-primary-50);
```

Dark mode: set `--chart-grid` to slate-700 if `.dark` block exists.

- [ ] **Step 3: Point global focus ring at primary**

In `index.css`, ensure:

```css
:where(button, a, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Smoke-check app loads**

Run: `cd apps/client && bun run build` (or dev compile)  
Expected: no CSS import errors.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/styles/tokens.css apps/client/src/index.css docs/plans/client-redesign/CONTEXT.md
git commit -m "feat(client): add CRM primary blue, chart, and stage tokens"
```

---

### Task 2: Module tile SVG set + registry + nav wiring

**Files:**
- Create/overwrite: `apps/client/src/assets/icons/nav-*.svg` (and keep/alias chrome-nav files as needed)
- Create: `nav-planning.svg`, `nav-email-crm.svg`, `nav-knowledge.svg`, `nav-ai.svg` (minimum new)
- Remake all sidebar module tiles per inventory in spec §4.4
- Modify: `apps/client/src/assets/icons.ts`
- Modify: `apps/client/src/constants/nav-menu.ts`

**Interfaces:**
- Produces: `icons.navPlanning`, `icons.navEmailCrm`, `icons.navKnowledge`, `icons.navAi`; aliases `navProgram → navPlanning`
- Consumes: Vite SVG URL imports pattern already in `icons.ts`

- [ ] **Step 1: Implement tile recipe for each nav icon**

Every Family A icon:

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="g-planning" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2DD4BF"/>
      <stop offset="1" stop-color="#0F766E"/>
    </linearGradient>
    <linearGradient id="shine-planning" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g-planning)"/>
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#shine-planning)"/>
  <!-- white multi-layer calendar + checklist glyph; must read at 20–28px -->
</svg>
```

Rules: unique gradient ids per file; no `currentColor` on tile; representational glyph; unique hue pair per module.

**Planning (`nav-planning.svg`):** teal→emerald, calendar body + 2–3 checklist rows + accent check.  
**Email CRM:** sky→blue, envelope + small spark.  
**Knowledge:** violet→indigo, book + spark.  
**AI:** indigo→violet, sparkle/node.

Remake remaining nav tiles (dashboard, reports, region, area, customer, outlet, sku-category, sku, sales-order, visit, event, users, roles, activity, notifications) to same recipe if not already compliant.

- [ ] **Step 2: Register in `icons.ts`**

```ts
import navPlanning from "./icons/nav-planning.svg";
import navEmailCrm from "./icons/nav-email-crm.svg";
import navKnowledge from "./icons/nav-knowledge.svg";
import navAi from "./icons/nav-ai.svg";
// ...existing imports; prefer nav-* paths; keep chrome-nav imports as aliases if files not renamed

export const icons = {
  // ...
  navPlanning,
  navProgram: navPlanning, // migration alias
  navEmailCrm,
  navKnowledge,
  navAi,
  // ...
} as const;
```

- [ ] **Step 3: Wire `nav-menu.ts`**

```ts
// email CRM — stop reusing sales-order icon
{ name: "nav.email_crm", icon: icons.navEmailCrm, href: "/email-crm", permission: "email-crm@read" },
// programs group
{ name: "nav.programs", icon: icons.navPlanning, children: [
  { name: "nav.action_program", icon: icons.navPlanning, href: "/action-program", permission: "action-program@read" },
  { name: "nav.event_proposal", icon: icons.navEvent, href: "/event-proposal", permission: "event-proposal@read" },
]},
// system
{ name: "nav.knowledge_base", icon: icons.navKnowledge, href: "/knowledge-base", permission: "knowledge-base@read" },
// ai admin
{ name: "nav.ai_admin", icon: icons.navAi, href: "/ai-admin", permission: "ai-admin@access" },
```

- [ ] **Step 4: Visual check**

Open sidebar expanded + collapsed; confirm tiles crisp at ~20–36px and identical in light/dark.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/assets/icons apps/client/src/assets/icons.ts apps/client/src/constants/nav-menu.ts
git commit -m "feat(client): remake iOS module nav icons including planning"
```

---

### Task 3: Shell + core UI kit recolor

**Files:**
- Modify: `apps/client/src/ui/Button.css`
- Modify: `apps/client/src/ui/Card.css` (border/radius if needed)
- Modify: `apps/client/src/ui/Chip.css`
- Modify: `apps/client/src/components/Sidebar.css`
- Modify: `apps/client/src/layouts/PrivateLayout.css`
- Modify: any Topbar CSS that hardcodes emerald

**Interfaces:**
- Consumes: `--color-primary-*`, `--color-border`
- Produces: primary buttons blue; active nav primary soft fill; shell cool border

- [ ] **Step 1: Button primary → blue**

```css
.btn--primary {
  background: var(--color-primary-500);
  color: white;
  box-shadow: 0 1px 2px 0 rgba(37, 99, 235, 0.20), inset 0 1px 0 0 rgba(255, 255, 255, 0.10);
}
.btn--primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}
.btn--primary:active:not(:disabled) {
  background: var(--color-primary-700);
}
.btn:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

Keep `.btn--success` on deal green.

- [ ] **Step 2: Sidebar active state → primary**

Replace emerald active fills/borders with:

```css
/* example — match existing selectors */
.ios-sb__row--active {
  background: var(--color-primary-50);
  color: var(--color-primary-700);
}
.dark .ios-sb__row--active {
  background: rgba(37, 99, 235, 0.15);
  color: var(--color-primary-200);
}
```

Do **not** recolor module tile `<img>` icons.

- [ ] **Step 3: Shell page wash**

In `PrivateLayout.css`, bias background toward cool blue-gray + faint primary (keep glass structure). Ensure borders use `var(--color-border)`.

- [ ] **Step 4: Chip semantic variants**

Ensure chips support: `neutral | info | success | warning | danger | primary` using state/primary tokens (soft bg + solid label).

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/ui/Button.css apps/client/src/ui/Chip.css apps/client/src/ui/Card.css \
  apps/client/src/components/Sidebar.css apps/client/src/layouts/PrivateLayout.css
git commit -m "feat(client): recolor shell and UI kit to primary blue"
```

---

### Task 4: Table density system + filter bar hooks

**Files:**
- Modify: `apps/client/src/ui/Table.tsx` (optional `density` prop)
- Modify: `apps/client/src/ui/Table.css`
- Modify: `apps/client/src/styles/module-page.css`
- Modify: `apps/client/src/styles/page-system.css`

**Interfaces:**
- Produces: classes `.tbl--comfortable`, `.tbl--crm`, `.tbl--compact`; selected row uses primary bar
- Consumes: table markup already using `.tbl`, `.tbl__*`

- [ ] **Step 1: Density CSS**

```css
/* CRM default density */
.tbl--crm {
  font-size: 13px;
}
.tbl--crm .tbl__head-cell {
  padding: 8px 12px;
}
.tbl--crm .tbl__cell {
  padding: 8px 12px;
}
.tbl--crm .tbl__body-row {
  min-height: 40px;
}

.tbl--compact {
  font-size: 12.5px;
}
.tbl--compact .tbl__head-cell,
.tbl--compact .tbl__cell {
  padding: 6px 10px;
}
.tbl--compact .tbl__body-row {
  min-height: 32px;
}

.tbl--comfortable .tbl__head-cell,
.tbl--comfortable .tbl__cell {
  padding: 12px 16px;
}
.tbl--comfortable .tbl__body-row {
  min-height: 48px;
}

/* Selected / active — primary, not emerald */
.tbl__body-row--active {
  background: var(--color-primary-50);
}
.tbl__body-row--active::before {
  background: var(--color-primary-500);
}
.dark .tbl__body-row--active {
  background: rgba(37, 99, 235, 0.12);
}

.tbl__cell--money {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
```

Default CRM indexes should add `tbl--crm` on the `<table>` or wrapper.

- [ ] **Step 2: Optional React API**

```tsx
// Table.tsx — if a root Table component exists:
interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  density?: "comfortable" | "crm" | "compact";
}
// className includes `tbl tbl--${density ?? "crm"}` for index usage
```

If table is composed of `Table/THead/...` primitives only, document that pages pass `className="tbl tbl--crm"`.

- [ ] **Step 3: Filter bar + view toggle styles in page-system**

```css
.pg__view-toggle {
  display: inline-flex;
  padding: 2px;
  border-radius: var(--radius-lg);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
}
.pg__view-toggle-btn {
  min-height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-muted);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}
.pg__view-toggle-btn--active {
  background: var(--color-surface-1);
  color: var(--color-primary-700);
  box-shadow: var(--shadow-xs);
}
```

- [ ] **Step 4: Align `.m-table-card` row padding with CRM density**

Update `module-page.css` table overrides so they don’t fight `.tbl--crm`.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/ui/Table.css apps/client/src/ui/Table.tsx \
  apps/client/src/styles/module-page.css apps/client/src/styles/page-system.css
git commit -m "feat(client): add CRM table density variants and view toggle styles"
```

---

### Task 5: Dashboard chart theme + KPI polish

**Files:**
- Modify: `apps/client/src/pages/Dashboard.tsx`
- Modify: `apps/client/src/pages/Dashboard.css`

**Interfaces:**
- Consumes: `--chart-*` tokens via `getComputedStyle` or CSS variables in SVG props
- Produces: themed Area/Bar charts; KPI deltas use positive/negative tokens

- [ ] **Step 1: Chart color helper**

```ts
const chartColors = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  positive: "var(--chart-positive)",
  negative: "var(--chart-negative)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
};
```

Use these for `Area` stroke/fill, `Bar` fill, `CartesianGrid` stroke, axis tick fill. Tooltip content style: background `var(--chart-tooltip-bg)`, border `var(--color-border)`.

- [ ] **Step 2: Fixed chart heights**

Main chart container `height: 280px` (or existing); skeleton same height to avoid CLS.

- [ ] **Step 3: KPI delta chips**

Positive → success/chart-positive; negative → danger/chart-negative; include % text.

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/pages/Dashboard.tsx apps/client/src/pages/Dashboard.css
git commit -m "feat(client): theme dashboard charts with CRM chart tokens"
```

---

### Task 6: Customer index CRM density showcase

**Files:**
- Modify: `apps/client/src/pages/customer/CustomerIndexPage.tsx` (and related CSS if any)
- Possibly: shared `ModulePage` table className

**Interfaces:**
- Consumes: `.tbl--crm`, status chips, primary buttons
- Produces: Customer index as density reference

- [ ] **Step 1: Apply `tbl--crm` to customer list table**

Ensure table/wrapper class includes `tbl--crm`. Status columns use Chip variants. Primary “Create” uses blue button.

- [ ] **Step 2: Filter bar layout**

Search + filters use page-system filter bar spacing; no layout jump on load (skeleton rows).

- [ ] **Step 3: Commit**

```bash
git add apps/client/src/pages/customer
git commit -m "feat(client): apply CRM table density on customer index"
```

---

### Task 7: Sales Order table density + pipeline v1

**Files:**
- Modify: `apps/client/src/pages/sales-order/SalesOrderIndexPage.tsx`
- Create: `apps/client/src/pages/sales-order/SalesOrderPipeline.tsx` (or colocated component)
- Create: `apps/client/src/pages/sales-order/SalesOrderPipeline.css`
- Modify: `apps/client/src/locales/en.json`, `id.json` (view toggle + pipeline empty strings)
- Possibly: detail page unchanged for stage edits

**Interfaces:**
- Consumes: list query already used by index (`trpcClient.salesOrder.list` or existing key)
- Produces: view toggle; pipeline board grouped by `approvalStatus` (or existing status field); localStorage `view:sales-order`

- [ ] **Step 1: Add i18n keys (both locales)**

```json
"sales_order.index.view_table": "Table",
"sales_order.index.view_pipeline": "Pipeline",
"sales_order.pipeline.empty_stage": "No items",
"sales_order.pipeline.summary": "{count} orders · {total}"
```

(Use project key naming if slightly different — mirror existing `sales_order.*` prefix.)

- [ ] **Step 2: View state on index**

```tsx
type IndexView = "table" | "pipeline";
const [view, setView] = useState<IndexView>(() => {
  const saved = localStorage.getItem("view:sales-order");
  return saved === "pipeline" ? "pipeline" : "table";
});
const selectView = (v: IndexView) => {
  setView(v);
  localStorage.setItem("view:sales-order", v);
};
```

Render segmented control using `.pg__view-toggle`.

- [ ] **Step 3: Table mode**

Apply `tbl--crm`. Status column = Chip mapped from approval status → stage tokens. Money columns `.tbl__cell--money`.

- [ ] **Step 4: Pipeline board (read-only v1)**

```tsx
// Group list items by approvalStatus: DRAFT | PROPOSED | APPROVED | REJECTED
// Columns 280–300px; header with stage color top border, count, optional sum
// Card: document number/name, customer, amount, date; onClick → detail route
// No drag-drop in v1
```

CSS classes e.g. `.pipe`, `.pipe__col`, `.pipe__card` in `SalesOrderPipeline.css` using tokens only.

- [ ] **Step 5: Same filters for both views**

Search/status filters apply before grouping; empty stages show muted empty copy.

- [ ] **Step 6: Manual test**

- Toggle Table/Pipeline persists after refresh  
- Cards open detail  
- Light/dark: stage colors readable; module icons unchanged  

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/pages/sales-order apps/client/src/locales/en.json apps/client/src/locales/id.json
git commit -m "feat(client): sales order CRM table density and pipeline v1"
```

---

### Task 8: Remaining modules polish (batch)

**Files:**
- Index/detail/form pages under: `area`, `region`, `outlet`, `sku`, `sku-category`, `visit-log`, `email-crm`, `action-program`, `event-proposal`, `users`, `access-control`, `activity-logs`, `reports`, etc.
- Nested line-item tables → `.tbl--compact`
- Small masters (region/area) → `.tbl--comfortable` or crm if preferred consistency

**Interfaces:**
- Consumes: tokens, icons, table densities, chips, primary buttons

- [ ] **Step 1: Sweep indexes**

For each index: table density class, primary CTA blue, status chips, no emerald hardcodes, correct module icon in empty states if present.

- [ ] **Step 2: Nested tables**

Sales order items / outlet lists inside detail → `.tbl--compact`.

- [ ] **Step 3: Reports**

Use chart tokens if charts present; compact tables for dense reports.

- [ ] **Step 4: Commit per logical group** (avoid one giant commit)

```bash
git commit -m "feat(client): apply CRM density and tokens to remaining modules"
```

---

### Task 9: Review, a11y, typecheck

**Files:**
- Read-only review of touched client files
- Modify only if fixes required

- [ ] **Step 1: Typecheck**

```bash
bun run check-types
```

Expected: pass (or only pre-existing unrelated errors documented).

- [ ] **Step 2: Checklist from MASTER**

- Primary chrome blue; green only success/deal  
- Nav tiles unique + planning/email/knowledge/ai wired  
- Tiles stable light/dark  
- `.tbl--crm` on CRM indexes; compact on line items  
- Sales Order Table|Pipeline works  
- Focus visible; no emoji icons; no Tailwind  

- [ ] **Step 3: Optional Code Reviewer subagent**

Ponytail-review on tokens, icons registry, Table.css, SalesOrder pipeline.

- [ ] **Step 4: Update CONTEXT session log + final commit if fixes**

```bash
git commit -m "fix(client): CRM redesign review fixes"
```

---

## Execution notes for orchestrator

1. Dispatch **Frontend Engineer** only (client-only). Backend not required.
2. Prefer **sequential tasks 1→7**; Task 8 can be one Frontend pass; Task 9 last.
3. Max 1–2 parallel subagents (e.g. Task 5 Dashboard ∥ Task 6 Customer only after Task 4 lands).
4. Embed frozen contract from `docs/plans/client-redesign/CONTEXT.md` in every subagent prompt.
5. Do not re-open design debates.

---

## Spec coverage (self-review)

| Spec area | Task |
|-----------|------|
| Primary blue + deal green tokens | 1 |
| Module accents, chart, stage tokens | 1 |
| iOS SVG tiles + planning/email/knowledge/ai | 2 |
| Shell + UI kit recolor | 3 |
| Table density + filter/view toggle styles | 4 |
| Dashboard charts | 5 |
| Customer showcase | 6 |
| Sales Order pipeline v1 | 7 |
| Remaining modules | 8 |
| Success criteria / a11y / types | 9 |

**Placeholder scan:** none intentional. Pipeline drag-drop explicitly out of v1.  
**Gap:** Email CRM pipeline deferred (spec optional later) — not in Task 7.

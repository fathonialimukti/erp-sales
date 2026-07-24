# Aurora Commerce — Design System Law

**Status:** Approved design law (implementation authority for agents + engineers)  
**Date:** 2026-07-24  
**Audience:** Frontend Engineer, Full-Stack orchestrator, Code Reviewer  
**Stack:** React 19 · Vite · Tailwind v4 · shadcn (`radix-mira`, zinc, CSS variables) · Lucide · **Motion** (`motion/react`)  
**Canonical tokens:** `apps/client/src/index.css`  
**Canonical motion:** `apps/client/src/lib/motion.ts`  
**Not:** a marketing brand PDF. This file is **do / don’t law** for shipping UI.

---

## 1. Market & thesis

### Target market

Corporate field-sales / CRM operators and managers (B2B). Portfolio viewers include hiring managers and buyers who judge **trust + scan speed**, not consumer flash.

### What corporate users notice (design inputs)

| Attracts attention | Why |
|--------------------|-----|
| At-a-glance KPI strip | Answers “are we ok?” in <2s |
| Professional blue + high-contrast black/white text | Trust / ops legitimacy |
| Clear page hierarchy | Title → filters → table without hunting |
| Dense scannable tables | Real work is lists + filters + bulk actions |
| Status chips (color + icon + label) | Approval state pops without reading the row |
| Predictable module wayfinding | Same chrome recipe across domains |
| Money formatting | Right-align + `tabular-nums` |
| Subtle premium polish | Soft elevation, 150–250ms motion — expensive, not playful |

| Rejects | Why |
|---------|-----|
| Purple/pink “AI template” gradients as brand | Toy / non-enterprise |
| Dark-by-default dense forms | Fatigue on long order/entry sessions |
| Rainbow on every cell | Color loses meaning |
| Pie / donut / 3D chart decoration | Slow parse, gimmicky |
| Gray text (any shade) | Forbidden — weak, unfinished |
| Neon cyber / brutalist / playful skins | Wrong industry vernacular |

### Brand thesis

**Aurora Commerce** is a **trust-first sales CRM** that is boardroom-ready and still modern.

- **Light work surfaces** for long sessions (app default).
- **Safer corporate primary** — shadcn-native Azure blue (not indigo, not mint).
- **Module signal accents** only where wayfinding needs them.
- Portfolio catchiness from **KPI hierarchy + status clarity + module plates + chart warmth**, not from a neon CTA or full-dark product skin.

### Signature (one memorable system)

**Accented operational hierarchy**

- Module-colored eyebrow + left rail on `PageHeader`
- Soft module plates on nav active / KPI icons / empty tints
- Semantic status chips on data

Same recipe every domain → product reads as one designed system.

### Anti-signature (banned)

- Full dark app as default
- Module rainbow on table body cells
- Mint / module / chart color as primary CTA
- Decorative gradients inside forms
- 3D charts, radial gauges, pie/donut as default analytics

---

## 2. Color law

### Source of truth

| Source | Authority |
|--------|-----------|
| `apps/client/src/index.css` (`:root` / `.dark` OKLCH + `@theme inline`) | **Canonical** |
| Semantic Tailwind classes (`bg-primary`, `text-muted-foreground`, …) | **Only usage mode in components** |
| `apps/client/src/styles/colors.ts` hex map | **Legacy — do not extend** |
| Agent notes citing indigo `#4F46E5` as primary | **Superseded** by this law + live CSS |

**Rule:** no raw `#hex` / `rgb()` in new JSX for brand or chrome. Use CSS variables / semantic classes / `var(--module-*)` via `moduleCssVar()`.

### Primary — Aurora Azure (safer corporate)

Lock to the **live shadcn prefilled primary** (do not invent a second brand blue):

```css
--primary: oklch(0.5 0.134 242.749);
--primary-foreground: oklch(0.977 0.013 236.62);
```

| Role | Class / token | Notes |
|------|---------------|--------|
| Brand CTA | `bg-primary` `text-primary-foreground` | Default `Button` variant only for primary actions |
| Links / emphasis | `text-primary` | Not for body copy |
| Soft brand wash | `bg-primary/10` or `hover:bg-primary/80` | Selected / proposed / soft fills |
| Sidebar brand cue | `--sidebar-primary` | Active module when no module accent |

**Readable name:** Aurora Azure  
**Chroma policy:** **safer corporate** — keep ~`0.134`, do not push to neon (~0.18+) for portfolio “pop”. Catchiness lives elsewhere (KPI, chips, module plates).

**One primary action per view region.** Never mint, module, or chart gold as global CTA.

### Surfaces (light app default)

| Role | Classes / tokens |
|------|------------------|
| Canvas | `bg-background` (+ optional `aurora-mesh` on shell) |
| Work stage | `bg-card` / main: `bg-card/60 border-border/60 rounded-2xl shadow-sm` |
| Text (body) | `text-foreground` — **black** (near-black OKLCH), never gray |
| Secondary / meta text | `text-muted-foreground` resolves to **bold Aurora Azure** (chromatic), never gray |
| On dark / inverse surfaces | white / `text-primary-foreground` |
| Quiet fills | `bg-muted` `bg-secondary` (fills may be soft; **text on them must not be gray**) |
| Borders | `border-border` |
| Focus ring | `ring-ring` / focus-visible utilities from shadcn |

Dark tokens exist for marketing shells / system preference later. **Product default = light.**

### Semantic (not brand)

| Meaning | Direction | Use |
|---------|-----------|-----|
| Success | mint ≈ `#10B981` / `success` classes | Approved, positive delta, money + |
| Destructive | shadcn `--destructive` | Reject, delete, field errors |
| Warning | amber (chart-adjacent) | Caution only — not CTA |
| Info | primary soft | System info, non-alarm |

**Must define** `--success` / `--success-foreground` (and `@theme` maps) in `index.css` if missing — code already uses `text-success`, `bg-success/15`.

### Approval chip map (frozen)

| Status | Visual |
|--------|--------|
| Draft | Neutral plate + **black** label (never gray text) |
| Proposed | Primary soft (`bg-primary/10 text-primary`) |
| Approved | Success (`bg-success/15 text-success`) |
| Rejected | Destructive soft |

Always **icon + label**. Never color alone.

### Module spectrum (wayfinding flare)

Keys: `customer` · `outlet` · `order` · `visit` · `sku` · `planning` · `event` · `user` · `report` · `email` · `knowledge` · `ai`  
Helper: `moduleCssVar()` in `apps/client/src/types/module.ts` → `var(--module-{key})`.

**Allowed surfaces only**

1. `PageHeader` left bar + eyebrow  
2. Nav active wash + 3px accent (`NavModuleTile`)  
3. KPI / summary icon plates  
4. Empty-state tint (optional)

**Forbidden:** table body cells, primary buttons, long body text, every badge on a page.

**Wash recipe (frozen):**

```txt
background: color-mix(in srgb, var(--module-X) 14%, transparent)  /* KPI/summary plates; nav ~12–16% */
color: var(--module-X)
```

**Hue intents** (define as OKLCH in `index.css` — currently consumed but not defined in source):

| Module | Hue intent | Feel |
|--------|------------|------|
| customer | ~250 | Accounts |
| outlet | ~200 | Locations |
| order | ~242 (near primary) | Money path |
| visit | ~160 | Field |
| sku | ~85 (warm, chart-adjacent) | Catalog |
| planning | ~280 | Programs |
| event | ~20 | Events |
| user | ~270 | Access |
| report | ~230 | Analytics |
| email | ~210 | Inbox |
| knowledge | ~140 | Docs |
| ai | ~300 | Assistant accent only — **not brand** |

Also map `--color-module-*` in `@theme inline` if Tailwind utilities like `text-module-ai` are used.

### Charts

Keep warm amber ladder (`--chart-1` … `--chart-5`) for dashboard demo contrast against Azure primary.

- Prefer **bar / line / area** (length + 2D position — corporate scan speed).  
- Avoid pie / donut / 3D / radial gauges as defaults.  
- Color encodes **category**, not magnitude.

### Color do / don’t

| Do | Don’t |
|----|-------|
| `bg-primary` for main actions | Mint / module / chart as CTA |
| Status = chip + icon + label | Color-only meaning |
| Module accents on chrome plates | Rainbow table cells |
| Semantic classes only | New hex in components |
| Black / white / bold color text only | Gray text of any kind (`text-gray-*`, `text-slate-*`, gray `muted-foreground`) |

---

## 3. Typography · radius · density · motion

### Type

| Role | Law |
|------|-----|
| Family | **Inter Variable** only (`--font-sans` / `font-heading`) — no second display face in app |
| Page title | `font-heading text-2xl font-semibold tracking-tight` |
| KPI value | `text-2xl font-semibold tabular-nums` |
| Section titles | `text-base` / `text-lg` semibold |
| Body / table | `text-sm` default · **black** `text-foreground` |
| Captions / meta | `text-xs` · **bold Azure** `text-muted-foreground` (token is chromatic, not gray) |
| Eyebrow | `text-xs font-semibold uppercase tracking-wide` (+ module color when set) |
| Buttons | shadcn button scale (compact mira density) |

### Text color hard ban (frozen)

**No gray text anywhere in the product.**

| Allowed | Forbidden |
|---------|-----------|
| Black body: `text-foreground` | `text-gray-*`, `text-slate-*`, `text-zinc-*`, `text-neutral-*`, `text-stone-*` |
| White on dark / inverse: `text-background`, `text-primary-foreground`, pure white | Faded gray opacity text for hierarchy (`text-foreground/50`, `/60`, `/70` as gray stand-in) |
| Bold color secondary: `text-muted-foreground` (maps to Aurora Azure), `text-primary`, `text-success`, `text-destructive`, `text-warning`, module accents | Gray `muted-foreground` token values; slate hex / `--color-slate-*` for labels |

`--muted-foreground` in `index.css` **must stay chromatic** (Azure), never neutral gray. Hierarchy is weight / size / bold color — not gray wash.

### Radius

| Token | Use |
|-------|-----|
| `--radius: 0.625rem` | Base (inputs, buttons) |
| `rounded-xl` | Icon plates, empty cards, nav rows |
| `rounded-2xl` | Main stage, large cards |
| `rounded-lg` | Smaller summary plates |

### Density

**Dashboard-dense** (corporate work, not marketing pages):

- Shell padding `p-3`; main `p-4 md:p-6`
- Stack gaps mostly `gap-3` / `gap-4`
- Avoid large marketing whitespace inside authenticated app
- Touch targets ≥ 44px on mobile chrome; desktop may use compact shadcn control heights

### Numbers

- Money & quantities: `tabular-nums`
- Money in tables: **right-aligned**
- KPI deltas: `+/-` with success/destructive + trend icon

### Motion (Motion library — required)

**Package:** `motion` (`motion/react`). Prefer shared presets — do not invent one-off spring physics for CRM chrome.

| Source | Role |
|--------|------|
| `apps/client/src/lib/motion.ts` | **Canonical presets** — durations, easings, variants, `getMotionProps` |
| `components/motion/PageTransition.tsx` | Route outlet enter (`pageEnter`) |
| `components/motion/Stagger.tsx` | KPI / card grids (`staggerContainer` + `StaggerItem`) |
| Tailwind / `tw-animate-css` | Micro UI only: overlays, accordion, spin, pulse |
| CSS `transition-*` | Hover / focus / shell width — pair with `motion-reduce:transition-none` |

#### Preset durations (seconds)

| Token | Value | Use |
|-------|-------|-----|
| `durations.page` | `0.24` | Route enter |
| `durations.shell` | `0.2` | Sidebar / light fades |
| `durations.item` | `0.22` | Stagger children |

**Easing:** `easings.out` = `[0.16, 1, 0.3, 1]` (ease-out cubic, snappy settle, **no overshoot**).

#### Enter language (frozen)

- Prefer **opacity + `translateY(8px)`** only (`pageEnter`, `staggerItem`).
- Stagger: `staggerChildren: 0.045`, `delayChildren: 0.04`, **cap ~8 children**.
- Always pair Motion components with `useReducedMotion()` + `getMotionProps(reduced)`.

```tsx
const reduced = useReducedMotion();
<motion.div variants={pageEnter} {...getMotionProps(reduced)} />
```

When reduced: `initial: false` → skip enter animation (still land on `visible`).

#### Where Motion is allowed

| Surface | Pattern |
|---------|---------|
| Route change | `PageTransition` (shell already wraps outlet) |
| KPI / summary grids | `Stagger` + `StaggerItem` |
| Sidebar chrome | `motion` + shell duration / fade presets |
| Login / 404 / marketing | `motion` ok; can be slightly richer than app |
| Pipeline / board columns | Subtle enter only — no continuous bounce |

#### Where CSS / tw-animate is enough

| Surface | Pattern |
|---------|---------|
| Dialog / sheet / dropdown / popover | shadcn `animate-in` / `animate-out` |
| Loading spinners | `animate-spin` |
| Skeletons | `animate-pulse` |
| Hover / focus rings | Tailwind `transition-colors` / `duration-150–200` |

#### Motion do / don’t

| Do | Don’t |
|----|-------|
| Import presets from `@/lib/motion` | One-off springs / bounce on every page |
| `useReducedMotion` + `getMotionProps` | Ignore reduced motion |
| Opacity + small Y (≤8px) | Layout thrash (`width`/`height`/`top` animate) |
| Stagger ≤ ~8 items | Stagger entire data tables |
| Shell / page / KPI enter only | Scroll-hijack, parallax theater in CRM app |
| Feedback on async (spinner, toast) | Instant mute after click with no state |
| `motion-reduce:animate-none` on CSS micro | Decorative loops in product chrome |

---

## 4. Layout architecture

### Shell (`PrivateLayout`)

```txt
aurora-mesh canvas
├── Sidebar (module nav, active wash)
└── column (offset for sidebar)
    ├── Topbar
    └── main stage: rounded-2xl border bg-card/60 p-4 md:p-6 shadow-sm
        └── PageTransition → page
```

Overlays (notification, AI, search, user menu) sit outside the stage — **one avatar menu surface at a time**.

### Page recipes

#### Index

1. `PageHeader` (`module`, title, description, primary action)  
2. `FilterBar`  
3. `DataTable` (crm density)  
4. Pagination  
5. `ConfirmDialog` for destructive  

#### Detail

1. `PageHeader` + back  
2. Summary / hero cards (module icon plates)  
3. Optional KPI strip  
4. Related compact table  
5. History / `ApprovalTimeline` when workflowed  

#### Form (compact CRM — frozen)

```txt
NavButtonGroup (Back [+ future nav])
PageHeader (module + left icon; no back; no primary actions)
form (gap-3)
  FormSection…
  FormSection…
  footer actions (right-aligned; Save / Propose)
```

| Piece | Law |
|-------|-----|
| Page shell | `flex flex-col gap-3 pt-1 pb-6` |
| Form stack | `gap-3` (not marketing `gap-6`) |
| Nav | `NavButtonGroup` **above** header — not `PageHeader onBack` |
| Header | filled gradient `PageHeader`; module auto-icon; **no** save/propose in header |
| Sections | `FormSection` only (dense card; not loose `Card` + `px-6 pt-6`) |
| Fields | labels `text-xs`; controls prefer `h-8`; grids `gap-3` |
| Actions | bottom of form, `justify-end`, `size="sm"`; draft → propose when staged |
| Dates | `DatePicker` clear **inside** field chrome |

1. Outer loading skeleton  
2. `NavButtonGroup` + `PageHeader`  
3. `FormSection`s with clear labels  
4. Field errors near inputs  
5. Footer actions right-aligned

#### Dashboard

1. `PageHeader`  
2. KPI row (typically 4)  
3. Primary chart (line/bar)  
4. Secondary action lists / module shortcuts  

```txt
[module bar] Title                         [primary] [outline]
KPI   KPI   KPI   KPI
FilterBar
┌──────────────────────────────────────────────────┐
│ table · status chips · money right-aligned       │
└──────────────────────────────────────────────────┘
```

### Landing / login (portfolio-only flare)

Landing and auth may use stronger mesh, blobs, and marketing hierarchy. **Do not** copy marketing density into CRM index/detail/form pages.

---

## 5. Component law

### Prefer

| Layer | Path |
|-------|------|
| Primitives | `@/components/ui/*` (shadcn) |
| Domain | `PageHeader`, `NavButtonGroup`, `FormSection`, `FilterBar`, `DataTable`, `KpiCard`, `StatusChip`, `EmptyState`, `ConfirmDialog`, `NavModuleTile` |
| Utils | `cn()` from `@/lib/utils` |
| Module typing | `ModuleKey`, `moduleCssVar()` |

### Icons

| Kind | Rule |
|------|------|
| Lucide | Chrome only (actions, chevrons, status icons) |
| Custom SVG plates | Nav modules only |
| Emoji | **Never** as icons |

### Buttons

| Variant | When |
|---------|------|
| `default` (primary) | One main action per region (Create, Save, Propose) |
| `outline` / `secondary` | Secondary |
| `ghost` | Tertiary / icon chrome |
| `destructive` | Danger only (soft destructive style ok) |
| Link | Inline navigation emphasis |

No success-colored primary create button.

### Empty / loading / error

Every list and major panel needs:

- Loading (skeleton / spinner)  
- Empty (`EmptyState` + next action)  
- Error (clear recovery)

Empty states may take a light module tint; keep dashed border + calm copy.

### Data tables

- Status via `StatusChip`, not raw colored text  
- No module fill on entire rows by default  
- Sort/filter via `FilterBar` patterns  
- Dense rows ok; preserve readable padding  

### Forms

- Visible labels (`FormField` / shadcn `Label`)  
- Errors adjacent to fields  
- No placeholder-only labels  
- Don’t paint form chrome with module gradients  

### i18n & AI context

- All user-visible strings: `react-intl` in **both** `en.json` and `id.json`  
- Page root: `data-ai-context={JSON.stringify({ section, ... })}`  

### Permission-aware UI

- Menu / actions driven by `resource@action` permissions  
- Hide or disable unauthorized actions consistently — don’t leave dead primary CTAs  

---

## 6. Hard bans (ship blockers)

1. Flat gray “wired-only” pages with no hierarchy  
2. Mint / module / chart as global CTA  
3. Module colors on table body cells  
4. Raw hex/rgb brand colors in new JSX  
5. Pie / donut / 3D as default analytics  
6. Cloning unfinished legacy pages as the visual ideal  
7. Second design system outside this law + `index.css`  
8. Emoji icons  
9. Dark-by-default product chrome for dense CRM work  
10. AI purple/pink gradient as brand identity  
11. Ad-hoc Motion springs / large travels / staggers on tables instead of `@/lib/motion` presets  

---

## 7. Token gaps to close (implementation follow-ups)

Documented so agents don’t invent ad-hoc values:

| Gap | Action |
|-----|--------|
| `--module-*` used widely, not defined in source CSS | Add OKLCH module tokens + `@theme` color maps in `index.css` |
| `text-success` / `bg-success/*` used; may lack theme wiring | Add `--success` / `--success-foreground` + `@theme` |
| `styles/colors.ts` hex map | Mark deprecated; do not add keys; prefer CSS vars |
| Frontend agent “indigo `#4F46E5`” | Align agent docs to Aurora Azure primary in this law |
| Legacy adapters under `components/*` mid-migration | New UI → `@/components/ui/*` + domain recipes |

**This law file does not ship CSS.** Frontend Engineer implements gaps when requested.

---

## 8. Agent handoff

### Who owns craft

| Role | Ownership |
|------|-----------|
| Frontend Engineer | All `apps/client` UI; must follow this law + `ui-ux-pro-max` for polish |
| Full-Stack Engineer | Orchestrates only; does not implement UI |
| Code Reviewer | Flags ban violations / flat shells / wrong CTA colors |

### Conflict order

1. **This law** (Aurora Commerce tokens + recipes + bans)  
2. **Live `index.css` tokens**  
3. **`ui-ux-pro-max`** craft (density, a11y, hierarchy)  
4. Existing pages for **data/permission wiring only** — not as the visual bar if flat  

### Pre-delivery checklist (UI)

- [ ] Semantic colors only; primary = Azure CTA  
- [ ] Module accents only on allowed chrome  
- [ ] Page recipe matches Index / Detail / Form / Dashboard  
- [ ] Motion uses `@/lib/motion` + reduced-motion; no ad-hoc bounce  
- [ ] Status chips icon+label; money `tabular-nums`  
- [ ] Empty + loading + error present  
- [ ] i18n en + id  
- [ ] Focus rings; reduced motion respected  
- [ ] No ban list violations  
- [ ] pro-max search run for non-trivial UI (or justify skip)

---

## 9. Reference map (repo)

| Concern | Location |
|---------|----------|
| Tokens | `apps/client/src/index.css` |
| Motion presets | `apps/client/src/lib/motion.ts` |
| Page / stagger wrappers | `apps/client/src/components/motion/*` |
| shadcn config | `apps/client/components.json` (`style: radix-mira`, `baseColor: zinc`) |
| Module keys | `apps/client/src/types/module.ts` |
| Page header | `apps/client/src/components/PageHeader.tsx` |
| KPI | `apps/client/src/components/KpiCard.tsx` |
| Status | `apps/client/src/components/StatusChip.tsx` |
| Nav accent | `apps/client/src/components/NavModuleTile.tsx` |
| Shell | `apps/client/src/layouts/PrivateLayout.tsx` |
| UI primitives | `apps/client/src/components/ui/*` |
| Frontend agent | `.github/agents/frontend-engineer.agent.md` (align primary note to this law) |

---

## 10. One-line summary

> **Aurora Commerce:** corporate-trust CRM on shadcn zinc + **safer Azure primary**; light dense work surfaces; module signal plates for wayfinding; Motion presets for page/KPI enter; status and KPIs carry the portfolio “wow” — never rainbow tables or neon brand.

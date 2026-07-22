# Design System Master File — ERP Sales CRM

> **LOGIC:** When building a specific page, first check `design-system/erp-sales-crm/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below + the approved spec.

---

**Project:** ERP Sales CRM  
**Generated:** 2026-07-23 06:37:01  
**Approved overrides:** 2026-07-23 (see below)  
**Category:** SaaS CRM  
**Design Dials:** Variance 6/10 | Motion 5/10 | Density 7/10  
**Spec:** `docs/superpowers/specs/2026-07-23-client-crm-redesign-design.md`  
**Context:** `docs/plans/client-redesign/CONTEXT.md`  
**Stack:** plain CSS + `apps/client/src/ui/` — **no Tailwind, no HeroUI**  
**Icons:** local SVG only (Family A module tiles + Family B chrome)

### Approved product rules (override generated defaults)

- **Primary brand = blue `#2563EB`** — primary buttons, focus ring, active nav
- **Green `#059669` = deal/success only** — not default CTA
- **Signature:** colorful iOS module tiles on calm blue chrome
- **Planning icon:** `navPlanning` (calendar+checklist, teal→emerald)
- **New icons:** `navEmailCrm`, `navKnowledge`, `navAi`, `navPlanning`
- Module tiles: baked SVG colors, stable light/dark; no invert filters

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#2563EB` | `--color-primary-500` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#3B82F6` | `--color-secondary` |
| Deal / success | `#059669` | `--color-accent-500` |
| Background | `#F8FAFC` | `--color-surface-0` |
| Card | `#FFFFFF` | `--color-surface-1` |
| Foreground | `#0F172A` | `--color-foreground` |
| Muted fill | `#F1F5FD` | `--color-muted-fill` |
| Border | `#E4ECFC` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| Ring | `#2563EB` | `--color-ring` |

**Color Notes:** Professional blue chrome + deal green + colorful module accents only on tiles/KPIs

### Module accents (tiles / KPIs — not chrome)

| Module | Hex |
|--------|-----|
| Customers | `#EC4899` |
| Orders | `#3B82F6` |
| Visits | `#F97316` |
| SKU | `#8B5CF6` |
| Planning | `#14B8A6` |
| Events | `#D946EF` |
| Users | `#6366F1` |
| Reports | `#06B6D4` |
| Email CRM | `#0EA5E9` |
| Knowledge / AI | `#8B5CF6` → `#6366F1` |

### Typography

- **Heading Font:** Poppins
- **Body Font:** Open Sans
- **Mood:** modern, professional, clean, corporate, friendly, approachable
- **Google Fonts:** [Poppins + Open Sans](https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');
```

### Spacing Variables

*Density: 7/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button = brand BLUE (not green) */
.btn--primary {
  background: #2563EB; /* var(--color-primary-500) */
  color: white;
  min-height: 40px;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: background 150ms ease, box-shadow 150ms ease, transform 100ms ease;
  cursor: pointer;
}

.btn--primary:hover:not(:disabled) {
  background: #1d4ed8; /* primary-600 */
}

/* Deal/success actions may use green — not default primary */
.btn--success {
  background: #059669;
  color: white;
}

/* Secondary Button */
.btn--secondary {
  background: transparent;
  color: #2563EB;
  border: 1px solid #E4ECFC;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #2563EB;
  outline: none;
  box-shadow: 0 0 0 3px #2563EB20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Glassmorphism

**Keywords:** Frosted glass, transparent, blurred background, layered, vibrant background, light source, depth, multi-layer

**Best For:** Modern SaaS, financial dashboards, high-end corporate, lifestyle apps, modal overlays, navigation

**Key Effects:** Backdrop blur (10-20px), subtle border (1px solid rgba white 0.2), light reflection, Z-depth

### Page Pattern

**Pattern Name:** Enterprise Gateway

- **Conversion Strategy:** Path selection (I am a...). Mega menu navigation. Trust signals prominent.
- **CTA Placement:** Contact Sales (Primary) + Login (Secondary)
- **Section Order:** 1. Hero (Video/Mission), 2. Solutions by Industry, 3. Solutions by Role, 4. Client Logos, 5. Contact Sales

---

## Motion

**Stagger List** (Standard) — Trigger: load or scroll | Duration: 300-450ms | Easing: `back.out(1.4)`

```js
gsap.from('.grid-item', { opacity: 0, scale: 0.92, y: 16, duration: 0.4, stagger: { each: 0.06, from: 'start', grid: 'auto' }, ease: 'back.out(1.4)' });
```

**Framework notes:** grid: 'auto' lets GSAP infer rows/columns from a CSS grid layout for a natural wave stagger

- ✅Icon system (project)

### Family A — Module tiles
- SVG 64×64, rx=16 gradient + shine + multi-layer white glyph
- Baked colors (identical light/dark)
- Unique gradient IDs per file; representational metaphors
- Keys: navDashboard, navReports, navRegion, navArea, navCustomer, navOutlet, navSkuCategory, navSku, navSalesOrder, **navEmailCrm**, navVisit, **navPlanning**, navEvent, navUsers, navRoles, navActivity, navNotifications, **navKnowledge**, **navAi**

### Family B — Chrome controls
- Mono outline/filled via currentColor (back, close, chevron, search, edit, delete)

### Forbidden for icons
- Emoji · invert filters on tiles · recoloring tiles for active/dark · sharing one icon across unrelated modules

---

## Anti-Patterns (Do NOT Use)

- ❌ Excessive animation
- ❌ Dark mode by default
- ❌ Emerald-only brand / green as default primary button
- ❌ Tailwind / HeroUI
- ❌ Raw one-off hex in pages when a token exists

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use local SVG module tiles / chrome icons
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Primary chrome is blue; green only for success/deal
- [ ] Module nav icons are unique representational iOS tiles
- [ ] Planning / Email CRM / Knowledge / AI icons exist and are wired
- [ ] Tiles identical in light and dark
- [ ] No emojis used as icons (local SVG instead)
- [ ] Icons from project registry (`assets/icons.ts`), not ad-hoc remote sets
## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

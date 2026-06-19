# ERP App Remodel — Full Plan (post-foundation)

> Status: foundation done (HeroUI removed, design tokens, `ui/` primitives, shell, Dashboard, Sales Order sample feature shipped).
> Next: remodel every remaining CRUD feature to the new visual + interaction standard.

---

## 1. Visual / UX system (already established)

- **Style**: enterprise professional, minimalist, 60-30-10 color rule.
- **Palette**: 60% neutral surface (`--color-surface-0..3`, slate-50/100/200), 30% slate chrome (`--color-slate-50..950`), 10% emerald accent (`--color-accent-500 #10b981`).
- **Typography**: Inter (UI) + JetBrains Mono (numbers/IDs).
- **Effects**: subtle borders, layered shadows (`shadow-sm` for cards, `shadow-md` for popovers), 200ms transitions.
- **No emoji icons** — `@iconify/react` (`solar:*` set, `mdi:*` for domain).
- **No `className` on HeroUI components** (HeroUI already removed).
- **Every page wrapper** carries `data-ai-context={JSON.stringify({ section, ... })}`.

## 2. Component conventions (locked)

### `ui/` primitives (already shipped)

`Button`, `Card` (+ `CardHeader/Body/Title/Description`), `Input`, `Textarea`, `Select` (+ `SelectItem`), `SelectSearch`, `FormDatePicker`, `Checkbox`, `Chip`, `Modal` (+ `ModalContent/Header/Body/Footer`), `Dropdown` (+ `DropdownTrigger/Menu/Item/Separator`), `Pagination`, `Spinner`, `Skeleton`, `EmptyState`, `Toast` + `useToast`, `Avatar`, `Table` (+ `TableHead/Header/Body/Row/Cell`), `Tooltip`, `Separator`, `Label`, `FieldError`, `FormField`, `ListBox`, `cn`.

### `components/` (already shipped)

`Navbar`, `Sidebar`, `PageHeader`, `SelectSearch`, `FormDatePicker`, `ImageUploadField`, `ApprovalHistory`, `EntityPhoto`, `ProtectedRoute`, `AiAssistant`.

### Page templates (locked)

**Index page**: search + table + pagination + delete modal + empty state.

**Detail page**: `<PageHeader>` + sections (info, related, approval history) + action bar.

**Form page**: outer loader + inner form + modal state machine (`'idle' | 'confirm-draft' | 'confirm-propose' | 'loading' | 'success' | 'error'`) + i18n.

### Sales Order Form reactivity lesson (locked)

TanStack Form's `form.state.values` reads **do not subscribe**. Use:

```tsx
<form.Subscribe selector={(s) => s.values.items ?? []}>
  {(items) => /* render with re-render on change */}
</form.Subscribe>
```

Handlers read fresh state via `form.state.values` at click time, not from a stale closure.

### CSS strategy

- Default: Tailwind utilities (matching `ui/` + tokens).
- Sales Order Form: plain CSS file `SalesOrderFormPage.css` (per-page, BEM `.so-*`) — only because of complex grid + popover positioning. No other page needs this.

## 3. i18n convention (locked)

- `en.json` + `id.json` in `apps/client/src/locales/`.
- Keys: `<domain>.<page>.<key>` (e.g. `customer.form.title_create`).
- Both locale files must be updated in the same commit.

## 4. Remodel sequence (13 domains, ordered by dependency)

| # | Domain | Depends on | Pages |
|---|--------|-----------|-------|
| 1 | Region | — | Index, Detail, Form |
| 2 | Area | Region | Index, Detail, Form |
| 3 | Customer | Area | Index, Detail, Form (with contacts sub-list) |
| 4 | Outlet | Customer, Area | Index, Detail, Form |
| 5 | SKU Category | — | Index, Detail, Form |
| 6 | SKU | SKU Category | Index, Detail, Form |
| 7 | Invoice | Sales Order, Customer | Index, Detail, Form |
| 8 | Visit Log | Customer, Outlet | Index, Detail, Form |
| 9 | Action Program | — | Index, Detail, Form (with photo upload, approval) |
| 10 | Event Proposal | Action Program, Customer | Index, Detail, Form (multi-step, approval) |
| 11 | Users | — | Index, Detail, Form |
| 12 | Roles | — | Index, Form |
| 13 | Notifications + Activity Logs | — | Index |

## 5. Per-domain remodel checklist

1. Read the existing `IndexPage/DetailPage/FormPage` to inventory what's there.
2. Schema: confirm `packages/schemas/src/<domain>.ts` has `*FormSchema` + `update*Schema` with `currentId`.
3. Server: confirm `apps/server/src/routers/<domain>.ts` has `list/get/create/update/delete` with `hasPermission` middleware.
4. Index page: rebuild to template.
5. Detail page: rebuild to template.
6. Form page: rebuild to template.
7. i18n: add `<domain>.*` keys to both `en.json` + `id.json`.
8. Sidebar: confirm permission string is set.
9. Smoke: navigate, list, search, paginate, create, edit, delete, permission gating.

## 6. Cross-cutting polish (after domains)

- Sidebar nav restructure (group: Master Data / Sales / Operations / Admin).
- Landing page redesign.
- Login page refresh.
- Notifications bell in Navbar (badge count).
- Activity log filters (date range, resource, action).
- Global search (Cmd+K) → tRPC `search.global` endpoint.

## 7. Verification (final gate)

- `bun run check-types` — zero errors.
- `bun run lint` — zero warnings.
- Playwright smoke test per page.
- `bun run build` — clean.
- Visual QA: light + dark, 375/768/1024/1440.

## 8. Open risks / watch-outs

- **Sales Order Form reactivity**: keep `<form.Subscribe>` pattern. Do NOT revert to `form.getFieldValue()`.
- **Dropdown clipping**: any future form using `SelectSearch` inside a card must have `overflow: visible` on the card root.
- **Trash icon**: use the symmetric 5-stroke SVG (lid line + body path + 2 vertical handles + top opening line).
- **Grid alignment**: for item rows, use `align-items: end` on grid, `display: flex; flex-direction: column` on each cell.
- **tRPC list limits**: never exceed 100 on list queries.
- **CSS leakage**: Sales Order Form CSS is `SalesOrderFormPage.css` only — do not move it to global.

---

## 9. Tailwind → Regular CSS Migration (Full App)

> **Goal**: Remove Tailwind CSS entirely. Every TSX gets a co-located `.css` file (BEM-scoped, 60-30-10 tokens, animations, interactive states). The app becomes an impressive, modern dashboard with rich micro-interactions.

### 9.1 Design System — 60-30-10 Rule (Mandatory)

| Ratio | Role | Tokens | Usage |
|-------|------|--------|-------|
| **60%** | Neutral surfaces | `--color-surface-0..3`, `--color-slate-50..200` | Page bg, card bg, table stripes, sunken areas |
| **30%** | Chrome & text | `--color-slate-300..950`, `--color-foreground`, `--color-muted`, `--color-border` | Sidebar, navbar, borders, body text, headings |
| **10%** | Brand accent | `--color-accent-50..900` (emerald `#10b981`) | CTAs, active states, badges, links, focus rings, icons |

**State colors** (success/warning/danger/info) are **semantic only** — they never compete with the brand accent.

### 9.2 CSS Architecture — Co-located Files

**Pattern**: Every `.tsx` gets a sibling `.css` file, imported via `import "./ComponentName.css"`.

```
src/
  index.css                          ← Global resets + token imports (NO Tailwind)
  styles/
    tokens.css                        ← 60-30-10 design tokens (already exists, keep)
    animations.css                    ← Shared keyframes (fadeIn, slideUp, pulse, shimmer, scaleIn)
    utilities.css                     ← Tiny helper classes (.sr-only, .truncate, .cursor-pointer)
  components/
    Navbar.tsx                        ← Navbar.css
    Sidebar.tsx                       ← Sidebar.css
    PageHeader.tsx                    ← PageHeader.css
    AiAssistant/
      AiAssistant.tsx                 ← AiAssistant.css
  layouts/
    PrivateLayout.tsx                 ← PrivateLayout.css
    PublicLayout.tsx                  ← PublicLayout.css
  ui/
    Button.tsx                        ← Button.css
    Card.tsx                          ← Card.css
    Input.tsx                         ← Input.css
    Modal.tsx                         ← Modal.css
    Table.tsx                         ← Table.css
    ... (every ui primitive)
  pages/
    Dashboard.tsx                     ← Dashboard.css
    LoginPage.tsx                     ← LoginPage.css
    LandingPage.tsx                   ← LandingPage.css
    NotFoundPage.tsx                  ← NotFoundPage.css
    RouteErrorPage.tsx                ← RouteErrorPage.css
    region/
      RegionIndexPage.tsx             ← RegionIndexPage.css
      RegionDetailPage.tsx            ← RegionDetailPage.css
      RegionFormPage.tsx              ← RegionFormPage.css
    area/                             ← (same pattern)
    customer/                         ← (same pattern)
    outlet/                           ← (same pattern)
    sku/                              ← (same pattern)
    sku-category/                     ← (same pattern)
    sales-order/
      SalesOrderIndexPage.tsx         ← SalesOrderIndexPage.css
      SalesOrderDetailPage.tsx        ← SalesOrderDetailPage.css
      SalesOrderFormPage.tsx          ← SalesOrderFormPage.css (already exists)
    invoice/                          ← (same pattern)
    visit-log/                        ← (same pattern)
    action-program/                   ← (same pattern)
    event-proposal/                   ← (same pattern)
    users/                            ← (same pattern)
    access-control/
      RolesIndexPage.tsx              ← RolesIndexPage.css
      RoleFormPage.tsx                ← RoleFormPage.css
    activity-logs/
      ActivityLogsIndexPage.tsx       ← ActivityLogsIndexPage.css
      ActivityLogDetailPage.tsx       ← ActivityLogDetailPage.css
```

### 9.3 BEM Naming Convention

Each CSS file uses a **domain prefix** + BEM to prevent style leakage:

| File | Prefix | Example classes |
|------|--------|-----------------|
| `Dashboard.css` | `.dash-` | `.dash-card`, `.dash-card__icon`, `.dash-card--accent` |
| `Sidebar.css` | `.sidebar-` | `.sidebar-nav`, `.sidebar-nav__item`, `.sidebar-nav__item--active` |
| `Button.css` | `.btn-` | `.btn`, `.btn--primary`, `.btn--ghost`, `.btn__icon` |
| `RegionIndexPage.css` | `.reg-` | `.reg-page`, `.reg-table`, `.reg-table__row--hover` |
| `SalesOrderFormPage.css` | `.so-` | `.so-form`, `.so-card`, `.so-field` (already exists) |

**Rule**: No class without a prefix. No bare `.card` or `.button`. This guarantees zero cross-file collisions.

### 9.4 Shared Animation Library (`animations.css`)

```css
/* Entrance animations */
@keyframes fadeIn        { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp       { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideDown     { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes scaleIn       { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes slideInLeft   { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideInRight  { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }

/* Continuous animations */
@keyframes pulse         { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
@keyframes shimmer       { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes spin          { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes bounceIn      { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.05); } 80% { transform: scale(0.95); } 100% { transform: scale(1); opacity: 1; } }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 9.5 Interactive Micro-Animations (Per-Component)

Every component gets purposeful animations — not decoration, but **feedback**:

| Component | Animation | Detail |
|-----------|-----------|--------|
| **Button** | `transition: all 150ms` | Hover: bg shift + subtle shadow lift. Active: scale(0.97) press. Loading: spinner replaces text. |
| **Card** | `transition: box-shadow 200ms, transform 200ms` | Hover: shadow lifts from `shadow-sm` → `shadow-md`. Never scale-on-hover (layout shift rule). |
| **Table row** | `transition: background 150ms` | Hover: `surface-2` bg. Active row: accent-50 bg + left border accent-500. |
| **Sidebar item** | `transition: background 150ms, color 150ms` | Active: accent bg + white text. Hover: surface-2 bg. |
| **Modal** | `animation: scaleIn 200ms ease-out` | Overlay: `fadeIn 150ms`. Content: `scaleIn 200ms`. Close: reverse via `animation-direction: reverse`. |
| **Toast** | `animation: slideInRight 250ms ease-out` | Success: green accent bar. Error: red bar. Auto-dismiss slides out. |
| **Dropdown** | `animation: slideDown 150ms ease-out` | Menu appears from trigger point. |
| **Input focus** | `transition: border-color 150ms, box-shadow 150ms` | Focus: accent-500 border + accent-500/20 ring. |
| **Chip** | `transition: background 150ms` | Hover: slight bg shift. |
| **Pagination** | `transition: background 150ms` | Active page: accent bg. Hover: surface-2. |
| **Page entrance** | `animation: slideUp 250ms ease-out` | Staggered: cards appear with 50ms delay each via `animation-delay`. |
| **Skeleton** | `animation: shimmer 1.5s infinite` | Linear gradient sweep. |
| **Empty state** | `animation: fadeIn 300ms` | Icon + text appear together. |
| **Notification popover** | `animation: slideDown 200ms ease-out` | Drops from bell icon. |
| **Dashboard stats** | `animation: slideUp staggered` | Each stat card: `animation-delay: nth * 80ms`. |
| **Delete confirm** | `animation: scaleIn 200ms` | Modal bounce-in for destructive actions. |

### 9.6 Impressive Dashboard Design (`Dashboard.css`)

The dashboard is the **hero screen** — it must feel alive:

- **Bento grid layout**: CSS Grid with mixed-size cards (2×1, 1×1, 1×2 spans)
- **Stat cards**: Large number + trend arrow + sparkline area. Entrance stagger animation.
- **Glassmorphism cards**: `backdrop-filter: blur(12px); background: rgba(255,255,255,0.80)` in light, `rgba(15,23,42,0.60)` in dark. Border `1px solid rgba(255,255,255,0.10)` in dark.
- **Live pulse**: Unread notification count pulses gently (accent dot).
- **Hover lift**: Cards shadow transitions from `shadow-sm` → `shadow-lg` on hover (no scale).
- **Gradient accent bar**: Top of each stat card has a 3px gradient bar (accent-400 → accent-600).
- **Chart containers**: Recharts with accent-500 as primary series color, slate-300 as secondary.

### 9.7 Impressive Sidebar Design (`Sidebar.css`)

- **Floating panel**: `position: fixed; top: 16px; left: 16px; bottom: 16px; border-radius: 16px;` — rounded corners, gap from viewport edges.
- **Glass effect**: `backdrop-filter: blur(8px); background: rgba(255,255,255,0.85)` light, `rgba(15,23,42,0.75)` dark.
- **Active indicator**: 3px accent-500 bar on left edge of active item, slides with `transition: top 200ms`.
- **Collapse animation**: Width transitions from 260px → 72px with `transition: width 250ms ease`. Icons stay, labels fade out.
- **Hover glow**: Subtle accent-50/20 bg on hover items.

### 9.8 Impressive Navbar Design (`Navbar.css`)

- **Floating bar**: `position: sticky; top: 16px; margin: 0 16px; border-radius: 12px;` — rounded, inset from edges.
- **Glass effect**: Same as sidebar. `backdrop-filter: blur(12px)`.
- **Notification bell**: Icon with badge dot (accent-500, pulse animation). Click opens popover panel.
- **User avatar**: Circular with accent ring on hover. Dropdown slides down.

### 9.9 Notifications — Popover Only (No Full Page)

**Change**: Remove `NotificationsPage` route and sidebar entry. Notifications become a **popover panel** in the Navbar:

- **Bell icon** in Navbar right section with unread count badge (accent-500 dot, `animation: pulse 2s infinite` when > 0).
- **Popover panel**: Click bell → dropdown panel slides down (`animation: slideDown 200ms`). Shows last 10 notifications.
- **Each notification row**: Icon (type-based) + title + timestamp. Unread rows have accent-50 bg + left accent border.
- **Mark as read**: Click row → bg transitions to surface-1, accent border fades.
- **Mark all as read**: Small link at popover footer.
- **Full history**: "View all activity logs" link at bottom navigates to `/activity-logs`.
- **Delete**: Remove `/notifications` route from `routes.tsx`. Remove `NotificationsPage.tsx` file. Remove sidebar entry.

### 9.10 Role/Permission — Checklist Pattern (No Create Permission)

**Change**: Roles have CRUD (create/update/delete roles) but **no separate "create permission" action**. Permissions are a **checklist** you toggle when creating/editing a role:

- **RolesIndexPage**: Standard index (name, description, user count, permission count, isSystem badge).
- **RoleFormPage**: 
  - Name + description fields at top.
  - **Permission checklist** below: grouped by resource (e.g. "Region" group → `region@read`, `region@create`, `region@update`, `region@delete`). Each is a checkbox.
  - Groups are collapsible `<details>` sections with resource icon.
  - Checked count shown as chip: "12 of 48 permissions".
  - No separate "create permission" button or page. Permissions are seeded/managed server-side only.
- **No Permission CRUD page**: There is no `/permissions` route. Permissions are read-only seed data.

### 9.11 Migration Order (Phased)

Tailwind removal must be **incremental** — never break the app mid-migration.

#### Phase 0: Foundation (before any page CSS)
1. Create `src/styles/animations.css` — shared keyframes.
2. Create `src/styles/utilities.css` — `.sr-only`, `.truncate`, `.cursor-pointer`, `.text-center`, etc.
3. Update `src/index.css` — remove `@import "tailwindcss"` and `@theme inline` block. Keep `@import "./styles/tokens.css"` and `@import "./styles/animations.css"` and `@import "./styles/utilities.css"`. Keep all existing resets (scrollbar, focus ring, body, rdp overrides).
4. Remove `@tailwindcss/vite` plugin from `vite.config.ts`.
5. Remove `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/postcss` from `package.json` dependencies.
6. Remove `postcss.config.mjs` or `postcss` config if it exists.
7. Verify app still renders (Tailwind classes will be inert — no styling, but no crash).

#### Phase 1: Shell (Navbar + Sidebar + Layouts)
1. `Navbar.css` — floating glass bar, notification bell popover.
2. `Sidebar.css` — floating glass panel, collapse animation, active indicator.
3. `PrivateLayout.css` — main content area with padding for floating nav/sidebar.
4. `PublicLayout.css` — centered auth layout.
5. Remove all `className="..."` Tailwind strings from these TSX files, replace with BEM class names.

#### Phase 2: UI Primitives (all `ui/` components)
1. `Button.css` — variants (primary, ghost, danger, outline), sizes, loading state, icon button.
2. `Card.css` — surface bg, border, shadow, header/body sections, hover lift.
3. `Input.css` + `Textarea.css` — focus ring, error state, disabled.
4. `Select.css` — dropdown trigger, focus, error.
5. `Modal.css` — overlay, scaleIn animation, header/body/footer.
6. `Table.css` — row hover, striped, active row accent border.
7. `Checkbox.css` — accent checked state, focus ring.
8. `Chip.css` — variants (accent, success, warning, danger, neutral), hover.
9. `Pagination.css` — page buttons, active accent, hover.
10. `Spinner.css` — spin animation, sizes.
11. `Skeleton.css` — shimmer animation.
12. `EmptyState.css` — fadeIn animation, centered layout.
13. `Dropdown.css` — slideDown animation, menu items.
14. `Tooltip.css` — fadeIn animation, positioning.
15. `Avatar.css` — circular, ring on hover.
16. `Toast.css` — slideInRight, accent bar per type.
17. `Separator.css` — horizontal/vertical divider.
18. `Label.css` + `FieldError.css` + `FormField.css` — form layout.
19. Remove all Tailwind `className` from each TSX, replace with BEM.

#### Phase 3: Shared Components (`components/`)
1. `PageHeader.css` — title, back button, action bar.
2. `SelectSearch.css` — popover positioning, search input.
3. `FormDatePicker.css` — calendar integration.
4. `ImageUploadField.css` — drag-drop zone, preview.
5. `ApprovalHistory.css` — timeline layout, status dots.
6. `EntityPhoto.css` — photo grid, lightbox.
7. `AiAssistant.css` — chat panel, slideIn animation.

#### Phase 4: Standalone Pages
1. `Dashboard.css` — bento grid, stat cards, glass cards, staggered entrance.
2. `LoginPage.css` — centered card, accent gradient header.
3. `LandingPage.css` — hero section, feature grid.
4. `NotFoundPage.css` — centered illustration, fadeIn.
5. `RouteErrorPage.css` — error display.

#### Phase 5: Domain Pages (13 domains, ordered by dependency)
Each domain gets 3 CSS files (Index, Detail, Form) following the same BEM template:

| # | Domain | CSS Files | Prefix |
|---|--------|-----------|--------|
| 1 | Region | `RegionIndexPage.css`, `RegionDetailPage.css`, `RegionFormPage.css` | `.reg-` |
| 2 | Area | `AreaIndexPage.css`, `AreaDetailPage.css`, `AreaFormPage.css` | `.area-` |
| 3 | Customer | `CustomerIndexPage.css`, `CustomerDetailPage.css`, `CustomerFormPage.css` | `.cust-` |
| 4 | Outlet | `OutletIndexPage.css`, `OutletDetailPage.css`, `OutletFormPage.css` | `.out-` |
| 5 | SKU Category | `SkuCategoryIndexPage.css`, `SkuCategoryDetailPage.css`, `SkuCategoryFormPage.css` | `.skuc-` |
| 6 | SKU | `SkuIndexPage.css`, `SkuDetailPage.css`, `SkuFormPage.css` | `.sku-` |
| 7 | Sales Order | `SalesOrderIndexPage.css`, `SalesOrderDetailPage.css`, `SalesOrderFormPage.css` (exists) | `.so-` |
| 8 | Invoice | `InvoiceIndexPage.css`, `InvoiceDetailPage.css`, `InvoiceFormPage.css` | `.inv-` |
| 9 | Visit Log | `VisitLogIndexPage.css`, `VisitLogDetailPage.css`, `VisitLogFormPage.css` | `.vl-` |
| 10 | Action Program | `ActionProgramIndexPage.css`, `ActionProgramDetailPage.css`, `ActionProgramFormPage.css` | `.ap-` |
| 11 | Event Proposal | `EventProposalIndexPage.css`, `EventProposalDetailPage.css`, `EventProposalFormPage.css` | `.ep-` |
| 12 | Users | `UsersIndexPage.css`, `UserDetailPage.css`, `UserFormPage.css` | `.usr-` |
| 13 | Roles | `RolesIndexPage.css`, `RoleFormPage.css` | `.role-` |

#### Phase 6: Activity Logs
1. `ActivityLogsIndexPage.css` — `.act-` prefix.
2. `ActivityLogDetailPage.css` — `.act-` prefix.

#### Phase 7: Cleanup
1. Delete `NotificationsPage.tsx` and its route.
2. Add notification popover to Navbar (bell icon + dropdown panel).
3. Remove all remaining Tailwind class strings from any missed files.
4. Delete `src/styles/colors.ts`, `src/styles/spacing.ts`, `src/styles/typography.ts` (replaced by CSS tokens).
5. Remove `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/postcss`, `autoprefixer`, `postcss` from `package.json`.
6. Remove `postcss.config.mjs` if present.
7. Verify: `bun run check-types` — zero errors.
8. Verify: `bun run build` — clean.
9. Visual QA: light + dark at 375/768/1024/1440.

### 9.12 Per-CSS-File Template

Every CSS file follows this structure:

```css
/* ============================================================
 * <ComponentName> — regular CSS (60-30-10 rule)
 * Prefix: <prefix>
 * ============================================================ */

.<prefix>-<component> {
  /* Local token overrides (if needed) */
  --<prefix>-bg: var(--color-surface-0);
  --<prefix>-surface: var(--color-surface-1);
  --<prefix>-fg: var(--color-foreground);
  --<prefix>-muted: var(--color-muted);
  --<prefix>-accent: var(--color-accent-500);
  --<prefix>-border: var(--color-border);
  --<prefix>-radius: var(--radius-lg);

  /* Base styles */
  background: var(--<prefix>-bg);
  color: var(--<prefix>-fg);
  font-family: var(--font-sans);
  animation: slideUp 250ms ease-out;
}

/* Dark mode overrides */
.dark .<prefix>-<component> {
  --<prefix>-bg: var(--color-surface-0);
  --<prefix>-surface: var(--color-surface-1);
  --<prefix>-fg: var(--color-slate-100);
  --<prefix>-muted: var(--color-slate-400);
  --<prefix>-border: var(--color-slate-800);
}

/* Elements (BEM __) */
.<prefix>-<component>__<element> { ... }

/* Modifiers (BEM --) */
.<prefix>-<component>--<modifier> { ... }

/* States */
.<prefix>-<component>:hover { ... }
.<prefix>-<component>:focus-visible { ... }
.<prefix>-<component>:active { ... }
.<prefix>-<component>[disabled] { ... }

/* Responsive */
@media (max-width: 768px) { ... }
@media (max-width: 1024px) { ... }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .<prefix>-<component> { animation: none; }
}
```

### 9.13 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Styling method** | Co-located `.css` per `.tsx` | Maximum locality, no global leakage, easy to find |
| **Naming** | BEM with domain prefix | `.so-card__title--active` is self-documenting + collision-proof |
| **Tokens** | CSS custom properties in `tokens.css` | Single source of truth, dark mode via `.dark` override |
| **Animations** | Shared `animations.css` + per-component `animation:` | Consistent motion language, `prefers-reduced-motion` guard |
| **Layout** | CSS Grid + Flexbox | No utility classes needed — semantic layout in each file |
| **Responsive** | Media queries in each file | Breakpoints: 375px, 768px, 1024px, 1440px |
| **Dark mode** | `.dark` class on `<html>` + token overrides | Already working, keep the pattern |
| **No Tailwind** | Complete removal | Zero runtime cost, full control, impressive custom design |
| **Notifications** | Navbar popover only | No full page, no sidebar entry, bell icon with badge |
| **Role permissions** | Checklist in RoleForm | No create-permission CRUD, permissions are seed data |

### 9.14 Impressive Design Elements Checklist

Every part of the app must feel **modern, alive, and professional**:

- [ ] **Floating glass navbar** — rounded, blurred, inset from viewport edges
- [ ] **Floating glass sidebar** — rounded, blurred, collapsible with animation
- [ ] **Bento dashboard grid** — mixed-size cards, staggered entrance
- [ ] **Stat card gradient bars** — 3px accent gradient at top of each card
- [ ] **Hover shadow lifts** — cards go from `shadow-sm` → `shadow-md` on hover (no scale)
- [ ] **Active row accent border** — left 3px accent-500 on active table rows
- [ ] **Focus rings** — accent-500 outline on all interactive elements
- [ ] **Modal bounce-in** — `scaleIn` animation for modals
- [ ] **Toast slide-in** — `slideInRight` for notifications
- [ ] **Skeleton shimmer** — gradient sweep on loading placeholders
- [ ] **Notification bell pulse** — unread badge pulses gently
- [ ] **Page entrance stagger** — cards appear with 50ms delay each
- [ ] **Sidebar active indicator** — accent bar slides to active item
- [ ] **Button press feedback** — `scale(0.97)` on active, shadow shift on hover
- [ ] **Input focus glow** — accent border + accent/20 ring
- [ ] **Chip hover shift** — subtle bg color transition
- [ ] **Pagination active accent** — accent-500 bg on current page
- [ ] **Dropdown slide-down** — menu animates from trigger
- [ ] **Empty state fade-in** — gentle opacity entrance
- [ ] **Dark mode parity** — every element visible and high-contrast in both modes
- [ ] **Reduced motion** — all animations disabled for accessibility
- [ ] **44×44px touch targets** — all buttons and interactive elements
- [ ] **4.5:1 contrast** — body text in both light and dark
- [ ] **No emoji icons** — iconify/SVG only
- [ ] **No layout shift on hover** — no scale transforms on grid items
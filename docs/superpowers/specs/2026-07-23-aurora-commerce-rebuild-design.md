# Aurora Commerce — Full Client UI Rebuild Design Spec

**Date:** 2026-07-23  
**Status:** Approved (tweaked 2026-07-23 — icons, shell, avatar)  
**Scope:** Full presentation-layer rebuild of `apps/client`  
**Approach:** Foundation-first (theme → shadcn kit → shell → showcase pages → remaining modules → purge)  
**Design system:** `design-system/aurora-commerce/MASTER.md`  
**Context pack:** `docs/plans/aurora-commerce/CONTEXT.md`

---

## 1. Intent

Rebuild the ERP Sales client as a **portfolio-grade SaaS CRM** using:

- **Tailwind CSS v4** + React best practices (composition, `cn()`, token-driven UI)
- **shadcn/ui** (new-york base, heavily themed — not default zinc)
- **Aurora Commerce** visual identity: colorful custom nav + solid work surfaces
- **ui-ux-pro-max** guidance for density/a11y/motion — **override** monochrome defaults with Aurora color

**Goals**
1. Modern, hireable stack (shadcn + Tailwind) for portfolio narrative  
2. Distinctive **colorful** CRM (custom nav SVGs, module accents, aurora canvas)  
3. Complete UI kit + **full visual shell rebuild** (sidebar/topbar design dropped, logic kept)  
4. Preserve product behavior: routes, tRPC, auth, permissions, i18n, nav structure, atoms  

**Not in scope**
- Backend / Prisma / tRPC procedure changes (unless a UI contract bug blocks UI)
- New product features beyond presentation (pipeline v1 already exists as view)
- Long-term dual design systems
- Rewriting nav permission/section algorithms without cause

**Supersedes**
- Plain-CSS redesign track (`design-system/erp-sales-crm/`, “no Tailwind” rule)
- Old local UI kit at `apps/client/src/ui/*` after migration completes
- Old `Sidebar.css` / `Topbar.css` / ios-sb visual language

---

## 2. Product personality

| Axis | Choice |
|------|--------|
| Name | Aurora Commerce |
| Audience | Sales / field / ops + portfolio reviewers |
| Tone | Premium, energetic, precise, friendly-professional |
| Signature | Aurora mesh canvas + **custom colorful nav tiles** |
| Icons | Lucide = basic only; nav = custom SVG only |
| Shell | New visual design; existing logic/atoms/nav data reused |
| Avoid | Default shadcn zinc, Lucide-as-nav, dual avatars, emerald-as-primary, emoji icons, heavy glass on tables |

---

## 3. Design principles

Normative principles live in the Master file. Summary:

| ID | Name |
|----|------|
| P1 | Color carries meaning, not decoration |
| P2 | Colorful nav, solid work surfaces |
| P3 | One signature, quiet data |
| P4 | Density with breath (CRM 7/10) |
| P5 | Progressive color intensity |
| P6 | Motion is feedback, not theater |
| P7 | Accessibility is part of the brand |
| P8 | Tokens over one-offs |
| P9 | Portfolio honesty (expressive auth, scannable app) |
| P10 | Rebuild visuals, keep logic |
| P11 | Icon dual-family (Lucide basic / custom nav SVG) |
| P12 | Single user avatar surface |

**Table principles (TP1–TP12)** are first-class and mandatory — see Master § Table design principles. Default index density is **`crm`**.

---

## 4. Visual identity & tokens

### 4.1 Brand colors

| Role | Hex | Token |
|------|-----|-------|
| Aurora Indigo (primary) | `#4F46E5` | `--primary` |
| Primary soft | `#EEF2FF` | `--secondary` / primary-50 |
| Mint Deal (success only) | `#10B981` | `--success` |
| Canvas | `#F4F7FF` | `--background` |
| Card | `#FFFFFF` | `--card` |
| Ink | `#0F172A` | `--foreground` |
| Muted text | `#64748B` | `--muted-foreground` |
| Border | `#E0E7FF` | `--border` |
| Danger | `#EF4444` | `--destructive` |

Full primary scale, mesh stops, module accents, stage colors, and chart tokens: **Master file**.

### 4.2 Typography

- Headings / UI display: **Plus Jakarta Sans**
- Body / tables: **Inter**
- Mono (IDs, codes): **JetBrains Mono**
- Base ~15–16px; table 13–14px

### 4.3 Shape & depth

- Controls `rounded-lg`; cards `rounded-xl`; dialogs/tiles `rounded-2xl`
- Shell: floating rounded sidebar + topbar on aurora mesh (bento-influenced, variance 8)
- Work surfaces: solid cards; borders preferred over heavy shadows

### 4.4 Motion

- Hover 150–250ms; dialog 250–350ms
- KPI stagger only on dashboard
- `prefers-reduced-motion` required

### 4.5 Iconography (P11)

| Family | Use |
|--------|-----|
| **Lucide** | Basic chrome only: search, bell, chevron, plus, edit, trash, filter, close, settings, logout, theme, locale, row actions |
| **Custom SVG** | **Every nav module icon**, brand logo, optional KPI/empty art |

Custom nav SVGs: baked module gradients, 32×32 plate, registered in `assets/icons`, referenced by existing `NAV_MENU` — **do not switch nav to Lucide**.

---

## 5. Stack & architecture

### 5.1 Styling stack

| Layer | Choice |
|-------|--------|
| Utility CSS | Tailwind CSS v4 |
| Component primitives | shadcn/ui (Radix-based) |
| Theme | CSS variables in `index.css` + `@theme` |
| Class helper | `cn()` (clsx + tailwind-merge) |
| Icons | lucide-react (**basic only**) + **custom nav SVGs** |
| Charts | Recharts + chart tokens |
| Forms | `@tanstack/react-form` + shadcn field primitives |
| Tables | `@tanstack/react-table` + domain `DataTable` |
| Toasts | Sonner or shadcn toast pattern |
| i18n | react-intl (unchanged pattern) |
| Data | vanilla tRPC client + TanStack Query (unchanged) |

### 5.2 Directory targets

```
apps/client/src/
  index.css                 # Tailwind + Aurora tokens
  lib/utils.ts              # cn()
  components/ui/            # shadcn primitives
  components/               # domain: shell, DataTable, StatusChip, …
  pages/                    # rebuilt markup; logic preserved
  assets/icons/             # module tiles retained/remade
```

**Delete after cutover (not mid-flight if still imported):**
- `apps/client/src/ui/**` (old kit)
- Obsolete colocated `*.css` once page uses Tailwind/shadcn only
- Dead token files under `styles/` that nothing imports

### 5.3 What stays (logic / structure)

- All routes in `routes.tsx`
- tRPC client, auth atoms, permissions, query keys
- Form validation schemas / Zod from `@repo/schemas`
- i18n key structure (extend both locales as needed)
- `data-ai-context` requirement on pages
- Tauri integration points
- **`NAV_MENU` data + permission filtering + section grouping**
- **Sidebar/Topbar behavioral logic** (collapse atom, path active, search open, unread query, locale/theme)
- **`UserMenuPopover` + `user-menu-anchor` pattern** (single host in layout)

### 5.4 What is fully redesigned (visual only)

- Sidebar look (drop `ios-sb` / old CSS) → Tailwind colorful floating rail
- Topbar look → command bar with page meta + tools
- Nav icons → **new custom SVGs** (not Lucide)
- Avatar placement → **P12 single surface** (see §6.4)
- All page chrome using old UI kit classes

### 5.5 Backend

No intentional backend work. UI-only rebuild.

### 5.6 React + Tailwind best practices (normative)

- Composition over inheritance; small presentational components
- `cn()` for conditional classes; no string soup without tokens
- No new large colocated CSS for shell after rebuild
- Keep data hooks above JSX; avoid business logic in classNames
- Prefer shadcn primitives before inventing base controls
- Accessible names on icon-only controls
- Mobile sidebar via shadcn `Sheet`

---

## 6. Component system

### 6.1 Primitives (shadcn)

Install and theme at minimum:

Button, Input, Textarea, Label, Checkbox, Switch, Select, Dialog, Sheet,  
Dropdown Menu, Popover, Tooltip, Tabs, Badge, Card, Separator, Avatar,  
Skeleton, Table, Pagination, Command, Scroll Area, Sonner, Form helpers,  
Calendar / Date picker (as needed for existing forms).

### 6.2 Domain components (required)

| Component | Notes |
|-----------|--------|
| `AppShell` | Mesh canvas + layout; hosts **one** `UserMenuPopover` |
| `Sidebar` | **New visuals**; reuse nav logic/atoms |
| `NavModuleTile` | Custom SVG plate + active module wash |
| `Topbar` | **New visuals**; avatar only when P12 says so |
| `UserAvatarMenu` | Shared trigger: `variant="sidebar" \| "topbar"` |
| `PageHeader` | Title, module eyebrow, back/edit/delete |
| `FilterBar` | Search, filters, count |
| `DataTable` | Enforces TP rules + densities |
| `StatusChip` | Semantic approval/status |
| `KpiCard` | Dashboard |
| `PipelineBoard` | Sales Order view |
| `EmptyState` | Module-tinted |
| `ConfirmDialog` | Draft/propose/delete |

### 6.3 Table system (critical)

See Master for full TP1–TP12. Hard requirements:

- Default density **`crm`**
- Sticky header
- StatusChip for states
- Money right + tabular-nums
- Actions last; row click → detail
- Selected row: primary soft + 3px indigo bar
- FilterBar + pagination as standard chrome
- Skeleton / empty / no-results / error states
- ≤8 default columns on indexes

### 6.4 Shell + avatar (P12) — normative

**Drop** old sidebar/topbar CSS design completely. **Keep** logic listed in §5.3.

| State | Avatar lives in | Hidden |
|-------|-----------------|--------|
| Desktop, sidebar expanded | Sidebar footer (`UserAvatarMenu variant="sidebar"`) | Topbar avatar |
| Desktop, sidebar collapsed | Topbar (`variant="topbar"`) | Sidebar footer user block |
| Mobile | Topbar | Sidebar footer menu trigger |

```tsx
const showAvatarInSidebar = sidebarOpen && isLgUp;
// sidebar footer: showAvatarInSidebar && <UserAvatarMenu variant="sidebar" />
// topbar end:    !showAvatarInSidebar && <UserAvatarMenu variant="topbar" />
```

- One popover host in `PrivateLayout` only
- Reuse `userMenuOpenAtom` + `user-menu-anchor` CustomEvent — no second menu system
- Colorful nav: custom SVG always on; active row uses module wash + 3px accent bar

### 6.5 Icon dual-family (P11)

- Nav rows: **custom SVG only**
- Search/bell/chevrons/edit/trash/etc.: **Lucide only**
- Remake weak/missing nav assets during Phase 3

---

## 7. Page coverage

All existing client pages are in scope for visual rebuild, including:

- Landing, Login, NotFound, RouteError  
- Dashboard, Reports hub  
- Master data: Region, Area, Customer, Outlet, SKU Category, SKU  
- Sales: Sales Order (+ pipeline view), Email CRM  
- Field: Visit Log  
- Programs: Action Program, Event Proposal  
- Admin: Users, Access Control, Activity Logs, Notifications  
- AI: Customer Assistant, AI Admin, Knowledge Base  

**Showcase priority (phase 4):** Login, Dashboard, Customer index/detail/form, Sales Order index + pipeline.

**Template sweep (phase 5):** remaining modules copy showcase patterns.

---

## 8. Migration phases

### Phase 1 — Foundation
- Add Tailwind v4 + PostCSS/Vite integration  
- Init shadcn; configure aliases; `cn()`  
- Port Aurora tokens into CSS variables + `@theme`  
- Fonts: Plus Jakarta Sans, Inter, JetBrains Mono  
- Prove one Button + Card on a throwaway or login shell  

### Phase 2 — UI kit
- Generate/theme all required shadcn primitives  
- Build domain components: StatusChip, EmptyState, PageHeader, FilterBar, DataTable, ConfirmDialog, KpiCard  
- Story-free: validate via Login + a single index page prototype if needed  

### Phase 3 — Shell (visual rebuild, logic reuse)
- Rebuild `PrivateLayout`, Sidebar, Topbar visuals with Tailwind (delete ios-sb CSS)  
- Remake **custom nav SVGs** for all modules; wire via existing `NAV_MENU`  
- Implement `UserAvatarMenu` + **P12 single avatar** placement  
- Keep: permissions, sections, atoms, UserMenuPopover host, unread query, search palette, notif drawer, AI host  
- Lucide for shell chrome controls only  
- Mobile sidebar → Sheet  
- Public layout / login shell  

### Phase 4 — Showcase pages
- Login + Landing (portfolio first impression)  
- Dashboard (KPIs + charts)  
- Customer index / detail / form  
- Sales Order index + pipeline toggle  
- Wire DataTable density + FilterBar end-to-end  

### Phase 5 — Remaining modules
- Apply Index / Detail / Form templates to all other domains  
- Nested compact tables on forms/detail  
- Reports restyle to tokens  

### Phase 6 — Purge & QA
- Remove dead `src/ui` kit, `Sidebar.css`, `Topbar.css`, unused CSS  
- Update project instructions that still say “no Tailwind” for client  
- Verify no dual avatars; no Lucide in nav rows  
- A11y pass, reduced-motion, responsive  
- `bun run check-types`  
- Portfolio screenshot set (shell must show colorful custom nav)  

**Concurrency guidance:** foundation and kit are sequential; after DataTable + shell exist, page migrations can parallelize carefully (Frontend subagents) without dual-writing the same file.

---

## 9. Permissions, auth, i18n (unchanged contracts)

- Permission strings remain `resource@action`  
- `hasPermissionAtom` gates create/update/delete UI  
- Cookie auth + bootstrap unchanged  
- All user-facing strings via `intl.formatMessage`; add keys to **both** `en.json` and `id.json`  

---

## 10. Accessibility & quality

- WCAG AA contrast on text and critical controls  
- Visible focus rings (`--ring`)  
- Status never color-only  
- Keyboard path for primary flows  
- `prefers-reduced-motion`  
- Responsive 375 / 768 / 1280  
- No emoji icons  

**Definition of done:** Master quality bar checklist.

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Mid-migration dual kits | Phase order; purge only when imports gone; temporary adapters OK short-term |
| Generic shadcn look | Aurora tokens + module system enforced in Master |
| Table inconsistency | Single `DataTable`; ban ad-hoc table CSS |
| Scope explosion | Phases; showcase first; template sweep second |
| Instruction file conflict | Update `.github` client instructions in Phase 6 to allow Tailwind/shadcn |

---

## 12. Success criteria

1. App runs with Tailwind + shadcn Aurora theme  
2. **Custom colorful SVG** on every nav item; Lucide only for basic chrome  
3. Sidebar/topbar fully new design; nav/auth/permission logic still correct  
4. **Exactly one** user avatar trigger visible (P12)  
5. CRM tables consistent (density, chips, money, actions)  
6. Old plain-CSS kit + ios-sb CSS removed from runtime path  
7. Types pass; primary flows usable  
8. Portfolio screenshots look distinctive (not default shadcn / not old iOS shell)  

---

## 13. References

- Design system: `design-system/aurora-commerce/MASTER.md`  
- Skills used: frontend-design, ui-ux-pro-max (colorful override of monochrome default)  
- MCP for implement:
  - **shadcn** (`.vscode/mcp.json`) — add/list components, registry, install commands
  - **Context7** — Tailwind v4 and library docs
  - **Playwright / Chrome DevTools** — visual QA
- Prior plain-CSS redesign: abandoned for this track; do not re-freeze “no Tailwind”  

---

## 14. Open decisions (resolved)

| Topic | Decision |
|-------|----------|
| Direction | A — Aurora Commerce |
| Stack | Tailwind v4 + shadcn full kit rebuild |
| Colorful? | Yes — custom nav SVGs + mesh + chips + module wash |
| Icons | Lucide basic only; custom SVG for all nav |
| Shell | Full visual redesign; reuse logic/atoms/NAV_MENU |
| Avatar | Single surface P12 (sidebar expanded vs topbar otherwise) |
| Tables | Dedicated TP principles; default density `crm` |
| Old CSS | Delete after cutover |
| Backend | Untouched |
| Dark mode | Not required for v1 (tokens may allow later) |
| ui-ux-pro-max | Use for a11y/density/motion; override monochrome palette with Aurora |

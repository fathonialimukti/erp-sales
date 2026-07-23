# Aurora Commerce Full Client UI Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the entire `apps/client` presentation layer as Aurora Commerce — Tailwind v4 + shadcn/ui, colorful custom nav SVGs, solid CRM work surfaces — while preserving routes, tRPC, auth, permissions, i18n, and shell business logic.

**Architecture:** Foundation-first. Theme tokens and shadcn primitives first, then domain components (`DataTable`, `UserAvatarMenu`, …), then a full visual shell rebuild that reuses existing nav/auth atoms, then showcase pages, then a template sweep of remaining modules, then purge of the old plain-CSS kit.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4, shadcn/ui (new-york), lucide-react (basic chrome only), custom nav SVGs, TanStack Query + Table + Form, vanilla tRPC client, react-intl, Jotai, Recharts.

## Global Constraints

- **Scope:** `apps/client` presentation only — no backend/Prisma/tRPC procedure changes unless a UI contract is broken.
- **Primary:** `#4F46E5` Aurora Indigo — never mint as default CTA.
- **Success/deal only:** `#10B981` Mint.
- **Icons P11:** Lucide = basic chrome only; **nav modules = custom colorful SVGs only**.
- **Shell:** Full visual redesign; **keep** `NAV_MENU`, permissions, sections, path-active, atoms, search/notif/AI hosts, `UserMenuPopover` + `user-menu-anchor`.
- **Avatar P12:** Exactly one `UserAvatarMenu` visible — sidebar footer when expanded+lg; topbar otherwise.
- **Tables:** `DataTable` default density `crm`; TP1–TP12 mandatory.
- **i18n:** Every new string in both `en.json` and `id.json`.
- **Pages:** Keep `data-ai-context` on outermost wrappers.
- **Data fetching:** vanilla `trpcClient` + `useQuery`/`useMutation` — no `createTRPCReact` hooks.
- **Design sources of truth:** `design-system/aurora-commerce/MASTER.md`, `docs/superpowers/specs/2026-07-23-aurora-commerce-rebuild-design.md`, `docs/plans/aurora-commerce/CONTEXT.md`.
- **MCP:** Prefer **shadcn MCP** for component adds; Context7 for Tailwind/shadcn docs.
- **Skills:** frontend-design + ui-ux-pro-max (override monochrome defaults with Aurora).
- **Commits:** Small, frequent; one logical deliverable per task.
- **Verify:** Prefer `bun run check-types` in `apps/client` (or monorepo root) after structural tasks.

---

## File map (target)

| Path | Responsibility |
|------|----------------|
| `apps/client/package.json` | Tailwind, tw-animate, class-variance-authority, clsx, tailwind-merge, radix peers as needed |
| `apps/client/vite.config.ts` | `@` alias → `./src` |
| `apps/client/tsconfig.json` | `paths`: `@/*` → `./src/*` |
| `apps/client/components.json` | shadcn config |
| `apps/client/src/index.css` | Tailwind v4 entry + Aurora CSS variables + `@theme` |
| `apps/client/src/lib/utils.ts` | `cn()` |
| `apps/client/src/components/ui/*` | shadcn primitives |
| `apps/client/src/components/UserAvatarMenu.tsx` | P12 shared avatar trigger |
| `apps/client/src/components/NavModuleTile.tsx` | Custom SVG nav row |
| `apps/client/src/components/PageHeader.tsx` | Page title + actions |
| `apps/client/src/components/FilterBar.tsx` | Index toolbar |
| `apps/client/src/components/DataTable.tsx` | CRM table wrapper |
| `apps/client/src/components/StatusChip.tsx` | Approval/status chips |
| `apps/client/src/components/EmptyState.tsx` | Module-tinted empty |
| `apps/client/src/components/ConfirmDialog.tsx` | Confirm flows |
| `apps/client/src/components/KpiCard.tsx` | Dashboard KPI |
| `apps/client/src/components/Sidebar.tsx` | Visual rebuild; logic kept |
| `apps/client/src/components/Topbar.tsx` | Visual rebuild; logic kept |
| `apps/client/src/components/UserMenuPopover.tsx` | Restyle; keep anchor logic |
| `apps/client/src/layouts/PrivateLayout.tsx` | Mesh shell; single popover host |
| `apps/client/src/assets/icons/nav-*.svg` | Custom colorful nav tiles |
| `apps/client/src/assets/icons.ts` | Registry (nav custom; chrome may stay until Lucide swap) |
| `apps/client/src/pages/**` | Markup/styles rebuilt; query/form logic preserved |
| Delete after cutover | `src/ui/**`, `Sidebar.css`, `Topbar.css`, obsolete `*.css` |

---

## Phase 1 — Foundation

### Task 1: Tailwind v4 + path alias + cn()

**Files:**
- Modify: `apps/client/package.json`
- Modify: `apps/client/vite.config.ts`
- Modify: `apps/client/tsconfig.json`
- Modify: `apps/client/tsconfig.node.json` (if needed for vite config types)
- Create: `apps/client/src/lib/utils.ts`
- Modify: `apps/client/src/index.css` (start Tailwind entry; keep temporary old imports until Phase 6 if needed for mid-migration)

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]) => string`
- Produces: import alias `@/` → `src/`

- [ ] **Step 1: Install Tailwind v4 toolchain in client**

From `apps/client`:

```bash
bun add tailwindcss @tailwindcss/vite
bun add clsx tailwind-merge class-variance-authority
```

- [ ] **Step 2: Wire Vite plugin + `@` alias**

In `vite.config.ts`:

```ts
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // keep existing clearScreen, server, tauri options
}));
```

- [ ] **Step 3: Add TS paths**

In `tsconfig.json` `compilerOptions`:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

- [ ] **Step 4: Create `cn()`**

```ts
// apps/client/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

- [ ] **Step 5: Bootstrap `index.css` with Tailwind**

At top of `apps/client/src/index.css`:

```css
@import "tailwindcss";
```

Keep existing token imports temporarily so the app does not go unstyled mid-migration; Aurora tokens replace them in Task 2.

- [ ] **Step 6: Verify client typecheck**

Run: `cd apps/client && bun run check-types`  
Expected: PASS (or only pre-existing errors unrelated to alias)

- [ ] **Step 7: Commit**

```bash
git add apps/client/package.json apps/client/vite.config.ts apps/client/tsconfig.json apps/client/src/lib/utils.ts apps/client/src/index.css bun.lock
git commit -m "feat(client): add Tailwind v4, path alias, and cn()"
```

---

### Task 2: Aurora theme tokens in CSS

**Files:**
- Modify: `apps/client/src/index.css`
- Reference: `design-system/aurora-commerce/MASTER.md` (color/type tables)

**Interfaces:**
- Produces: shadcn-compatible CSS variables (`--background`, `--primary`, …) + module/chart tokens
- Produces: `@theme inline` mappings for Tailwind utilities

- [ ] **Step 1: Add font imports**

Plus Jakarta Sans, Inter, JetBrains Mono (Google Fonts or local — prefer `link` in `index.html` or CSS `@import`).

- [ ] **Step 2: Define `:root` Aurora semantic tokens**

Map Master palette exactly:

- `--background: #F4F7FF`
- `--foreground: #0F172A`
- `--card: #FFFFFF`
- `--primary: #4F46E5`
- `--primary-foreground: #FFFFFF`
- `--secondary: #EEF2FF`
- `--secondary-foreground: #3730A3`
- `--muted: #F1F5F9`
- `--muted-foreground: #64748B`
- `--accent: #EEF2FF`
- `--destructive: #EF4444`
- `--border: #E0E7FF`
- `--input: #E0E7FF`
- `--ring: #4F46E5`
- `--success: #10B981`
- `--radius: 0.625rem`
- Module tokens `--module-customer` … `--module-ai`
- Chart tokens `--chart-1` … `--chart-5`, positive/negative
- Aurora mesh custom props if useful (`--aurora-violet`, etc.)

Use oklch or hex consistently; hex is fine if it matches Master.

- [ ] **Step 3: Add `@theme inline` for Tailwind v4**

Expose colors as `--color-background`, `--color-primary`, fonts, radius so utilities like `bg-primary`, `text-muted-foreground` work.

- [ ] **Step 4: Base layer**

```css
@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: Inter, system-ui, sans-serif;
  }
  h1, h2, h3 {
    font-family: "Plus Jakarta Sans", Inter, system-ui, sans-serif;
  }
}
```

- [ ] **Step 5: Optional aurora mesh utility**

```css
.aurora-mesh {
  background-color: var(--background);
  background-image:
    radial-gradient(at 15% 20%, color-mix(in oklab, #A78BFA 18%, transparent) 0px, transparent 50%),
    radial-gradient(at 85% 15%, color-mix(in oklab, #22D3EE 14%, transparent) 0px, transparent 45%),
    radial-gradient(at 50% 90%, color-mix(in oklab, #FB7185 12%, transparent) 0px, transparent 50%);
}
```

- [ ] **Step 6: Smoke-check in browser**

Run client dev server; body background should be cool `#F4F7FF` tint when Tailwind base applies. Old CSS may still dominate some pages — OK.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(client): add Aurora Commerce design tokens"
```

---

### Task 3: Init shadcn + core primitives

**Files:**
- Create: `apps/client/components.json`
- Create: `apps/client/src/components/ui/*` (via CLI/MCP)
- Modify: `apps/client/package.json` (radix deps as CLI adds them)

**Interfaces:**
- Produces: shadcn components under `@/components/ui/*`
- Consumes: `cn`, tokens, `@` alias

- [ ] **Step 1: Init shadcn for Vite**

Prefer **shadcn MCP** if available; else:

```bash
cd apps/client && bunx --bun shadcn@latest init
```

Choices:
- Style: **new-york**
- Base color: neutral/zinc (we override with Aurora CSS vars)
- CSS variables: **yes**
- Tailwind CSS: v4
- Aliases: `@/components`, `@/lib/utils`, `@/components/ui`

- [ ] **Step 2: Add primitives (batch)**

```bash
bunx --bun shadcn@latest add button input label textarea checkbox switch select
bunx --bun shadcn@latest add dialog sheet dropdown-menu popover tooltip tabs
bunx --bun shadcn@latest add badge card separator avatar skeleton
bunx --bun shadcn@latest add table pagination scroll-area command sonner
bunx --bun shadcn@latest add form calendar popover # as needed for date fields
```

Use MCP `add` equivalents if that is the project workflow.

- [ ] **Step 3: Theme Button primary to Aurora**

Ensure `button` variants use `bg-primary` etc. — should work if CSS vars are correct. Add optional `success` variant only if needed later (mint, rare).

- [ ] **Step 4: Mount Sonner toaster once**

In `apps/client/src/providers.tsx` or `App.tsx`, add `<Toaster />` from `@/components/ui/sonner` (or `sonner`).

- [ ] **Step 5: Typecheck**

Run: `cd apps/client && bun run check-types`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(client): init shadcn/ui primitives for Aurora"
```

---

## Phase 2 — Domain UI kit

### Task 4: StatusChip + EmptyState + ConfirmDialog

**Files:**
- Create: `apps/client/src/components/StatusChip.tsx`
- Create: `apps/client/src/components/EmptyState.tsx`
- Create: `apps/client/src/components/ConfirmDialog.tsx`
- Modify: locales if new strings

**Interfaces:**
- Produces:
  - `StatusChip({ status: 'DRAFT'|'PROPOSED'|'APPROVED'|'REJECTED'|string, label?: string })`
  - `EmptyState({ module?: ModuleKey, title, description, action? })`
  - `ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, variant, onConfirm, loading? })`

- [ ] **Step 1: Implement StatusChip**

Map Draft→slate, Proposed→indigo/primary, Approved→success, Rejected→destructive. Always icon (Lucide) + label. Use `Badge` + classes.

- [ ] **Step 2: Implement EmptyState**

Module accent left bar or icon plate; primary CTA slot; no emoji.

- [ ] **Step 3: Implement ConfirmDialog**

Wrap shadcn `Dialog`; destructive variant for delete; loading disables confirm.

- [ ] **Step 4: Typecheck + commit**

```bash
git commit -m "feat(client): add StatusChip, EmptyState, ConfirmDialog"
```

---

### Task 5: PageHeader + FilterBar

**Files:**
- Create: `apps/client/src/components/PageHeader.tsx`
- Create: `apps/client/src/components/FilterBar.tsx`

**Interfaces:**
- `PageHeader({ title, description?, module?: ModuleKey, onBack?, actions?: ReactNode })`
- `FilterBar({ search, onSearchChange, filters?: ReactNode, countLabel?: string, actions?: ReactNode })`

- [ ] **Step 1: PageHeader with module eyebrow color**

Optional 3px module accent or colored eyebrow text using `--module-*`.

- [ ] **Step 2: FilterBar**

Search `Input` with Lucide `Search`; debouncing stays in page (or accept `value`/`onChange` controlled). Right slot for Create button.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(client): add PageHeader and FilterBar"
```

---

### Task 6: DataTable (CRM densities)

**Files:**
- Create: `apps/client/src/components/DataTable.tsx`
- Optional: `apps/client/src/components/DataTablePagination.tsx`

**Interfaces:**
- Consumes: TanStack Table `ColumnDef`, shadcn `Table`
- Produces:

```tsx
type DataTableProps<T> = {
  density?: "comfortable" | "crm" | "compact"; // default "crm"
  columns: ColumnDef<T, unknown>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean; // default true
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
};
```

- [ ] **Step 1: Implement wrapper with density class map**

Row heights approx: comfortable 52 / crm 44 / compact 36 via `h-*` + `py-*` on cells.

- [ ] **Step 2: Loading skeletons**

5–8 skeleton rows matching density.

- [ ] **Step 3: Empty / error slots**

If `!isLoading && data.length === 0` render `empty`. If `isError` render error card + no fake rows.

- [ ] **Step 4: Row click + stopPropagation convention**

`onClick` on `<tr>`; document that action buttons must `e.stopPropagation()`.

- [ ] **Step 5: Selected row styles**

Utility classes: `bg-primary/5` + `border-l-[3px] border-l-primary` when row has selected state (support via `meta` or `getRowClassName` prop if needed).

- [ ] **Step 6: Typecheck + commit**

```bash
git commit -m "feat(client): add CRM DataTable with density modes"
```

---

### Task 7: UserAvatarMenu + KpiCard

**Files:**
- Create: `apps/client/src/components/UserAvatarMenu.tsx`
- Create: `apps/client/src/components/KpiCard.tsx`
- Modify: `apps/client/src/components/UserMenuPopover.tsx` (export trigger stays; restyle later in Phase 3)

**Interfaces:**
- `UserAvatarMenu({ variant: "sidebar" | "topbar" })` — wraps existing `UserMenuTrigger` + avatar content
- `KpiCard({ label, value, delta?, module?: ModuleKey, icon? })`

- [ ] **Step 1: UserAvatarMenu**

```tsx
// variant sidebar: avatar + name + role + chevron
// variant topbar: avatar only, aria-label user menu
// MUST use UserMenuTrigger so user-menu-anchor still fires
```

- [ ] **Step 2: KpiCard**

Solid card, module-colored icon plate, tabular nums for value.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(client): add UserAvatarMenu and KpiCard"
```

---

## Phase 3 — Shell visual rebuild

### Task 8: Custom nav SVG pass + registry

**Files:**
- Create/Update: `apps/client/src/assets/icons/nav-*.svg` (all modules)
- Modify: `apps/client/src/assets/icons.ts` if keys change
- Keep: `apps/client/src/constants/nav-menu.ts` structure (only icon URLs if paths change)

**Interfaces:**
- Produces: colorful 32×32-style tiles for every `NAV_MENU` icon
- Constraint: **no Lucide in nav**

- [ ] **Step 1: Inventory nav icons used by NAV_MENU**

Dashboard, Reports, Region, Area, Customer, Outlet, SKU Category, SKU, Sales Order, Email CRM, Visit, Planning, Event, Users, Roles, Activity, Notifications, Knowledge, AI, brand logo.

- [ ] **Step 2: Remake/ensure each nav SVG is colorful module-accent plate**

Baked gradients; no monochrome-only chrome for Family A nav.

- [ ] **Step 3: Point `icons.ts` at final assets**

- [ ] **Step 4: Visual spot-check assets in isolation (optional)**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(client): refresh custom colorful nav SVGs"
```

---

### Task 9: Rebuild Sidebar (visual only)

**Files:**
- Modify: `apps/client/src/components/Sidebar.tsx`
- Delete later: `apps/client/src/components/Sidebar.css` (stop importing now)
- Create: `apps/client/src/components/NavModuleTile.tsx` (optional extract)

**Interfaces:**
- Consumes: `NAV_MENU`, `hasPermissionAtom`, `sidebarOpenAtom`, `searchOpenAtom`, `UserAvatarMenu`
- Keep: `flattenLeaves`, section buckets, `isPathActive`, collapsed tooltips

- [ ] **Step 1: Remove `import "./Sidebar.css"`**

- [ ] **Step 2: Rebuild JSX with Tailwind**

Floating `aside`: `rounded-2xl border bg-card/95 shadow-sm`, width expanded `w-[272px]` / collapsed `w-20`.

- [ ] **Step 3: Nav rows via custom SVG tiles**

```tsx
<img src={item.icon} alt="" className="size-8 rounded-xl" />
// active: module wash + border-l-[3px] — use primary or data-module attribute
```

Prefer mapping href → module token class where possible.

- [ ] **Step 4: Search trigger uses Lucide `Search`**

Opens `setSearchOpen(true)` — same as today.

- [ ] **Step 5: Footer avatar only when parent says so**

Accept prop `showUserMenu?: boolean` from layout **or** read `sidebarOpen` + media query inside Sidebar:

```tsx
const showAvatarInSidebar = sidebarOpen && isLgUp;
{showAvatarInSidebar && <UserAvatarMenu variant="sidebar" />}
```

Implement `isLgUp` via `window.matchMedia("(min-width: 1024px)")` + resize listener or a tiny `useMediaQuery` hook.

- [ ] **Step 6: Preserve collapsed tooltips**

Keep fixed-position tooltip portal behavior.

- [ ] **Step 7: Manual test**

Expand/collapse, navigate with permissions, search opens, avatar only when expanded on desktop.

- [ ] **Step 8: Commit**

```bash
git commit -m "feat(client): rebuild Sidebar with Aurora Tailwind visuals"
```

---

### Task 10: Rebuild Topbar + PrivateLayout mesh

**Files:**
- Modify: `apps/client/src/components/Topbar.tsx`
- Modify: `apps/client/src/layouts/PrivateLayout.tsx`
- Stop importing: `Topbar.css`, `PrivateLayout.css` when replaced
- Modify: `UserMenuPopover.tsx` styles → Tailwind (keep logic)

**Interfaces:**
- Keep: `findPageMeta`, unread query, push notification effect, locale/theme controls
- P12: topbar avatar only when `!showAvatarInSidebar`

- [ ] **Step 1: PrivateLayout structure**

```tsx
<div className="aurora-mesh min-h-screen">
  <div className="flex gap-3 p-3 min-h-screen">
    <Sidebar />
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <Topbar />
      <main className="min-h-0 flex-1 overflow-auto rounded-2xl bg-card/50 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  </div>
  <NotificationDrawer />
  <AiAssistant />
  <SearchPalette />
  <UserMenuPopover /> {/* single host */}
</div>
```

Adjust classes for collapsed sidebar width transitions.

- [ ] **Step 2: Topbar tools with Lucide**

Bell + badge, theme, locale — Lucide icons. Page title from existing meta logic.

- [ ] **Step 3: Avatar P12 in Topbar**

```tsx
{!showAvatarInSidebar && <UserAvatarMenu variant="topbar" />}
```

Share the same `showAvatarInSidebar` computation (lift to layout and pass props, or shared hook `useAvatarPlacement()`).

- [ ] **Step 4: Restyle UserMenuPopover with Tailwind**

Keep `user-menu-anchor`, outside click, logout handlers.

- [ ] **Step 5: Mobile**

At `<lg`, sidebar can be `Sheet` controlled by `sidebarOpenAtom` OR overlay — pick simplest that preserves atom. Topbar always shows menu toggle + avatar.

- [ ] **Step 6: Verify single avatar**

Desktop expanded: sidebar only. Collapsed: topbar only. Resize across 1024px boundary.

- [ ] **Step 7: Typecheck + commit**

```bash
git commit -m "feat(client): rebuild shell layout with P12 avatar placement"
```

---

### Task 11: Restyle SearchPalette + NotificationDrawer chrome

**Files:**
- Modify: `apps/client/src/components/SearchPalette.tsx` (+ delete css when done)
- Modify: `apps/client/src/components/NotificationDrawer.tsx` (+ css)

- [ ] **Step 1: SearchPalette on shadcn Command/Dialog**

Keep open atom + navigation behavior.

- [ ] **Step 2: NotificationDrawer on Sheet**

Keep queries/mutations.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(client): restyle search palette and notification drawer"
```

---

## Phase 4 — Showcase pages

### Task 12: Login + Landing (portfolio first impression)

**Files:**
- Modify: `apps/client/src/pages/LoginPage.tsx` (+ remove LoginPage.css usage)
- Modify: `apps/client/src/pages/LandingPage.tsx` (+ css)
- Modify: `apps/client/src/layouts/PublicLayout.tsx` if needed

- [ ] **Step 1: Login with Aurora mesh + Card + shadcn form controls**

Preserve auth mutation / validation logic.

- [ ] **Step 2: Landing expressive but on-token**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(client): Aurora Login and Landing pages"
```

---

### Task 13: Dashboard

**Files:**
- Modify: `apps/client/src/pages/Dashboard.tsx`
- Remove/stop: `Dashboard.css`
- Use: `KpiCard`, chart tokens, Recharts

- [ ] **Step 1: KPI row with module colors**

- [ ] **Step 2: Charts use CSS variable colors**

- [ ] **Step 3: Keep data fetching logic**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(client): rebuild Dashboard with Aurora KPIs and charts"
```

---

### Task 14: Customer index / detail / form

**Files:**
- Modify: `apps/client/src/pages/customer/CustomerIndexPage.tsx`
- Modify: `apps/client/src/pages/customer/CustomerDetailPage.tsx`
- Modify: `apps/client/src/pages/customer/CustomerFormPage.tsx`
- Related css: stop importing when replaced

- [ ] **Step 1: Index with FilterBar + DataTable density crm**

Preserve query keys, permissions, delete modal → `ConfirmDialog`.

- [ ] **Step 2: Detail with PageHeader + solid cards**

- [ ] **Step 3: Form with shadcn inputs + existing tanstack form logic**

- [ ] **Step 4: data-ai-context retained**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(client): rebuild Customer pages on Aurora kit"
```

---

### Task 15: Sales Order index + pipeline

**Files:**
- Modify: `apps/client/src/pages/sales-order/SalesOrderIndexPage.tsx`
- Modify: `apps/client/src/pages/sales-order/SalesOrderPipeline.tsx` (+ css)
- Modify: detail/form as needed for chrome consistency

- [ ] **Step 1: Table | Pipeline toggle in FilterBar area**

- [ ] **Step 2: DataTable for list; StatusChip for approval**

- [ ] **Step 3: Pipeline columns tinted by stage tokens**

Keep v1 read-only board behavior unless already interactive.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(client): rebuild Sales Order table and pipeline"
```

---

## Phase 5 — Remaining modules

### Task 16: Template sweep — master data

**Files:** Region, Area, Outlet, SKU, SKU Category index/detail/form pages

- [ ] **Step 1: Apply Index template (FilterBar + DataTable crm)**

- [ ] **Step 2: Apply Detail + Form templates**

- [ ] **Step 3: Compact nested tables where line items exist**

- [ ] **Step 4: Commit per domain or one commit**

```bash
git commit -m "feat(client): Aurora template sweep for master data modules"
```

---

### Task 17: Template sweep — ops + admin + AI

**Files:** Visit Log, Action Program, Event Proposal, Email CRM, Users, Access Control, Activity Logs, Notifications, Knowledge Base, AI Admin, Customer Assistant, Reports

- [ ] **Step 1: Same templates as Task 16**

- [ ] **Step 2: Reports hub restyle to tokens**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(client): Aurora template sweep for ops, admin, AI, reports"
```

---

## Phase 6 — Purge & QA

### Task 18: Delete old kit and dead CSS

**Files:**
- Delete: `apps/client/src/ui/**` (only when zero imports remain)
- Delete: obsolete `Sidebar.css`, `Topbar.css`, `PrivateLayout.css`, page `*.css` unused
- Modify: any remaining imports
- Modify: `.github/instructions/client-frontend.instructions.md` and `.github/copilot-instructions.md` — replace “No Tailwind / plain CSS only” with Aurora + Tailwind + shadcn rules

- [ ] **Step 1: Grep for old kit imports**

```bash
rg "from [\"'].*ui[\"']|from [\"']@?/?.*ui/" apps/client/src --glob '!**/components/ui/**'
rg "Sidebar.css|Topbar.css|from \"../ui\"|from \"../../ui\"" apps/client/src
```

- [ ] **Step 2: Fix stragglers → shadcn/domain components**

- [ ] **Step 3: Delete dead files**

- [ ] **Step 4: Update agent instructions for client stack**

- [ ] **Step 5: Commit**

```bash
git commit -m "chore(client): purge plain-CSS UI kit and update stack docs"
```

---

### Task 19: Verification gate

- [ ] **Step 1: Typecheck**

Run: `bun run check-types` (root or client)  
Expected: PASS

- [ ] **Step 2: Manual QA checklist**

- [ ] Custom SVG on every nav item (no Lucide in nav)
- [ ] Exactly one avatar (expanded vs collapsed vs mobile)
- [ ] CRM tables density + chips + money alignment
- [ ] Login, Dashboard, Customer, Sales Order pipeline screenshots-worthy
- [ ] Focus rings visible; reduced-motion OK
- [ ] i18n keys present in en + id for new copy

- [ ] **Step 3: Optional Playwright smoke**

Run existing client tests if stable: `cd apps/client && bun run test` (skip if env-heavy; note in PR)

- [ ] **Step 4: Final commit if fixes needed**

```bash
git commit -m "fix(client): Aurora QA follow-ups"
```

- [ ] **Step 5: Update context pack phase checkboxes to done**

Modify: `docs/plans/aurora-commerce/CONTEXT.md` phase list.

---

## Execution notes for agents

1. **Do not re-brainstorm** palette, stack, or avatar rules — frozen in CONTEXT.md.
2. **Frontend Engineer** owns all `apps/client` implementation; Backend only if a type import forces it (should not).
3. After Phase 3, page tasks can be parallelized **by domain folder** (no two agents on same file).
4. Prefer shadcn MCP for `add` operations; do not hand-copy outdated component source if CLI/MCP is available.
5. When mid-migration, temporary dual styling is OK; Phase 6 must leave a single system.
6. If a page is huge, restyle chrome first (header/table/buttons) and leave complex widgets working, then deepen.

---

## Definition of done (plan complete)

- [ ] All Phase 1–6 tasks checked
- [ ] Success criteria from spec §12 met
- [ ] `bun run check-types` passes
- [ ] Old `src/ui` kit not on runtime path
- [ ] Portfolio shell shows colorful custom nav + single avatar behavior

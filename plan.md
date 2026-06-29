# ERP Sales — UI/UX Redesign Plan

> Status: current. Replaces the old migration plan. Foundation (plain CSS, 60-30-10 tokens, dark mode via `.dark`, BEM naming) is already in place. The remaining problem is **cohesion** — the shell pieces don't agree with each other, and the pages haven't all been re-themed to the standard.

---

## 0. Quick context (what already exists)

| Area | Status |
|---|---|
| Tailwind / HeroUI | Removed (only `@tailwindcss/vite` in vitest config, not used in production) |
| Styling method | Plain CSS, BEM with prefix, co-located per `.tsx` |
| Token system | `src/styles/tokens.css` — 60% surfaces, 30% slate chrome, 10% emerald accent |
| Dark mode | `.dark` class on `<html>`, applied via `ThemeSync` reading `themeModeAtom` |
| Font | Plus Jakarta Sans (already loaded in `tokens.css`) |
| UI primitives | 24 in `src/ui/`, all with co-located CSS |
| Layout | `PrivateLayout` (Navbar + Sidebar + main) and `PublicLayout` |
| Pages | 51 across 13 features, all with co-located CSS (most follow template) |
| i18n | `react-intl`, `en` + `id`, keys follow `<domain>.<page>.<key>` |
| Server | tRPC v11 + Prisma + PostgreSQL, 20 routers, ULID IDs — **stable, do not change** |

---

## 1. The problem you just flagged

**Screenshot evidence (taken from running dev server at localhost:1420):**

- `current-dashboard.png` — light mode, sidebar open (collapsible `<details>` groups, "Menu" header)
- `current-dashboard-dark.png` — dark mode
- `current-sales-order.png` — light mode, list page (heading + search + filter chips + add button, no rows yet)

**The mismatch (also visible in the CSS):**

| | Navbar | Sidebar (desktop ≥1024px) |
|---|---|---|
| Position | `sticky; top: 16px; margin: 0 16px;` — **floating inset from edges** | `sticky; top: 0; left: 0;` — **flush to viewport edges** |
| Background | `rgba(255,255,255,0.85)` + `backdrop-filter: blur(12px)` — **glass** | `var(--color-surface-1)` — **solid white** |
| Border | `1px solid var(--color-border)` | none |
| Radius | `12px` rounded | `0` (no rounding) |
| Shadow | `var(--shadow-sm)` (and `md` on hover) | none |
| Behavior | pill floating over content | flat wall attached to viewport |

So on desktop the navbar is a **floating glass card** while the sidebar is a **flat flush wall**. Two different visual languages fighting each other. The result: the navbar looks detached, the sidebar looks unfinished, and the page content has to fight both surfaces.

> The old plan picked "floating glass" for the navbar and "flush surface" for the sidebar, then walked away. That decision was never reconciled.

---

## 2. Design direction (locked)

### 2.1 Pick a side: **Floating Glass Shell (unified)**

Both navbar and sidebar become **floating glass cards**, inset 16px from viewport edges on desktop, with consistent radius, border, shadow, and backdrop blur. The main content area lives in the gap between them.

| Choice | Decision | Why |
|---|---|---|
| Style | **Floating glass + modern minimalist** | Already partly built; the existing dark mode is a 10/10 on glass; user said "60-30-10 mandatory" which suits clean glass |
| Shell | **Both shell pieces float** with identical radius (16px), border (1px slate-200 / slate-800 dark), shadow (`shadow-md`), and backdrop blur (14px) | Eliminates the mismatch in one stroke |
| Accent | **Emerald `#10b981`** (no change) | Already in use, reads as "approved / money / growth" which fits an ERP |
| Density | **Compact ERP** with comfortable fallback | Tighter rows + smaller type in tables, generous padding in dashboards. Real power-user feel without losing readability. |
| Mobile | **Responsive web, Tauri-friendly** | Same code, sidebar becomes a slide-over drawer, navbar sticks to top, tables collapse to card lists at `<768px` |
| Scope | **Token + layout shell + UI primitives first**, then migrate remaining 13 feature pages | Thinnest possible blast radius. Pages keep their CSS, but the new system re-themes them by overriding shared primitives. |
| Server changes | **None** | All state stays in Jotai + localStorage. `themeModeAtom` already exists. |

### 2.2 Anti-patterns we will NOT ship

- ❌ `scale()` on hover for grid items (layout shift)
- ❌ `bg-white/10` glass in light mode (invisible)
- ❌ `text-slate-400` for body text (contrast < 4.5:1)
- ❌ Mixing two visual languages in the shell
- ❌ `className` on HeroUI-style components (HeroUI is removed; just don't reintroduce it)
- ❌ Emoji as UI icons
- ❌ Hardcoded user-visible strings (i18n required)
- ❌ `bg-glass` with no `backdrop-filter` fallback
- ❌ Animations without `prefers-reduced-motion` guard
- ❌ Color as the only status signal (pair with icon/text)

---

## 3. Token rebalance (Phase 0)

The 60-30-10 rule is already structurally correct, but the shell needs **three new tokens** to express the floating glass concept without each component re-declaring the same values.

Add to `src/styles/tokens.css`:

```css
/* === Shell layout (new) === */
--shell-pad:          16px;            /* gap from viewport edges to floating shell pieces */
--shell-radius:       16px;            /* unified radius for navbar AND sidebar */
--shell-border:       1px solid var(--color-border);
--shell-shadow:       var(--shadow-md);
--shell-blur:         14px;
--shell-bg:           rgba(255, 255, 255, 0.82);
--shell-bg-mobile:    var(--color-surface-1);   /* solid on mobile where blur is wasteful */
--sidebar-width:      260px;
--sidebar-collapsed:  72px;
--navbar-height:      64px;            /* was 56; bump for visual weight parity with sidebar */

.dark {
  --shell-bg: rgba(15, 23, 42, 0.72);
}
```

**Why**: every shell component will use the same 6 tokens. If you change radius or blur, it changes everywhere. No drift.

---

## 4. Shell redesign (Phase 1)

**Goal**: Navbar and Sidebar look like siblings, not strangers.

### 4.1 Navbar.css (rewrite)

```css
.nav-bar {
  position: sticky;
  top: var(--shell-pad);
  left: var(--shell-pad);
  right: var(--shell-pad);
  z-index: var(--z-sticky);
  height: var(--navbar-height);
  margin: 0;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-radius: var(--shell-radius);
  background: var(--shell-bg);
  backdrop-filter: blur(var(--shell-blur));
  -webkit-backdrop-filter: blur(var(--shell-blur));
  border: var(--shell-border);
  box-shadow: var(--shell-shadow);
  transition: box-shadow 200ms var(--ease-default);
}

.nav-bar:hover { box-shadow: var(--shadow-lg); }

@media (max-width: 768px) {
  .nav-bar {
    top: 0; left: 0; right: 0;
    border-radius: 0;
    border-left: 0; border-right: 0; border-top: 0;
    backdrop-filter: none; -webkit-backdrop-filter: none;
    background: var(--shell-bg-mobile);
  }
}
```

**Changes vs. today**:
- `top: 16px` (was already 16, but locked to `--shell-pad`)
- `right: 16px` added — today the navbar only constrains left/right via `margin: 0 16px`, which can look asymmetric with very wide viewports
- `height: 64px` (up from 56) — visually balances the now-larger sidebar
- Mobile: drops glass entirely, becomes a solid header (same as today)

### 4.2 Sidebar.css (rewrite)

```css
.sidebar-panel {
  position: sticky;
  top: var(--shell-pad);
  left: var(--shell-pad);
  bottom: var(--shell-pad);
  width: var(--sidebar-width);
  z-index: var(--z-sticky);
  display: flex;
  flex-direction: column;
  border-radius: var(--shell-radius);
  background: var(--shell-bg);
  backdrop-filter: blur(var(--shell-blur));
  -webkit-backdrop-filter: blur(var(--shell-blur));
  border: var(--shell-border);
  box-shadow: var(--shell-shadow);
  overflow: hidden;
  transition: width 250ms var(--ease-default);
}

@media (max-width: 1023px) {
  .sidebar-panel {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    border-radius: 0;
    backdrop-filter: none;
    background: var(--shell-bg-mobile);
    transform: translateX(0);
    transition: transform 250ms var(--ease-default);
    box-shadow: none;
    border: none;
    border-right: var(--shell-border);
  }
  .sidebar-panel--closed { transform: translateX(-100%); }
}

@media (min-width: 1024px) {
  .sidebar-panel--closed { width: var(--sidebar-collapsed); }
}
```

**Changes vs. today**:
- On desktop the sidebar **floats** like the navbar (`top: 16px`, `border-radius: 16px`, glass bg + blur, border + shadow). Same look, same tokens.
- On mobile it falls back to a full-height solid drawer (no blur, full-width when open, hidden via `translateX(-100%)` when closed). Same as today.
- Desktop "closed" state keeps the floating card, just narrows to 72px (icon rail).

### 4.3 PrivateLayout.css (rewrite)

The layout must give the floating shell pieces room to breathe. Today it has `padding-top: 16px` on the body — that's only enough for a flat-top sidebar. With a floating sidebar that has `top: 16px` AND `bottom: 16px`, the body needs vertical padding matching the shell.

```css
.priv-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--color-surface-0);
}

.priv-layout__body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px;
  gap: 16px;            /* space between sidebar and main */
}

.priv-layout__main {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 32px;
  border-radius: var(--shell-radius);
  background: var(--color-surface-1);
  border: var(--shell-border);
  box-shadow: var(--shell-shadow);
}

@media (max-width: 1023px) {
  .priv-layout__body { padding: 0; gap: 0; }
  .priv-layout__main { border-radius: 0; border: none; box-shadow: none; padding: 16px; }
}
```

**Why**: the main content area becomes a **third glass card** in the shell family (sidebar / navbar / main), but rendered as the "primary surface" (solid surface-1, not glass). The shell reads as one cohesive design language with three surfaces stacked in a layout.

### 4.4 Visual after (target)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │  ← navbar: floating glass
│   │ ≡  CRM                              🌐 ☀ Admin ▾ │   │
│   └──────────────────────────────────────────────────┘   │
│                                                          │
│   ┌────────────┐  ┌──────────────────────────────────┐   │
│   │ ☰ Menu  ✕  │  │                                  │   │
│   ├────────────┤  │  page content                    │   │
│   │ Dashboard  │  │  (this is the surface-1 card,    │   │
│   │ Master ▾   │  │   not glass, but same radius/    │   │
│   │  Region    │  │   border/shadow)                 │   │
│   │  Area      │  │                                  │   │
│   │  Customer  │  │                                  │   │
│   │  ...       │  │                                  │   │
│   └────────────┘  └──────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Three cards, same radius/border/shadow family. Navbar is glass (so it sits over content when scrolling). Sidebar is glass (so it sits over the page bg). Main is solid surface-1 (so the content reads as the focal point). All three float with 16px gaps from the viewport edges.

On mobile: navbar → flat top bar. Sidebar → off-canvas drawer. Main → edge-to-edge content. Glass is removed in mobile to save GPU and avoid blur-on-blur artifacts.

---

## 5. UI primitive rebalance (Phase 2)

The 24 primitives in `src/ui/` mostly follow the 60-30-10 tokens already. The Phase 2 work is:

| Primitive | Change | Why |
|---|---|---|
| `Card` | Already uses surface-1 + border + shadow-sm. No change needed. | Already on-brand. |
| `Button` | Add `box-shadow: var(--shadow-sm)` to primary variant. Hover: `shadow-md`. | Buttons feel anchored; today they're flat pills. |
| `Modal` | Already scaleIn. No change. | — |
| `Table` | Tighten row padding from `12px 16px` → `10px 14px`. Active row gets `border-left: 3px solid var(--color-accent-500)`. Hover: `surface-2`. | Density target. |
| `Pagination` | Use accent-500 background for active page (already does). Add subtle ring on focus. | — |
| `Chip` | Add a `variant="outline"` for neutral/outlined badges. | Some pages overuse solid chips. |
| `Input` / `Textarea` / `Select` | Add `accent-500` focus ring with `box-shadow: 0 0 0 3px var(--color-accent-500/0.20)`. | Today only border changes on focus; ring makes it pop. |
| `Toast` | Keep slideInRight. Make sure dark mode uses `--shell-bg` for the toast surface. | — |
| `Dropdown` | Slide-down already. Make sure it gets the same `--shell-shadow` as the shell. | Visual family. |
| `Avatar` | Add accent ring on hover. | — |

**No new primitives needed.** No new files. Just refinements.

---

## 6. Page migration (Phase 3)

13 feature domains already follow the template (per the old plan). Phase 3 audits each one and applies the new density + table treatment:

| Domain | Status today | Action |
|---|---|---|
| Region | 3 pages, co-located CSS | Audit dark mode parity; tighten table density |
| Area | 3 pages | same |
| Customer | 3 pages, no page CSS (uses globals) | Add per-page CSS, apply table treatment |
| Outlet | 3 pages | audit |
| SKU Category | 3 pages | audit |
| SKU | 3 pages, has CSS | tighten table |
| Sales Order | 3 pages, has detailed form CSS | already most-polished — use as reference |
| Invoice | 3 pages, no page CSS | add per-page CSS |
| Visit Log | 3 pages | audit + tighten form date pickers |
| Action Program | 3 pages, no page CSS | add per-page CSS, polish approval timeline |
| Event Proposal | 3 pages, no page CSS | same |
| Users | 3 pages, no page CSS | add per-page CSS |
| Roles | 2 pages (no detail) | add RoleDetailPage? optional |

**Per-page audit checklist**:
1. Light/dark parity on every surface
2. Table density (10/14 row pad, 3px active accent border on the left)
3. Form input focus ring (accent-500/0.20)
4. Status colors (success=accent, warning=amber, danger=red, info=blue) — never green-where-it-should-be-blue
5. All buttons have `min-height: 44px` on `<768px`
6. `data-ai-context` attribute on the page root

---

## 7. Cross-cutting polish (Phase 4)

| Item | Action |
|---|---|
| Login page | Centered card with accent gradient header, glass background. Match shell. |
| Landing page | Hero + feature grid using the 60-30-10 palette. CTA button uses accent. |
| Dashboard | Bento grid (CSS Grid, 4-col on desktop). Stat cards get a 3px accent gradient top bar. Hover: shadow lift (no scale). |
| Notification popover | Bell icon in navbar with unread count badge. Popover panel slides down, shows last 10. (Already planned in old plan, not yet built.) |
| Activity logs | Add date-range + resource + action filter chips. |
| Global search (Cmd+K) | Out of scope for this redesign — separate task. |
| Empty states | Centered icon (24×24 from solar set) + 1-line title + 1-line description + optional CTA. All primitives already exist. |

---

## 8. Server changes required

**None.** All design state is client-side:
- `themeModeAtom` (Jotai + localStorage `theme-mode`)
- `localeAtom` (Jotai + cookie + localStorage `app-locale`)
- `sidebarOpenAtom` (Jotai)
- `authUserAtom`, `authTokenAtom`, `userPermissionsAtom` (Jotai + localStorage)

If we later want server-persisted theme/locale, we add an `apps/server/src/routers/userPreference.ts` with a single `get` + `update` procedure. Defer.

---

## 9. Execution order (verifiable gates)

Each phase ends in a verifiable state. Don't start the next phase until the gate passes.

| # | Phase | Files touched | Gate |
|---|---|---|---|
| 0 | Tokens | `styles/tokens.css` | `bun run check-types` passes |
| 1a | Navbar shell | `components/Navbar.css`, `components/Navbar.tsx` | Light + dark + mobile screenshots show cohesive shell |
| 1b | Sidebar shell | `components/Sidebar.css` | Same — sidebar floats, matches navbar radius/shadow |
| 1c | PrivateLayout | `layouts/PrivateLayout.css` | Main content reads as a card, not a void |
| 2 | UI primitives | `ui/Button.css`, `ui/Input.css`, `ui/Table.css`, `ui/Pagination.css` (4 files) | Buttons cast a shadow, inputs have focus ring, tables are denser |
| 3 | Page migration | 6–10 page CSS files, depending on audits | `bun run check-types` + `bun run build` clean |
| 4 | Dashboard, Login, Landing | `pages/Dashboard.css`, `pages/LoginPage.css`, `pages/LandingPage.css` | Screenshots match target |
| 5 | Final QA | n/a | All four viewports: 375 / 768 / 1024 / 1440, light + dark, all pages |

**Definition of done** (per phase):
- Light mode screenshot
- Dark mode screenshot
- Mobile (375px) screenshot
- `bun run check-types` → 0 errors
- `bun run lint` → 0 warnings
- No `className` reintroduced on removed primitives
- All status colors come from semantic tokens (not raw hex)

---

## 10. Risks & watch-outs

| Risk | Mitigation |
|---|---|
| Backdrop-filter perf on low-end Tauri targets | Already mobile-disabled. Add `will-change: backdrop-filter` only when shell is visible, not always. |
| Glass + chart overlap looks muddy | Charts always live inside the main content card (surface-1, not glass). Navbar/sidebar never overlap chart pixels. |
| Floating main panel makes long content feel boxed in | Card has `border-radius: 16px` and `shadow-md` only; content can scroll freely inside. Tested at 1440px: looks intentional, not cramped. |
| Light/dark contrast on glass surfaces | Already validated at WCAG AA in the existing tokens. Re-test after the `--shell-bg` change. |
| Sidebar active indicator drift when groups collapse | The `<details>` group state is local; active class is computed from `useLocation()` each render. No state mismatch. |
| Touch targets < 44px on mobile | Already a project rule (`PrivateLayout` 768px breakpoint enforces 44px min on buttons). Audit each form. |
| Reintroducing Tailwind | Block by lint rule (no `className=".*\b(flex|grid|p-\d|m-\d|text-).*"` containing Tailwind-style classes in `apps/client/src/`). Or just discipline — we removed it once already. |

---

## 11. Open questions for you (decision needed before Phase 1)

1. **Shell scope**: full wipe (rewrite `PrivateLayout` + `Navbar` + `Sidebar` to be 3 floating cards) — **default, recommended**. Or keep current 2-card shell and just fix the sidebar to match the floating navbar?
2. **Main content surface**: keep the new main-panel as a third card (matches shell family, but adds 1 layer of visual depth) — **default**. Or keep main flush to viewport and only shell pieces float (less depth, more focus on content)?
3. **Navbar height**: bump 56 → 64 for visual parity with the larger floating sidebar — **default**. Or keep 56 and let the sidebar dominate vertically?
4. **Bento dashboard**: yes on the new dashboard (mixed-size stat card grid) — **default**. Or keep the current 4-column KPI strip + 2-up chart row?
5. **Notification popover**: build it now (Phase 4) or defer? Affects scope by ~1 day.

Defaults above. Reply with overrides and I'll lock them in.

---

## 12. What's explicitly out of scope

- Tailwind reintroduction
- HeroUI reintroduction
- Backend changes (Prisma migrations, new procedures, seed updates)
- New tRPC endpoints
- Tauri-specific features (push notifications are already in `lib/push-notification.ts`)
- 3D warehouse canvas on dashboard (already in `Dashboard.tsx` via `@react-three/*`, leave it)
- Global Cmd+K search
- Multi-tenant theming
- White-label / themable brand color

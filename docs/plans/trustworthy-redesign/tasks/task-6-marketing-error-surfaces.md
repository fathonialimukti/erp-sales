### Task 6: Marketing & error surfaces — align to opaque/calm

**Agent:** Frontend Engineer
**Layer:** 2 (parallel) — depends on T1

**Files:**
- Modify: `apps/client/src/pages/NotFoundPage.tsx`
- Modify: `apps/client/src/pages/RouteErrorPage.tsx`
- Modify: `apps/client/src/layouts/PublicLayout.tsx`
- Modify: `apps/client/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes: T1 opaque surface law + tokens (`.bold-mesh` softened)
- Produces: same exports; calmer opaque surfaces

**Frozen contract:**
- `NotFoundPage.tsx` / `RouteErrorPage.tsx`: root `className="bold-mesh ..."` → `className="bg-background ..."` (drop bold-mesh). Keep layout, copy, CTA, `useMeta`.
- `PublicLayout.tsx`: `bg-card/70` (logo bar, line ~200) → `bg-card` opaque. Keep nav, footer, outlet, mobile menu logic. Remove any `backdrop-blur-*`.
- `LandingPage.tsx`: **surface treatment only — NOT a content redesign.** Replace translucency/blur:
  - `bg-card/80` (line ~577 badge) → `bg-card`
  - `bg-card/70 ... backdrop-blur-sm` (line ~589 hero card) → `bg-card border-border shadow-sm` (no blur)
  - `bg-card/40` (lines ~607, ~724 sections) → `bg-card` or `bg-muted` (opaque)
  - all `bg-card/60` (lines ~835, ~842, ~950, etc.) → `bg-card`
  - remove every `backdrop-blur-*`
  - Keep all section structure, copy, i18n, CTAs, chart/demo blocks

**Steps:**
- [ ] Per file: apply the opaque replacements; remove backdrop-blur; drop bold-mesh usage
- [ ] LandingPage: scope strictly to surface classes — do not restructure sections or rewrite copy
- [ ] Run `bun run check-types`; self-review

**Do not:** redesign LandingPage content/hero/sections (surface-only). Do not touch LoginPage (T3) or PrivateLayout (T4). Do not introduce gray text. `ui-ux-pro-max` available.

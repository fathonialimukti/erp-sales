### Task 5: Shell chrome — opaque, no blur, no shimmery ring

**Agent:** Frontend Engineer
**Layer:** 2 (parallel) — depends on T1

**Files:**
- Modify: `apps/client/src/components/Sidebar.tsx`
- Modify: `apps/client/src/components/Topbar.tsx`
- Modify: `apps/client/src/components/DataTable.tsx`
- Modify: `apps/client/src/components/FilterBar.tsx`
- Modify: `apps/client/src/components/NavButtonGroup.tsx`
- Modify: `apps/client/src/components/UserAvatarMenu.tsx`

**Interfaces:**
- Consumes: T1 opaque surface law + tokens
- Produces: same component APIs; calmer opaque chrome

**Frozen contract — per file:**
- `Sidebar.tsx`: root panel `bg-sidebar/95 backdrop-blur-xl ring-1 ring-primary/5` → `bg-sidebar border border-border shadow-sm` (opaque, no blur, no ring). Keep `rounded-2xl`, nav logic, `NavModuleTile`, permission filtering, collapse behavior, search button.
- `Topbar.tsx`: `bg-card/90 backdrop-blur-xl ring-1 ring-primary/5` → `bg-card border border-border shadow-sm`. Keep `sticky top-0 z-30`, height, page-meta, locale/theme/notification wiring.
- `DataTable.tsx`: `border-primary/15 ... ring-1 ring-primary/5` → `border-border shadow-sm` (drop primary-tinted border + ring). Keep `rounded-xl`, overflow-auto, table internals.
- `FilterBar.tsx`: `bg-card/50` → `bg-card` (opaque). Keep `border-border/70` → `border-border`, layout, gap.
- `NavButtonGroup.tsx`: `bg-card/70` → `bg-card` (opaque). Keep `border-border/80` → `border-border`, pill layout, `p-0.5`.
- `UserAvatarMenu.tsx`: `bg-card/60` → `bg-card` (opaque) on the trigger; keep hover `hover:bg-accent`, focus ring, avatar, menu.

**General rule:** every `bg-card/NN` and `bg-sidebar/NN` opacity → solid `bg-card` / `bg-sidebar`. Every `backdrop-blur-*` → remove. Every `ring-primary/5` / `ring-primary/10` → remove (keep functional `ring-ring` focus rings). `border-primary/NN` decorative → `border-border`.

**Steps:**
- [ ] Per file: read current chrome classes, apply the frozen replacements
- [ ] Preserve all logic, props, a11y (focus rings via `ring-ring` stay), responsive behavior
- [ ] Run `bun run check-types`; spot-check nav + a table render
- [ ] Self-review: no floaty surfaces remain; all chrome reads grounded/opaque

**Do not:** remove functional focus rings (`focus-visible:ring-ring`). Do not touch PrivateLayout/PageHeader/Login (other tasks). Do not introduce gray text. `ui-ux-pro-max` available.

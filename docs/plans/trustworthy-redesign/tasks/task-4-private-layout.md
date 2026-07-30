### Task 4: PrivateLayout — opaque grounded work stage

**Agent:** Frontend Engineer
**Layer:** 2 (parallel) — depends on T1

**Files:**
- Modify: `apps/client/src/layouts/PrivateLayout.tsx`

**Interfaces:**
- Consumes: T1 new tokens (`.bold-mesh` softened/removed by T1; opaque surface law)
- Produces: same `PrivateLayout` shell; same children (Sidebar, Topbar, main Outlet, NotificationDrawer, AiAssistant, SearchPalette); same sidebar margin logic

**Frozen contract:**
- Resource: app shell (no domain router)
- Root: drop `bold-mesh` className → flat `bg-background` (T1 softened the rule; this stops using it)
- Main work stage: **opaque** — replace `bg-card/85 backdrop-blur-[2px] ring-1 ring-primary/5` → `bg-card border border-border shadow-sm` (solid, grounded)
- Keep: `rounded-2xl`, `p-4 md:p-6`, `min-h-0 flex-1 overflow-auto`, `PageTransition` wrapper, sidebar margin transition
- Keep: all effect wiring (requestPushPermission, setupTauriNotifications, navigate, cleanupRef)

**Steps:**
- [ ] Read current `PrivateLayout.tsx`
- [ ] Root div: `className="bold-mesh relative min-h-screen"` → `className="relative min-h-screen bg-background"` (drop bold-mesh)
- [ ] Main element: `bg-card/85 ... ring-1 ring-primary/5 backdrop-blur-[2px]` → `bg-card border border-border shadow-sm` (drop opacity, blur, ring)
- [ ] Keep `data-ai-context` attr, sidebar margin classes, gap/padding, PageTransition
- [ ] Run `bun run check-types`; self-review

**Do not:** touch Sidebar/Topbar (T5 owns those). Do not change effect logic or routing. `ui-ux-pro-max` available.

### Task 3: LoginPage — light editorial trust panel

**Agent:** Frontend Engineer
**Layer:** 2 (parallel) — depends on T1

**Files:**
- Modify: `apps/client/src/pages/LoginPage.tsx`

**Interfaces:**
- Consumes: T1 new tokens + T1 Login recipe clause
- Produces: same exported `LoginPage`; same i18n keys (`login.*`); same form behavior (useForm, useAuthActions, navigate to /dashboard)

**Frozen contract:**
- Resource: auth surface (no domain router)
- Left aside (lg+): **light editorial trust panel** — `bg-background` (near-white, NOT dark `bg-foreground`)
  - Single solid Azure brand block (logo tile, `bg-primary text-primary-foreground`) — one confident anchor, not scattered
  - Headline + subtitle in `text-foreground` / `text-muted-foreground` (black/chromatic, not white-on-dark)
  - Real proof: compliance/audit-style badges OR one anchored stat block — **no pulsing, no glass cards**
  - Feature list: clean rows, `bg-muted` icon plates with `text-primary` icons, `text-foreground` titles
  - Testimonial (optional keep): `bg-card border-border` opaque card, NOT `bg-white/5 backdrop-blur-sm`
- Right form panel: stays light; keep `bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%)]` ONLY if subtle — otherwise flat `bg-background` with a `bg-card border-border shadow-sm` form Card
- Remove entirely: `animate-pulse`, `bg-[radial-gradient(circle,var(--primary)...)] blur-[80px]` (all 3 blobs), white grid overlay (`backgroundImage linear-gradient...48px 48px`), all `backdrop-blur-sm` + `bg-white/5` + `bg-white/10` + `border-white/10` glass

**Steps:**
- [ ] Read current `LoginPage.tsx` aside (dark + blobs + grid + glass)
- [ ] Replace aside root: `bg-background text-foreground` (drop `bg-foreground text-background`)
- [ ] Remove all 3 radial blob spans + the grid overlay span
- [ ] Replace glass stat cards (`bg-white/5 border-white/10 backdrop-blur-sm`) → `bg-muted border-border` opaque; text `text-foreground` / `text-muted-foreground`
- [ ] Replace feature list glass (`bg-white/10`) → `bg-muted` plates; titles `text-foreground`, desc `text-muted-foreground`
- [ ] Replace testimonial `bg-white/5 backdrop-blur-sm` → `bg-card border-border`
- [ ] Brand block: single `bg-primary text-primary-foreground` tile (keep `Sparkles` or swap to a more corporate icon)
- [ ] Right form: keep light; soften or remove the radial gradient; form Card `bg-card border-border shadow-sm`
- [ ] Verify i18n keys unchanged; `useMeta` unchanged; form submit path unchanged
- [ ] Run `bun run check-types`; self-review for "would a procurement buyer trust this?"

**Do not:** change form logic, auth flow, or i18n keys. Do not introduce gray text. `ui-ux-pro-max` available.

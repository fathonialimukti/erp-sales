### Task 1: Law thesis amendment + token re-tune (Foundation)

**Agent:** Frontend Engineer
**Layer:** 1 (sequential — everything else consumes this)

**Files:**
- Modify: `docs/design-system/DESIGN.md` (amend §1 Market & thesis, §2 Color law, §3 Typography; add PageHeader/Login/shell recipe clauses)
- Modify: `apps/client/src/index.css` (`:root` + `.dark` + `@theme inline` + `.bold-mesh` rule)

**Interfaces:**
- Consumes: current "Bold CRM" law + live tokens
- Produces: **new frozen contract** — Aurora Azure primary, opaque surfaces, flat PageHeader, light login, regular body weight, 8% module wash. All T2–T6 consume these tokens + recipes.

**Frozen contract:**
- Resource: design-system (cross-cutting, no domain router)
- Primary token: `--primary: oklch(0.5 0.13 242.749)` (Aurora Azure — chroma 0.24→0.13; L ~0.5 unchanged)
- `--muted-foreground`: stays chromatic Azure (L=0.32) — do NOT neutralize to gray
- Module wash: 14% → 8% everywhere it's encoded (KPI plates, nav active, empty tints)
- `.bold-mesh`: reduce to ≤3% tint or remove; background reads as flat `--background`
- Body font weight: `font-normal` (400) default; `font-semibold`/`font-bold` reserved for titles/KPI/totals/status/eyebrow
- PageHeader recipe: flat toolbar `bg-card` + `border-b border-border`, black text, module accent = 3px left rail + eyebrow color only, NO gradient fill, NO white-type hero
- Login recipe: light editorial trust panel `bg-background`, single solid Azure brand block, real proof points, NO radial blobs / grid overlay / glass cards / animate-pulse
- Shell recipe: opaque `bg-card`/`bg-sidebar` solid, NO `backdrop-blur`, NO `ring-primary/5`, 1px `border-border`

**Steps:**
- [ ] Amend DESIGN.md §1 thesis: rename "Bold CRM" → "Trustworthy Corporate"; rewrite brand thesis + signature + anti-signature (keep module-spectrum wayfinding, drop "bold color everywhere" mandate; add "restraint · structure · legibility")
- [ ] Amend §2: primary chroma 0.24→0.13; module wash 14%→8%; surface law = opaque, no backdrop-blur, no opacity-on-cards; PageHeader recipe clause; Login recipe clause
- [ ] Amend §3: font-weight law inverted — body `font-normal`, bold reserved for titles/KPI/totals/status/eyebrow; keep Inter Variable, radius, tabular-nums
- [ ] Update `index.css` `:root` + `.dark`: `--primary` chroma to 0.13 (both light + dark); keep `--muted-foreground` chromatic; adjust module wash if encoded as color-mix percentages; soften `.bold-mesh` to ≤3% or remove visible blobs
- [ ] Run `bun run check-types` from repo root; confirm no token breakage
- [ ] Self-review: law + tokens in sync; no gray introduced; module accents still present (just calmer)

**Do not:** touch any component/page file (T2–T6 own those). Do not neutralize `--muted-foreground` to gray. Do not remove module spectrum (wayfinding stays). Do not edit via shell — use VS Code edit tools.

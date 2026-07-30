### Task 10: Solid module-colored page headers + nav module theming

**Agent:** Frontend Engineer
**Origin:** User request — "return back page header into solid color, and each module has individual color/theme so implement that into each module, nav too."

## Goal
Re-introduce **solid module-colored page header bands** for strong wayfinding (Dynamics 365 / SAP Fiori pattern: "I'm in Customers = blue header, Visit Logs = green header"). Each module gets its own theme color applied to:
1. The `PageHeader` — solid colored band with **white** title/eyebrow/icon-plate (module color is the header fill)
2. The `NavModuleTile` active state — module-colored left bar + icon tint (already partly there; strengthen so the active tile reads as "this is the module you're in")

This **partially evolves T2's flat-toolbar decision**. The user is explicitly choosing wayfinding-presence over austere-flat. Keep the rest of T1–T9 trustworthy-corporate work: opaque grounded surfaces, black data in grids, calm `--muted-foreground`. ONLY the header goes solid-colored; tables/cards stay opaque-black-data.

## Technical constraint — module colors must be header-safe (white text AA contrast)
Current module colors in `:root` are tuned for the **8% wash** recipe (light enough that 8% over white reads as a tint). Several are too light (L ≥ 0.55) to sit under **white text on a solid fill**. Verify each: white text on the solid module color must hit WCAG AA (~4.5:1). The current suspects (need deep-shifting to L≈0.42–0.48 band, keep hue + chroma ~0.20):
- `--module-visit: oklch(0.55 0.2 160)` → too light (green) → deepen to ~`oklch(0.45 0.2 160)`
- `--module-sku: oklch(0.62 0.2 85)` → too light (warm yellow) → deepen to ~`oklch(0.5 0.19 85)` (yellow is the hardest for white contrast — verify; may need L~0.46)
- `--module-outlet: oklch(0.55 0.18 200)` → borderline → deepen to ~`oklch(0.45 0.2 200)`
- `--module-event: oklch(0.58 0.2 20)` → too light (red-orange) → deepen to ~`oklch(0.46 0.21 20)`
- `--module-knowledge: oklch(0.55 0.18 140)` → borderline → deepen to ~`oklch(0.45 0.2 140)`
- `--module-email: oklch(0.52 0.18 210)` → ok but deepen slightly to ~`oklch(0.46 0.2 210)` for consistency band
- `--module-customer: oklch(0.52 0.2 250)` → ok, deepen to ~`oklch(0.46 0.2 250)`
- `--module-order: oklch(0.5 0.22 242.749)` → ok, keep or deepen to ~`oklch(0.46 0.22 242)`
- `--module-planning: oklch(0.52 0.2 280)` → ok, deepen to ~`oklch(0.46 0.2 280)`
- `--module-user: oklch(0.5 0.18 270)` → ok, deepen to ~`oklch(0.45 0.2 270)`
- `--module-report: oklch(0.5 0.18 230)` → ok, deepen to ~`oklch(0.45 0.2 230)`
- `--module-ai: oklch(0.55 0.2 300)` → too light → deepen to ~`oklch(0.45 0.2 300)`
- `--module-region: oklch(0.52 0.18 220)` → ok, deepen to ~`oklch(0.46 0.2 220)`
- `--module-area: oklch(0.54 0.18 190)` → borderline → deepen to ~`oklch(0.45 0.2 190)`

**Target band: light mode L≈0.45–0.48, chroma ~0.20.** This makes every module header-safe for white text while keeping each hue identity distinct. Dark-mode `--module-*` already targets L~0.68–0.78 (light colors for dark surfaces) — leave those **unchanged** (they're for the active-wash recipe on dark sidebar, not for solid headers in light mode).

**CRITICAL — wash recipe must still work:** The NavModuleTile active wash uses `color-mix(in srgb, ${accent} 8%, transparent)` — deepening the modules to L~0.45 makes the 8% wash slightly deeper too. Verify the 8% active wash still reads as a *subtle tint*, not a saturated block. If it saturates too much, drop the wash to 6%. Keep the 3px active left bar at full module color (that's the strong wayfinding cue).

## Scope

### File 1 — `apps/client/src/index.css` (module color re-tune + keep wash recipe)
- Update each light-mode `--module-*` to the header-safe band above (verify white-on-solid AA contrast per color; adjust L down further if a color still fails, especially `sku` yellow).
- Leave dark-mode `--module-*` unchanged.
- Leave `--primary`, `--muted-foreground`, `.bold-mesh`, surface tokens unchanged (T1/T9 hold).

### File 2 — `apps/client/src/components/PageHeader.tsx` (solid module header)
- When `module` is set (accent present): header root becomes **solid module color** — `style={{ backgroundColor: accent }}` (or a `color-mix` solidifying the module color to ~92% opacity to soften slightly — your call, but it must read as a solid colored band, not a tint). Remove `bg-card` for module headers; keep `border-b border-white/15` or `border-black/10` for definition.
- When NO `module`: keep the current flat `bg-card border-b border-border` toolbar (Aurora-on-neutral fallback for Dashboard, generic pages).
- Module header chrome goes **white-type**: title `text-white font-bold`, eyebrow `text-white/90 font-bold uppercase`, description `text-white/80`, back button `text-white hover:bg-white/15`, icon plate `bg-white/15 text-white` (drop `bg-muted text-primary`), media plate `bg-white/15 text-white`.
- Keep the 3px left rail? On a solid colored header, a same-color 3px rail is invisible. **Replace with a `border-l-[3px] border-white/40`** (a white inset bar) for structure, OR remove the rail entirely on module headers (the solid color IS the wayfinding now). Your call — pick what reads cleaner.
- Keep `data-slot="page-header"` + `data-module={module}` attrs (tests/selectors).
- Keep the component API unchanged (`title, description?, module?, eyebrow?, onBack?, actions?, icon?, media?, className?`).

### File 3 — `apps/client/src/components/NavModuleTile.tsx` (strengthen active module state)
- Active wash: keep `color-mix(in srgb, ${accent} 8%, transparent)` OR drop to 6% if too saturated after the module deepening. Verify visually.
- Active 3px left bar: keep `border-left-color: accent` (full module color) — this is the strong nav wayfinding cue.
- Active icon: consider a subtle module-color tint on the icon plate when active (e.g. `bg-[color-mix(in_srgb,var(--module-X)_12%,transparent)]` on active) so the active tile reads "this module's color." Keep inactive tiles neutral (current behavior).
- Active label: `text-foreground` (black, current — keep). Do NOT colorize the label text by module (would re-speckle the nav).
- Keep all a11y (`focus-visible:ring-2 focus-visible:ring-ring`), collapsed behavior, hover, chevron, tooltip wiring.

### File 4 — `docs/design-system/DESIGN.md` (amend PageHeader recipe clause)
- Update the §2 "PageHeader recipe" clause: change from "flat toolbar `bg-card border-b border-border`, 3px left rail, black title" → **"Module headers: solid `--module-X` fill, white title/eyebrow/icon-plate, strong wayfinding band. Generic headers (no module): flat `bg-card border-b border-border`, black title, 3px primary rail. Module color must be header-safe (L≈0.45–0.48 light) for white-text AA contrast."**
- Add a note to the module-spectrum section: "Light-mode `--module-*` deepened to L≈0.45–0.48 for solid-header white-text contrast. Dark-mode stays L~0.68–0.78 for active-wash on dark sidebar."

## Rules
- VS Code edit tools only. NEVER shell/heredoc.
- Module colors: keep hue identity distinct (customer=indigo, outlet=cyan, order=azure, visit=green, sku=warm-yellow, planning=violet, event=red-orange, user=purple, report=steel-blue, email=sky, knowledge=emerald, ai=magenta, region=blue, area=teal). Only L (and minimal chroma) shifts.
- White text on solid module header MUST hit WCAG AA (~4.5:1) — verify each color, especially `sku` (yellow is hardest).
- Do NOT touch tables, cards, DataTable body cells (T9 black-data holds). Only PageHeader + NavModuleTile + module tokens go colored.
- Do NOT reintroduce `backdrop-blur`, `bg-card/NN` opacity, or gradient fills (solid color, not gradient — user said "solid color").
- Do NOT touch `--primary` or `--muted-foreground` (T1/T9 hold).
- `ui-ux-pro-max` available if you want a second opinion on module-color contrast.

## Verify before returning
- Run `bun run check-types` from repo root. Confirm clean.
- For EACH module color, sanity-check white-on-solid contrast (a quick mental OKLCH L check: L≤0.48 with chroma ~0.20 → white text should clear AA; `sku` yellow at L~0.46 is the risk — if it fails, push to L~0.42 and re-verify).
- Load `/region` and `/sales-order` in the browser (you have page `0986277d-...` for `/region`, and `b81a1e98-...` at `/sales-order`). Screenshot each: confirm a solid colored header band with white title, and the nav tile for that module shows the module color in its active left bar.
- Confirm a generic page (`/dashboard`) still shows the flat `bg-card` header (no module).

## Return to me
1. `index.css` — the new light-mode `--module-*` values (table: module | old | new | hue-identity preserved?)
2. `PageHeader.tsx` — the module-header chrome (root style, title/eyebrow/description/back/icon-plate classes; what you did with the 3px rail)
3. `NavModuleTile.tsx` — the active-state strengthening (wash %, left bar, icon tint, label color)
4. `DESIGN.md` — the amended PageHeader recipe clause + module-spectrum note
5. White-on-solid AA contrast check per module (especially `sku` yellow)
6. `bun run check-types` result
7. Screenshot finding: `/region` header solid colored? `/sales-order` header solid colored? `/dashboard` still flat `bg-card`?
8. Any deviation + why
9. One-sentence "does each module now have its own solid-color header + nav accent, with white text legible?" yes/no

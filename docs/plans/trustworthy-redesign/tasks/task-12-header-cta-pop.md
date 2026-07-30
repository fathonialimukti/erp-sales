### Task 12: Make header-action buttons pop on module gradient headers

**Agent:** Frontend Engineer
**Origin:** User feedback — "new data [button] on every page doesn't look stand out." The `<Button>` in `PageHeader` `actions` renders its default `bg-primary` (calm Aurora Azure) on top of the T11 module-gradient header band, so it muddies into the colored band instead of popping as the focal action.

## Root cause
T11 made the header chrome white-aware (title/eyebrow/icon/back all flip to white on the gradient), but the `<Button>` children passed via the `actions` prop are unstyled descendants — they keep their default `bg-primary text-primary-foreground` variant. On a vivid module-colored band, calm-Azure-on-module-blue reads as muddy, not "the main action."

## Fix (professional pattern: colored band carries wayfinding, white button is the focal CTA)

### File — `apps/client/src/components/PageHeader.tsx`
Inside the `(actions || media)` block, wrap the `{actions}` with a class that **forces descendant default-variant buttons to render as white-on-dark-text** when on a module header. Use a Tailwind arbitrary descendant selector scoped to `data-variant="default"` so only the primary CTA flips — ghost/secondary/outline buttons stay as-is (they already render legibly on the gradient).

Implementation approach (pick the cleanest that compiles):
- Add to the module-header branch of the actions wrapper a descendant override class:
  ```
  isModuleHeader && "[&_[data-slot=button][data-variant=default]]:bg-white [&_[data-slot=button][data-variant=default]]:text-primary [&_[data-slot=button][data-variant=default]]:hover:bg-white/90 [&_[data-slot=button][data-variant=default]]:border-transparent"
  ```
  (`text-primary` = deep Aurora Azure `oklch(0.5 0.13 242)` — dark enough on white for AA; if it reads too light, use `text-foreground` = near-black `oklch(0.16 0.02 260)`, which is the safe high-contrast choice on white. Prefer `text-foreground` for guaranteed AA + max pop.)
- The wrapper element is at ~line 195 (the `<div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:justify-end">`). Branch its className on `isModuleHeader`.
- Keep ghost/secondary/outline button variants untouched — they already render fine (ghost is transparent + white text via inheritance; secondary/outline have their own borders that read on the band).
- Do NOT change the `actions` prop API. Do NOT touch pages (they pass plain `<Button>` children; the wrapper handles variant-flipping). This fixes ALL ~24 page headers at once via the shared component.

### Contrast verification
White button bg (`#fff`) + `text-foreground` (`oklch(0.16 0.02 260)`, near-black) = ~16:1, clears AAA. The button pops as the single high-contrast focal point on the colored gradient band — standard Stripe/Linear/Dynamics section-header CTA pattern.

## Rules
- VS Code edit tools only. NEVER shell/heredoc.
- ONLY flip the **default** variant (`data-variant="default"`) descendants on **module headers**. Leave ghost/secondary/outline variants and generic (no-module) headers untouched.
- Do NOT touch `index.css` tokens, NavModuleTile, tables, cards, data cells.
- Do NOT reintroduce `backdrop-blur` or opacity-on-card.
- `ui-ux-pro-max` available for a second opinion on the CTA-on-band pattern.

## Verify before returning
- Run `bun run check-types`. Confirm clean.
- Browser page `0986277d-559d-4994-acf3-41f41c3fc144` is at `/region` (the "New region" button). Use `run_playwright_code` with `page.evaluate` to read the button's computed `backgroundColor` (should be white `rgb(255,255,255)`) and `color` (should be near-black `oklch(0.16 0.02 260)` or deep Azure). Confirm it now pops as a white CTA on the region-blue gradient.
- Sanity-check a generic page: navigate to `/dashboard` and confirm the header buttons there are UNCHANGED (still default `bg-primary` — the override only applies to module headers).
- Confirm ghost/secondary buttons in any header actions still render correctly (e.g. an export/filter ghost button) — if a page has one, check it isn't accidentally flipped to white.

## Return to me
1. The exact className added to the actions wrapper (the descendant override string) + which text color you chose (`text-foreground` vs `text-primary`) and why
2. Confirmation ghost/secondary/outline variants + generic (no-module) headers untouched
3. `bun run check-types` result
4. Playwright verify: `/region` "New region" button `backgroundColor` + `color` (white + dark = pop)
5. Generic header (`/dashboard`) buttons unchanged?
6. Any deviation + why
7. One-sentence "does the primary CTA now pop as a white high-contrast button on every module gradient header?" yes/no

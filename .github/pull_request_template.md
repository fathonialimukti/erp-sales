## Intent

<!-- What changes and why. One or two sentences. -->

## Scope

<!-- Modules touched, e.g. sales-order list + form. No drive-by refactors. -->

## Verification

<!-- Commands run + results. UI changes: typecheck, i18n sync, manual pass notes. -->

- [ ] `bun run check-types`
- [ ] `bun scripts/check-i18n.mjs` (if copy changed)
- [ ] Quality Engineer ran tests (implementers do not run vitest/playwright)

## UI changes (required when shipping UI)

<!-- Delete this section for non-visual changes. -->

- [ ] Follows `docs/design-system/DESIGN.md` (tokens, motion, bans)
- [ ] Contrast, focus, >=44px targets, reduced-motion honored
- [ ] Empty / loading / error states covered
- [ ] `data-ai-context` on page roots; copy in both `en.json` and `id.json`

Screenshots:

<!-- Before / after for every visual change. No screenshots = no UI merge. -->

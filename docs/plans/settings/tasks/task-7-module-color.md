# Task 7: Settings module color tokens

**Files:**
- Modify: `apps/client/src/index.css` (`:root` + `.dark` `--module-settings`, `@theme inline` `--color-module-settings`)
- Modify: `apps/client/src/types/module.ts` (`ModuleKey` union + `KNOWN_MODULES` set)
- Modify: `apps/client/src/components/Sidebar.tsx` (`HREF_MODULE` map)

**Interfaces:**
- Produces: `settings` module color usable as `module="settings"` on PageHeader/KpiCard/EmptyState and `text-module-settings`/`bg-module-settings` utilities — consumed by T5/T6 pages.

## Frozen contract

### index.css
- `:root` block (~line 121): add `--module-settings: oklch(0.46 0.19 320);` (magenta hue 320°, distinct from ai 300° and planning 280°).
- `.dark` block (~line 170): add `--module-settings: oklch(0.52 0.19 320);` (dark L≈0.52 per design law so white text clears AA on gradient headers).
- `@theme inline` (~line 52): add `--color-module-settings: var(--module-settings);` so `bg-module-settings`/`text-module-settings` generate.

### types/module.ts
- Add `'settings'` to `ModuleKey` union and `KNOWN_MODULES` set.

### Sidebar.tsx HREF_MODULE
- Add `'/settings': 'settings'` mapping.

**Steps:**
- [ ] Add tokens to index.css (3 places)
- [ ] Add to module.ts
- [ ] Add to Sidebar HREF_MODULE
- [ ] `bunx tsc --noEmit` in apps/client

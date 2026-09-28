### Task 3: Frontend Craft (from T1 audit)

**Files:**
- Modify: `apps/client/src/pages/sales-order/SalesOrder.css` (dissolve second system into semantic tokens)
- Modify: `apps/client/src/pages/*/*Icons.tsx` (14 files -> shared DomainIcon, keep files as re-exports if imported elsewhere)
- Create: `apps/client/src/lib/hooks/useDetailForm.ts` (dedup detail-seed pattern)
- Modify: `apps/client/src/pages/*/*FormPage.tsx` (~18 files, adopt hook, keep i18n keys)
- Delete: `apps/client/src/styles/spacing.ts`, `typography.ts`, `colors.ts` (dead, zero importers — verify no importers in your context before delete)
- Modify: `apps/client/src/components/AiAssistant/AiAssistant.tsx` (remove console.logs, split if needed)
- Modify: `apps/client/src/components/FormPreview.tsx` (motion-law fix)
- Modify: `apps/client/src/providers.tsx`, `apps/client/src/components/useToast.tsx` (purge legacy toast)
- Test: client vitest for useDetailForm + touched pages

**Interfaces:**
- Consumes (verbatim from T1 ## Produces T3 section):
T3-frontend-craft (frozen contract: docs/design-system/DESIGN.md is law; semantic Tailwind tokens only, no hex/gray text; trpcClient.* in queryFn; functional components; all strings via intl.formatMessage with en.json+id.json parity; motion only via apps/client/src/lib/motion.ts + reduced-motion; i18n prefix per module; additive-only)
- Produces: DomainIcon path + props, useDetailForm signature, token migration map, deleted files list

**Reads (in your own context — no context is provided):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- Tokens: `apps/client/src/index.css`
- Motion: `apps/client/src/lib/motion.ts`
- Reference pages: `apps/client/src/pages/Region*.tsx`
- Skill: `ui-ux-pro-max` (UI craft owner) + `ponytail-review`

**Frozen contract:**
```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```
- No new design language, no second token system, no raw hex, no gray text, vanilla tRPC only, all strings via intl.

**Steps:**
- [ ] Step 1: Verify dead files have zero importers, then delete
- [ ] Step 2: Create useDetailForm + DomainIcon with failing component test
- [ ] Step 3: Migrate SalesOrder.css second system to semantic tokens incrementally
- [ ] Step 4: Fix FormPreview motion, toasts, console.logs, hex accents
- [ ] Step 5: Self-review (do NOT run full suite — QE owns tests)

**Preservation (mandatory):** additive changes only — do not delete or regress existing routes, procedures, pages, permission strings, or i18n keys. Keep re-exports if Icons files are imported elsewhere. Removing/renaming established feature needs explicit user approval.

**Report back (mandatory):**
End report with `## Produces` listing exact component/hook exports, props signatures, i18n keys touched, deleted files.

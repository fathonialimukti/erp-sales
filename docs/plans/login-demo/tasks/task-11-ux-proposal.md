### Task 11: UX proposal — expandable capability description (report only, no edits)

**Files:** none (design proposal only — do NOT modify pages, components, locales)

**Interfaces:**
- Consumes: T4 login UI (`LoginPage.tsx` + `DemoUserCard.tsx` shows capabilities as chips: first 5 + `+N`).
- Produces: UX proposal for text-description + expandable capabilities.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/client/src/pages/LoginPage.tsx`, `apps/client/src/pages/auth/DemoUserCard.tsx`
- Design law (FROZEN): `docs/design-system/DESIGN.md`, Tokens: `apps/client/src/index.css`, Motion: `apps/client/src/lib/motion.ts`

**Frozen contract:**
- Proposal only. No code edits. Never git add/commit/push. No test runs.
- Requirement: replace raw permission-chip list with human text description ("About this user / what they can do") + expandable details. Must stay FROZEN design (existing Card/Button/motion presets, semantic tokens, `intl.formatMessage`, EN+ID keys sketch).
- Answer: card layout (collapsed vs expanded states), where the natural-language summary comes from (client-side role→summary map vs server-provided description — recommend one), expand/collapse interaction + motion, and i18n key sketch (`demo.about.*`, `demo.showMore/showLess`, role summaries).

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Review current card UX
- [ ] Propose expandable description UX + data source
- [ ] Sketch i18n keys + states
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: layout proposal, data-source recommendation, interaction/motion notes, i18n key sketch.

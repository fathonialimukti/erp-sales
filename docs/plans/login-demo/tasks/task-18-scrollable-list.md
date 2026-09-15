### Task 18: Scrollable account list inside login card (no page scroll)

**Files:**
- Modify: `apps/client/src/pages/LoginPage.tsx` (list container scroll — owned by this task)
- Modify: `apps/client/src/pages/auth/DemoUserCard.tsx` ONLY if card heights need constraining (else leave untouched)
- Do NOT touch: locales, server, schemas, routes, LegacyLoginForm

**Interfaces:**
- Consumes: current demo picker renders `motion.ul` stagger list of `DemoUserCard` (T4/T13). Page currently scrolls whole viewport when many users.
- Produces: inner scroll container behavior.

**Reads (in your own context):** AGENTS.md, LoginPage.tsx, DemoUserCard.tsx, DESIGN.md FROZEN, index.css, motion.ts.

**Frozen contract:**
- Goal: account-selection list scrolls INSIDE its own div (e.g. `overflow-y-auto` + bounded max-height like `max-h-[...]` / flex-1 min-h-0 pattern); whole page stays fixed (no viewport scroll for the list).
- Keep: Card shell, stagger enter, summaries + expandable details, select CTA, loading/error/empty/disabled states. Expanding a card must not break the inner scroll (expanded content scrolls within container).
- A11y: scroll region keyboard-scrollable (native overflow OK), focus visible, `motion-reduce` respected (no new Motion for scroll).
- Semantic tokens only, no hex. Responsive: works at 100vh card layout on desktop + mobile (dvh aware if repo pattern exists — check own context, do not invent tokens).
- tRPC/intl logic untouched.

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Constrain list container (flex column + min-h-0 + overflow-y-auto + max-h)
- [ ] Verify expanded cards scroll inside, page doesn't
- [ ] Self-review (`bun run check-types` in apps/client OK), no tests
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: exact container classes/structure changed, max-height strategy, behavior verified (desktop+mobile if checked).

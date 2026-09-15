### Task 19: Padding 1 on inner account scroll container

**Files:**
- Modify: `apps/client/src/pages/LoginPage.tsx` (scroll `ul` padding only)
- Do NOT touch: DemoUserCard, locales, server, schemas, routes, LegacyLoginForm

**Interfaces:**
- Consumes: T18 made `motion.ul` the scroll region (`min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-3 pr-1`).
- Produces: padded scroll container.

**Reads (own context):** AGENTS.md, LoginPage.tsx.

**Frozen contract:**
- Change: give the inner scroll `ul` padding `p-1` (keep existing `space-y-3`, `overflow-y-auto`, `overscroll-contain`; replace `pr-1` with `p-1` so all sides get spacing unit 1 and scrollbar never kisses card text).
- Nothing else changes (no behavior, no tokens, no motion, no i18n).

**Steps:** [ ] Apply p-1 [ ] Self-review + client check-types [ ] Report.

**Report back (mandatory):** End with `## Produces`: exact class change.

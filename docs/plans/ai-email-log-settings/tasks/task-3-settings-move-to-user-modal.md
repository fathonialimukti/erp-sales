### Task 3: Settings — remove from sidebar, move into user modal before Logout

**Files:**
- Discover + Modify (ONLY these two UI sites, disjoint from Task 4):
  - Sidebar nav component (find via own search for Settings nav item — remove entry + route guard/icon)
  - User/account modal (avatar dropdown — insert Settings item immediately BEFORE Logout button)
- Test: extend existing client test for nav/modal if present, else add minimal one alongside component

**Interfaces:**
- Consumes: none (Layer 1 — independent of T1/T2)
- Produces: exact files changed, nav item removed, modal item position, i18n keys reused

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/ai-email-log-settings/tasks/task-3-settings-move-to-user-modal.md` (this brief)
- Reference pages: `apps/client/src/pages/Region*.tsx` (patterns only)
- Sidebar + user modal components — find via own search (sidebar nav, avatar/dropdown/modal, logout)

**Frozen contract:**
- Behavior: "My Setting"/"Settings" disappears from sidebar entirely; appears in user modal as item directly above/preceding Logout; clicking it navigates to existing settings route (DO NOT create new route, DO NOT rename route)
- i18n prefix: reuse existing `settings.*` / `common.*` keys — NO new keys unless missing, then add to `en.json` + `id.json` and list them in Produces
- Client rules: tRPC vanilla only (no change needed here), semantic Tailwind tokens (no raw hex, no gray text), functional components, all strings via `intl.formatMessage`

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Step 1: Locate sidebar Settings entry + user modal Logout; note existing settings route path (reuse verbatim)
- [ ] Step 2: Remove sidebar item (including active-state/guard/badge); add modal item before Logout with same icon/label/route; preserve a11y (keyboard focus, aria) + responsive behavior
- [ ] Step 3: Typecheck only — `bun run check-types` scoped. DO NOT run vitest/playwright (QE owns execution)
- [ ] Step 4: Self-review — no leftover sidebar references, no dead imports, no new route

**Report back (mandatory):**
End report with `## Produces` block: exact component files changed, settings route path reused, modal position (before Logout), i18n keys reused/added, test file + names.

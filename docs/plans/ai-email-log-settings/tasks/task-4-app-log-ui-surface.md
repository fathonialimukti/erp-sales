### Task 4: Application Log viewer UI (depends on Task 2 Produces)

**Files:**
- Create: `apps/client/src/pages/<ApplicationLog>IndexPage.tsx` (or admin log viewer component if convention differs — ONE new file, disjoint from Task 3)
- Modify: `apps/client/src/routes.tsx` (add log route entry — owned by this task only)
- Modify: `apps/client/src/locales/en.json` + `id.json` (add `applicationLog.*` keys — owned by this task only)
- Test: client test alongside page (create minimal)

**Interfaces:**
- Consumes: copy Task 2 `## Produces` verbatim here before starting (router namespace, signatures, permission string, pagination shape). If Task 2 not yet returned, WAIT — do not guess.
- Produces: route path, component export name, i18n keys, permission gate used

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/ai-email-log-settings/tasks/task-4-app-log-ui-surface.md` (this brief)
- Task 2 report `## Produces` (pasted into Consumes by orchestrator at dispatch time)
- Reference pages: `apps/client/src/pages/Region*.tsx` (list/detail/query patterns)

**Frozen contract:**
- Resource: `applicationLog`
- Router namespace: from Task 2 (expected `trpcClient.applicationLog.{list, detail}` — confirm verbatim, do not invent)
- Permission: gate page/menu on `applicationLog@read` (hide or redirect if lacking — follow existing permission-gate pattern)
- i18n prefix: `applicationLog.*` in `en.json` + `id.json` (title, empty state, level filter, columns, errors)
- Client rules: tRPC vanilla only (`trpcClient.*` in `queryFn`), semantic Tailwind tokens, functional components, all strings via `intl.formatMessage`

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Step 1: From Consumes, wire `list` (+`detail` if drawer/modal needed) with pagination + level filter + search, following Region index patterns
- [ ] Step 2: Add route in `routes.tsx`, i18n keys in both locales, permission gate; empty/error/loading states
- [ ] Step 3: Typecheck only — `bun run check-types` scoped. DO NOT run vitest/playwright (QE owns execution)
- [ ] Step 4: Self-review — no sidebar changes (Task 3 owns those), no new backend procedures

**Report back (mandatory):**
End report with `## Produces` block: exact page file + export name, route path, `trpcClient` calls used, i18n keys added, permission gate location, test file + names.

### Task 8: Email CRM detail loading forever — frontend debug + fix

**Files:**
- Discover + Modify: `apps/client/src/pages/**/EmailCrmDetail*.tsx` (or `email-crm/*Detail*` — resolve in-context, ONE page + its query hook if colocated; disjoint from Task 7)
- Test: alongside page (minimal)

**Interfaces:**
- Consumes: Task 7 contract — `trpcClient.emailCrm.detail.query({id})` throws NOT_FOUND/BAD_REQUEST on bad id (never hangs). If Task 7 not done, handle all three states anyway (data / error / loading).
- Produces: component fixed, loading→error transition, test

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-8-detail-frontend.md`)
- Reference: `apps/client/src/pages/Region*.tsx`
- Target: email-crm Detail page for route `/email-crm/:id` (repro `01M2HVDFB7600RYH6F2WF231QV`)

**Frozen contract:**
- Behavior: valid id → content; missing/invalid/denied id → error/empty state with back action, NEVER infinite skeleton/spinner. Param name must match `routes.tsx` (`:id` vs `:conversationId` — verify). Query enabled only when id truthy. No silent hang.
- Client: tRPC vanilla in `queryFn`, semantic tokens, functional, `intl.formatMessage` strings.

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Step 1: Reproduce — load `/email-crm/01M2HVDFB7600RYH6F2WF231QV` locally (or stub id): check route param extraction, query `enabled`, suspense without boundary, `isLoading` vs `isFetching` loop, missing `error` branch, retry loop.
- [ ] Step 2: Minimal fix — correct param, guard enabled, error + not-found + forbidden states, cancel retry on 404.
- [ ] Step 3: `bun run check-types` scoped. DO NOT run vitest.
- [ ] Step 4: Self-review — no router/backend changes

**Report back (mandatory):**
End with `## Produces`: exact files, trpc call, root cause 1 line, states now (loading/error/data), test names.

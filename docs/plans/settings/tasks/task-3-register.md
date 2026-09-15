### Task 3: Register Settings Router

**Files:**
- Modify: `apps/server/src/router.ts`

**Interfaces:**
- Consumes: `settingsRouter` from `apps/server/src/routers/settings.ts`
- Produces: merged AppRouter with `settings` namespace

**Reads (in your own context):**
- `apps/server/src/router.ts` (current state — see how regionRouter is imported and merged)
- `AGENTS.md`

**Frozen contract:**
- Import `settingsRouter` from `./routers/settings.js`
- Add to merged routers: `settings: settingsRouter`
- Router namespace becomes: `trpcClient.settings.*`

**Steps:**
- [ ] Add import for settingsRouter
- [ ] Add `settings: settingsRouter` to the mergeRouters call
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block confirming the merged router namespace.

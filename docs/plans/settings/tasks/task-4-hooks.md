### Task 4: Client Hooks

**Files:**
- Create: `apps/client/src/lib/hooks/useSettings.ts`

**Interfaces:**
- Consumes: `trpcClient.settings.{getApp, updateApp, getUser, updateUser}` (from T2/T3)
- Produces: `useAppSettings()`, `useUpdateAppSettings()`, `useUserSettings()`, `useUpdateUserSettings()` hooks

**Reads (in your own context):**
- `apps/client/src/lib/hooks/` — find an existing hooks file (e.g. `useRegion.ts`) as reference for tRPC vanilla client patterns
- `AGENTS.md`

**Frozen contract:**
- tRPC vanilla client only (`trpcClient.*` in `queryFn`)
- `useAppSettings()` — calls `trpcClient.settings.getApp.useQuery()`
- `useUpdateAppSettings()` — calls `trpcClient.settings.updateApp.useMutation()`, invalidates `getApp` on success
- `useUserSettings()` — calls `trpcClient.settings.getUser.useQuery()`
- `useUpdateUserSettings()` — calls `trpcClient.settings.updateUser.useMutation()`, invalidates `getUser` on success
- Use `@trpc/tanstack-react-query` patterns (queryOptions/mutationOptions factories)

**Steps:**
- [ ] Write all 4 hooks following existing hook patterns in the codebase
- [ ] Ensure proper query invalidation on mutations
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing exact hook names and their tRPC calls.

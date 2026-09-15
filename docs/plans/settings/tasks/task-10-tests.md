### Task 10: Tests

**Files:**
- Create: `apps/server/src/tests/settings.test.ts`
- Create: `apps/client/src/pages/settings/__tests__/AppSettingsPage.test.tsx`
- Create: `apps/client/src/pages/settings/__tests__/UserSettingsPage.test.tsx`

**Interfaces:**
- Consumes: all router procedures (T2), all page components (T6, T7)

**Reads (in your own context):**
- `apps/server/src/tests/region.test.ts` (reference test patterns)
- `AGENTS.md`

**Frozen contract:**
- Server test: test `getApp`, `updateApp`, `getUser`, `updateUser` procedures
  - Test getApp returns defaults
  - Test updateApp writes and returns updated settings
  - Test getUser returns current user settings
  - Test updateUser writes and returns updated settings
  - Test permission enforcement (unauthorized access rejected)
- Client tests: test page rendering and form submission
  - Test AppSettingsPage renders all sections
  - Test UserSettingsPage renders all sections
  - Test form submission calls mutation

**Steps:**
- [ ] Write server integration tests for all 4 procedures
- [ ] Write client component tests for both pages
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing test files and what each covers.

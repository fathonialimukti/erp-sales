### Task 9: Routes

**Files:**
- Modify: `apps/client/src/routes.tsx`

**Interfaces:**
- Consumes: `SettingsLayout` (T5), `AppSettingsPage` (T6), `UserSettingsPage` (T7)
- Produces: route entries for `/settings` with nested children

**Reads (in your own context):**
- `apps/client/src/routes.tsx` (current state — see how routes are defined)
- `AGENTS.md`

**Frozen contract:**
- Add route at path `settings` using `SettingsLayout` as element
- Index route: `AppSettingsPage`
- Nested route path `user`: `UserSettingsPage`
- Routes use lazy imports or direct imports as per existing pattern

**Steps:**
- [ ] Add import for all 3 components
- [ ] Add route entry with nested structure
- [ ] Self-review

**Report back (mandatory):**
End with `## Produces` block listing exact route paths and components.

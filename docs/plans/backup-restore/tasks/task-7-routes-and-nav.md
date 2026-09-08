### Task 7: Routes + Navigation

**Files:**
- Modify: `apps/client/src/routes.tsx`
- Modify: the sidebar/navigation component that lists app sections (locate it yourself — start from how existing routes are linked; check layout/shell components under `apps/client/src/components/` or similar)

**Interfaces:**
- Consumes (exact names — Task 5 output):
  - Default export `BackupIndexPage` from `apps/client/src/pages/backup/BackupIndexPage.tsx`
  - Route path: `/backups`
  - Nav label: `backup.title` (already in locale files from Task 6)
- Produces:
  - `/backups` route rendering `BackupIndexPage`, registered exactly like the existing Region routes
  - Sidebar entry labeled via `intl.formatMessage` with `backup.title`, placed per existing nav ordering conventions (near other admin/settings entries — use judgement from the existing list)

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/client/src/routes.tsx` (route definition pattern for `Region*` pages — copy it)
- The sidebar/nav component (find via reading `routes.tsx` links + globbing layout components)

**Frozen contract:**
- Route path `/backups` · lazy-load if and only if the existing route entries lazy-load · nav string via i18n (`backup.title`), never hardcoded

**Steps:**
- [ ] Step 1: Read `routes.tsx` + locate the nav component
- [ ] Step 2: Add the `/backups` route entry
- [ ] Step 3: Add the sidebar entry
- [ ] Step 4: `bun run check-types` — must pass
- [ ] Step 5: Self-review: route pattern matches existing conventions; nav label internationalized

**Report back (mandatory):**
End with a `## Produces` block: exact route path, component import, nav file(s) modified, and nav label key used.

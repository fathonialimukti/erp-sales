### Task 13: Give SKU Category its own permission set + re-seed

**Agent:** Backend Engineer (touches seed, router, knowledge doc) + client page permission strings
**Origin:** User request — "create sku categories non exist, please check permission, but i login as super admin." Root cause: client pages check `skuCategory@create` but that string is never seeded; server router guards `sku@*`. Path B chosen: mint `skuCategory@*` as its own permission set.

## Root cause recap
- Client `SkuCategoryIndexPage/DetailPage/FormPage` check `skuCategory@create / @update / @delete` — strings that don't exist in `PERMISSIONS`.
- Server `sku-category.ts` router guards `sku@create / sku@read` (shared SKU namespace).
- Seed `seed.ts:32` only has `sku@create/read/update/delete`.
- `hasPermissionAtom` (client) does literal `permissions.includes(perm)` — no super-admin bypass. So even System Admin (pattern `*`, gets every seeded permission) doesn't have `skuCategory@*` because it's never seeded → button never renders.

## Path B — mint `skuCategory@*` as its own permission set

### File 1 — `apps/server/src/prisma/seed.ts` (PERMISSIONS array)
Add a new SKU Category block **after** the existing SKU block (~after line 35). Insert these 4 permissions:
```ts
  // SKU Category
  { name: "skuCategory@read", description: "Read SKU categories" },
  { name: "skuCategory@create", description: "Create SKU categories" },
  { name: "skuCategory@update", description: "Update SKU categories" },
  { name: "skuCategory@delete", description: "Delete SKU categories" },
```
Note: keep the existing `sku@*` block unchanged (SKUs still use `sku@*`). The System Admin role pattern `"*"` will auto-pick up the new `skuCategory@*` permissions on re-seed — no ROLES change needed. Sales Manager / Viewer / Salesperson patterns don't match `skuCategory@*`, so they won't get it (correct — only System Admin gets SKU Category CRUD by default; can be granted via Access Control UI later).

### File 2 — `apps/server/src/routers/sku-category.ts` (router guards)
Update both guards from `sku@*` → `skuCategory@*`:
- `list` procedure: `.use(hasPermission('sku@read'))` → `.use(hasPermission('skuCategory@read'))`
- `detail` procedure: `.use(hasPermission('sku@read'))` → `.use(hasPermission('skuCategory@read'))`
- `create` procedure: `.use(hasPermission('sku@create'))` → `.use(hasPermission('skuCategory@create'))`
- `update` procedure: `.use(hasPermission('sku@update'))` → `.use(hasPermission('skuCategory@update'))`
- `delete` procedure: `.use(hasPermission('sku@delete'))` → `.use(hasPermission('skuCategory@delete'))`
Read the file first to confirm exact procedure names + current guard strings. Keep all other logic (logActivity, schemas, prisma queries) untouched.

### File 3 — `apps/server/src/knowledge/permissions.md`
Add a line: `- \`skuCategory@create\` — Create SKU categories` (and read/update/delete) near the existing `sku@create` line (~line 37). Keeps the AI assistant's knowledge base in sync.

### File 4-6 — Client pages (permission strings already correct!)
The client pages already use `skuCategory@create / @update / @delete` — **they need NO change**. After re-seeding, `hasPermissionAtom` will find these strings in the user's permissions array and the buttons will render. Confirm by reading:
- `apps/client/src/pages/sku-category/SkuCategoryIndexPage.tsx:34-36` (already `skuCategory@*`)
- `apps/client/src/pages/sku-category/SkuCategoryDetailPage.tsx:38-39` (already `skuCategory@*`)
- `apps/client/src/pages/sku-category/SkuCategoryFormPage.tsx:43` (already `skuCategory@*`)
Do NOT edit these files.

## Re-seed step (REQUIRED — user explicitly asked)
After editing Files 1-3, run the seeder from the server package:
```
bun run db:seed
```
(from repo root — the `db:seed` script is defined in the shared commands; it runs `apps/server`'s seed). The seeder cleans + recreates all permissions/roles/role-permission-links (verified in `seedPermissionsAndRoles`), so the new `skuCategory@*` permissions get created and the System Admin role (pattern `*`) gets linked to them. Idempotent + safe.

## Verify before returning
1. `bun run check-types` from repo root — confirm clean (router + seed changes typecheck).
2. `bun run db:seed` — confirm it completes with no errors and prints the new permission count (was 45-ish, now +4).
3. (Optional but recommended) Query the DB to confirm the new permissions exist + System Admin role is linked to them. If you have a quick way (prisma studio or a one-liner), verify:
   - `permission` table has rows with names `skuCategory@read/create/update/delete`
   - `roleHasPermission` links the System Admin role to all 4

## Rules
- VS Code edit tools only for source edits. NEVER shell/heredoc to write source.
- Use the terminal only for `bun run check-types` and `bun run db:seed` (running commands is allowed).
- Git stays manual-only — no add/commit/push.
- Do NOT touch the client pages (they're already correct).
- Do NOT change the `sku@*` permissions or the SKU router (only SKU Category).
- Do NOT change the ROLES array (System Admin pattern `*` auto-picks the new permissions).

## Return to me
1. `seed.ts` — the exact PERMISSIONS block you added (the 4 `skuCategory@*` lines) + line range
2. `sku-category.ts` — the 5 guard changes (old → new string per procedure)
3. `permissions.md` — the lines added
4. Confirmation the 3 client page files were NOT edited (already correct)
5. `bun run check-types` result
6. `bun run db:seed` output (did it complete? new permission count?)
7. DB verification (if you ran it): do `skuCategory@*` permissions exist + is System Admin linked to all 4?
8. Any deviation + why
9. One-sentence "will super admin now see New/Edit/Delete on /sku-category after re-login?" yes/no

### Task 2: Backend Hygiene (from T1 audit)

**Files:**
- Modify: `apps/server/src/routers/notification.ts`
- Modify: `apps/server/src/routers/activity-log.ts`, `apps/server/src/routers/applicationLog.ts`, `apps/server/src/routers/sku.ts`, `apps/server/src/routers/sku-category.ts`
- Modify: `apps/server/src/lib/ai-widgets.ts`, `apps/server/src/lib/backup.ts` (single generateUlid export)
- Modify: `apps/server/src/routers/ai-chat.ts` (move inputs to schemas), `apps/server/src/routers/dashboard.ts`
- Delete: `apps/server/src/routers/landing.ts` (deprecated empty router)
- Modify: `apps/server/src/routes/ai.ts`, `ai-admin.ts`, `customer-ai.ts`, `sales-order-pdf.ts`, `index.ts` (as-any -> real types)
- Modify: `packages/schemas/src/chatWidget.ts`, `packages/schemas/src/applicationLog.ts` (kebab-case rename + exports)
- Test: `apps/server/src/tests/notification*.test.ts` + existing router tests

**Interfaces:**
- Consumes (verbatim from T1 ## Produces T2 section):
T2-backend-hygiene (frozen contract: procedures public/protected/transactionalProtected + hasPermission('resource@action') kebab-case; every mutation writes activity log; lists via createListInputSchema; .js imports; Prisma from ../lib/prisma.js; txns via ctx.db; ULID; update*Schema.currentId; additive-only)
- Produces: exact procedure names + permission strings normalized (notification@read/@update/@delete, activity-log@read, application-log@read, sku-category@*), generateUlid export path, schema move locations

**Reads (in your own context — no context is provided):**
- `AGENTS.md`, `docs/ARCHITECTURE.md`, `PRODUCT.md`
- Reference router: `apps/server/src/routers/region.ts`
- `apps/server/src/lib/approval-helpers.ts` (for carton/approval context only if touched)
- Skill: `ponytail-review` for shrink decisions

**Frozen contract:**
- Resource examples: notification, activity-log, application-log, sku-category
- Permission strings: kebab-case `resource@create|@read|@update|@delete`
- Router namespace: `trpcClient.<domain>.{list, detail, create, update, delete}`
- Schema: `packages/schemas/src/<domain>.ts` -> `packages/schemas/src/index.ts`
- Router: `apps/server/src/routers/<domain>.ts` -> `apps/server/src/router.ts` (T2 owns edits to these files only for listed domains)
- Imports `.js`; Prisma `../lib/prisma.js`; txns `ctx.db`

**Steps:**
- [ ] Step 1: Write failing test for notification authz (unauth cannot list others, mutation logs activity)
- [ ] Step 2: Add hasPermission + scoping + logActivity; normalize permission strings + seed/nav-menu sync
- [ ] Step 3: Dedupe generateUlid, move ai-chat inputs, delete landing.ts, type any's
- [ ] Step 4: Self-review (do NOT run full suite — QE owns tests)

**Preservation (mandatory):** additive changes only — do not delete or regress existing routes, procedures, pages, permission strings, or i18n keys. Renames listed above need seed + nav-menu sync, keep backwards compat if in use. Removing/renaming anything else needs explicit user approval.

**Report back (mandatory):**
End report with `## Produces` listing exact export/type names, signatures, permission strings, file paths created/modified/deleted.

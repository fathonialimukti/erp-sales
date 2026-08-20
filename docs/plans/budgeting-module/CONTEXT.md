# Budgeting Module — Context Pack

> Frozen context for all subagents. Do NOT re-read conventions or re-brainstorm.
> Full plan: `docs/plans/budgeting-module/PLAN.md` (authoritative — read it once if needed).

## Stack facts (verified)

- **Runtime:** Bun + Turborepo. TypeScript strict with `exactOptionalPropertyTypes`.
- **Prisma:** `apps/server/src/prisma/schema.prisma` — ULID ids, `@map("snake_case")`, table prefix `crm_` for business tables (e.g. `crm_action_programs`). No migrations dir — use `bun prisma db push` + `bun prisma generate`. Generated client at `apps/server/src/prisma/generated`.
- **DB driver:** `apps/server/src/lib/prisma.js` exports `prisma` (and `prismaClient` for raw). ESM with `.js` extension in relative imports.
- **tRPC v11:** `apps/server/src/trpc.js` exports `router`, `protectedProcedure`, `hasPermission('resource@action')`. Activity log via `logActivity(prisma, {...})` from `../lib/activity-log.js` with `buildCreateLogDetail` / `buildUpdateLogDetail` / `buildDeleteLogDetail` from `../lib/log-detail.js`.
- **List query helpers:** `buildPaginationParams`, `buildPaginationMeta`, `buildTextSearchWhere`, `createListInputSchema` from `../lib/list-query.js`.
- **Zod schemas:** `packages/schemas/src/` (package `@repo/schemas`), exported from `index.ts`. Server imports as `@repo/schemas/<name>`.
- **Router registration:** `apps/server/src/router.ts` (import + spread into `appRouter`).
- **Seed:** `apps/server/src/prisma/seed.ts` — PERMISSIONS array (resource@action), ROLES, seedUsers, seedCrmData. No action programs / event proposals seeded currently.
- **Client:** React 19 + Vite + Tauri. tRPC vanilla client via `trpcClient` from `apps/client/src/lib/trpc` with TanStack Query v5 `useQuery`/`useMutation`. `hasPermissionAtom` from `lib/atoms`. Pages follow `apps/client/src/pages/region/*` pattern (IndexPage/DetailPage/FormPage). Lazy routes in `apps/client/src/routes.tsx`. Nav in `apps/client/src/constants/nav-menu.ts` (+ `Sidebar.tsx`, two-gate rule). Module accents: `apps/client/src/types/module.ts` + CSS vars `--module-*` in `apps/client/src/index.css`.
- **Tests:** vitest, `apps/server/src/tests/routers/<name>.test.ts`, caller helper `createCaller` from `../helpers/caller.js`. Setup: `beforeAll` creates actor + region/area/customer/outlet via caller (see `action-program.test.ts`).
- **Build pitfall (repo memory):** after schema change → `bun run build` in `apps/server` AND `bun pm2 restart ecosystem.config.js` from repo root. Verify: `grep -c "BudgetType" apps/server/dist/prisma/generated/index.js`.

## Frozen decisions (user-confirmed 2026-08-19)

1. Budget overrun → **HARD BLOCK** (reject save + reject payments, DRAFT included, no warn path).
2. `ActionProgramType` enum → **migrate to `ActionType` seed rows** (CASHIER, END_GONDOLA, SPECIAL_DISPLAY, DISCOUNT, BUNDLE, FREE_ITEM, REBATE, LOYALTY, DISPLAY_RENTAL), drop the enum.
3. Budget granularity → `BudgetLine.scope = REGION | AREA` with regionId/areaId.
4. Sales-order auto-discount → **PREFILL, EDITABLE**.
5. Event misc items → custom free-form lines (name/category/quantity/price/total), feed `plannedCost`.
6. Vendor payments tracked (`EventVendorPayment`), count toward **Spent**.

## Budget core logic (HARD BLOCK)

```
remaining = allocated − committed − spent
committed = Σ plannedCost of APPROVED programs linked to the line
spent     = Σ ActionProgramPayment + EventProposalPayment + EventVendorPayment
```

- `ActionProgram.plannedCost` = Σ(outlet.cost) + Σ(item.cost) + Σ(sku.cost) — computed & stored server-side.
- `EventProposal.plannedCost` = Σ(sku.total) + Σ(misc.total) + Σ(vendor.amount) — computed & stored server-side.
- Create/update: `committed_other + new plannedCost > allocated` → TRPCError BAD_REQUEST "Budget line over-allocated".
- Payment: recording a payment pushing `spent > allocated` → rejected.
- Scope validation: AREA line requires `program.areaId === line.areaId`; REGION line requires program's area `regionId === line.regionId`. Mismatch → reject.
- Period auto-suggestion on client when program dates fall inside a BudgetPeriod.

## Permission strings (new)

`budget@read/create/update/delete`, `budget-line@read/create/update/delete`, `budget-type@read/create/update/delete`, `budget-period@read/create/update/delete`, `action-type@read/create/update/delete`, `event-type@read/create/update/delete`, `vendor@read/create/update/delete` — resource@action format.

## Data model (summary — full Prisma in PLAN.md §4)

- `BudgetType {id, code, name, description?}` → table `budget_types`
- `BudgetPeriod {id, code, name, startDate, endDate, status}` → `budget_periods`
- `BudgetLine {id, budgetTypeId, periodId, scope(REGION|AREA), regionId?, areaId?, amount Decimal, currency}` → `budget_lines`, unique [budgetTypeId, periodId, scope, regionId, areaId]
- `ActionType {id, code, name, description?}` → `action_types`
- `EventType {id, code, name, description?}` → `event_types`
- `Vendor {id, code?, name, contactName?, contactPhone?, email?, address?, category?, status}` → `vendors`
- `EventMiscItem {id, eventProposalId, name, category?, quantity, price, total, notes?}` → `event_misc_items`
- `EventVendor {id, eventProposalId, vendorId, scope?, amount, notes?}` → `event_vendors`
- `EventVendorPayment {id, eventVendorId, amount, paymentDate, method?, reference?, notes?}` → `event_vendor_payments`
- `ActionProgram`: drop `type` enum + `budgetAmount`; add `actionTypeId` (FK ActionType), `budgetLineId?` (FK BudgetLine), `plannedCost Decimal @default(0)`
- `ActionProgramOutlet`: add `explanation String?`, `cost Decimal @default(0)` (keep composite PK)
- `EventProposal`: drop `proposedBudget`; add `eventTypeId?` (FK EventType), `budgetLineId?` (FK BudgetLine), `plannedCost Decimal @default(0)`; keep `eventType String?`? **No** — migrate to eventTypeId, keep free-text field removed.
- `SalesOrder`: add `actionProgramId String?` (FK ActionProgram)

## Reference files

- Router pattern: `apps/server/src/routers/region.ts`
- Schema pattern: `packages/schemas/src/region.ts` + `common.ts` (createListInputSchema)
- Test pattern: `apps/server/src/tests/routers/region.test.ts`, `action-program.test.ts`
- Client page pattern: `apps/client/src/pages/region/RegionIndexPage.tsx` (+ Detail/Form)
- Nav: `apps/client/src/constants/nav-menu.ts` (nav.programs group at line ~95)
- Routes: `apps/client/src/routes.tsx` (lazyNamed pattern)
- reporting: `apps/server/src/routers/reporting.ts` promoRoi (~line 461) uses `budgetAmount`/`proposedBudget` → must switch to `plannedCost`
- sales-order discount: `apps/server/src/lib/action-program-discount.ts` `findBestDiscount(skuId, outletId, date)` already exists; router has `lookupDiscount` procedure

## Design law (FROZEN)

`docs/design-system/` · Tokens: `apps/client/src/index.css` · Motion: `apps/client/src/lib/motion.ts` · UI craft owner: Frontend Engineer + ui-ux-pro-max. No design essay in task briefs.

## Subagent model mapping

- Backend Engineer → **deepseek**
- Frontend Engineer → **longcat**
- Code Reviewer → **tencent hy3**

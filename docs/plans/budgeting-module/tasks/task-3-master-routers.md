### Task 3: Master routers — budget-type, budget-period, budget-line, action-type, event-type, vendor + register

**Files:**
- Create: `apps/server/src/routers/budget-type.ts`, `budget-period.ts`, `budget-line.ts`, `action-type.ts`, `event-type.ts`, `vendor.ts`
- Modify: `apps/server/src/router.ts`

**Frozen contract:**

All routers follow the `region.ts` pattern exactly: `router({ list, detail, create, update, delete })`, `protectedProcedure.use(hasPermission('X@read'))` etc., `logActivity` on mutations with `resource: '<name>'` (snake_case, e.g. `budget_type`), TRPCError NOT_FOUND for missing records.

- `budget-type.ts` → namespace `budgetType`, permission `budget-type@*`, resource log `budget_type`. Fields: code/name/description.
- `budget-period.ts` → namespace `budgetPeriod`, permission `budget-period@*`, resource log `budget_period`. Fields: code/name/startDate/endDate/status. Date strings → `new Date(...)` on create/update.
- `action-type.ts` → namespace `actionType`, permission `action-type@*`, resource log `action_type`. Fields: code/name/description.
- `event-type.ts` → namespace `eventType`, permission `event-type@*`, resource log `event_type`. Fields: code/name/description.
- `vendor.ts` → namespace `vendor`, permission `vendor@*`, resource log `vendor`. Fields: code/name/contactName/contactPhone/email/address/category/status. List: filter by `status` when provided.
- `budget-line.ts` → namespace `budgetLine`, permission `budget-line@*`, resource log `budget_line`. **This one carries the core remaining-budget logic:**
  - `list`: filters `budgetTypeId`, `periodId`, `scope`, `regionId`, `areaId`, `search`. Include `budgetType {select id,name}`, `period {select id,name,code}`, `region {select id,name}`, `area {select id,name}`, `_count {select: {actionPrograms, eventProposals}}`.
  - `detail`: same includes + `actionPrograms {select id,name,plannedCost,approvalStatus}` + `eventProposals {select id,name,plannedCost,approvalStatus}` (only APPROVED for committed calc).
  - **Computed field `summary` on both list & detail rows** (do not break pagination shape — list returns `{data, meta}` as usual; attach `summary` to each row):
    ```
    allocated = Number(line.amount)
    committed = Σ plannedCost of APPROVED programs/proposals on the line
    spent     = Σ ActionProgramPayment.amount + EventProposalPayment.amount + EventVendorPayment.amount (via program.vendors.payments)
    remaining = allocated − committed − spent
    ```
    Implement via a shared helper `apps/server/src/lib/budget-calc.ts` exporting `budgetLineSummary(lineId)` + `computePlannedCost` helpers used by Task 4. Keep it simple: one helper `getBudgetLineSummary(prisma, lineId): Promise<{allocated, committed, spent, remaining}>`. Aggregations: `prisma.actionProgram.aggregate({_sum: {plannedCost: true}, where: {budgetLineId: lineId, approvalStatus: 'APPROVED'}})` + eventProposal aggregate + payment aggregates (actionProgram.payments, eventProposal.payments, eventProposal.vendors.payments).
  - `create`/`update`: validate scope/region/area rule (REGION → regionId required; AREA → areaId required) → TRPCError BAD_REQUEST on violation. Enforce `@@unique` graceful error → BAD_REQUEST "Budget line already exists for this type/period/scope".
- `router.ts`: import the 6 routers, add `budgetType: budgetTypeRouter`, `budgetPeriod: budgetPeriodRouter`, `budgetLine: budgetLineRouter`, `actionType: actionTypeRouter`, `eventType: eventTypeRouter`, `vendor: vendorRouter` to `appRouter`.

**Steps:**
- [ ] Create `lib/budget-calc.ts` helper
- [ ] Create 6 routers
- [ ] Register in `router.ts`
- [ ] Verify: `cd apps/server && bun run check-types` + `bunx vitest run src/tests/routers/region.test.ts` (sanity, must still pass)
- [ ] Report: files, typecheck + test output

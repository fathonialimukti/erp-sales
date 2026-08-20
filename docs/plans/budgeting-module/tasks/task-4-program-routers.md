### Task 4: ActionProgram / EventProposal / SalesOrder router updates + budget logic

**Files:**
- Modify: `apps/server/src/routers/action-program.ts`, `event-proposal.ts`, `sales-order.ts`, `reporting.ts`
- Modify (shared helper): `apps/server/src/lib/budget-calc.ts` (created in Task 3 — extend it)

**Frozen contract:**

## action-program.ts

- **type → actionTypeId swap** (Prisma still has `type` until Task 5 — see note below):
  - create: `data.actionTypeId = input.actionTypeId` — but Prisma model still has `type` required (ActionProgramType enum). **Resolution: pass `actionTypeId` AND cast `type` from a map of actionTypeCode→enum**. Look up the ActionType row first: `const actionType = await tx.actionType.findUnique({where: {id: input.actionTypeId}})` → NOT_FOUND if missing → `type: actionType.code as ActionProgramType` (codes match enum values: DISCOUNT, BUNDLE, FREE_ITEM, REBATE, LOYALTY — if the code is one of the new-only codes like CASHIER, fall back to a sensible enum value or throw BAD_REQUEST "Action type not supported yet"; **simplest correct: keep `type` in sync by mapping code → enum; unknown codes → 'DISCOUNT' is WRONG — instead throw BAD_REQUEST**).
  - Detail/list: include `actionType {select: {id, code, name}}` alongside `type`.
- **outlets**: input is now `outlets: [{outletId, explanation, cost}]` → createMany with all 3 fields.
- **plannedCost** compute on create/update: `Σ outlet.cost + Σ item.cost + Σ sku.cost` — store as `plannedCost` on the program row (inside the same $transaction).
- **budgetLineId + HARD BLOCK** on create/update (DRAFT included):
  1. If `input.budgetLineId` present: fetch line (`include: {area: true, region: true}`) → NOT_FOUND if missing.
  2. **Scope validation:** line.scope === 'AREA' → require `line.areaId === program.areaId`; line.scope === 'REGION' → require the program's area to belong to line.regionId (`prisma.area.findUnique({where: {id: program.areaId}})` → `area.regionId === line.regionId`). Mismatch → TRPCError BAD_REQUEST "Budget line scope does not match program area".
  3. **Hard block:** committedOther = Σ plannedCost of APPROVED programs on the line **excluding this program's current id** (on update). If `committedOther + newPlannedCost > allocated` → TRPCError BAD_REQUEST "Budget line over-allocated".
  4. Compute `plannedCost` BEFORE creating (sum of inputs) so the check uses the new value.
- **payments**: keep existing behavior, no spent check here (spent check applies to payments only via a new guard — see budget-line/payment step): when creating/updating payments, verify `spentAfter ≤ allocated`? **Plan says payment hard block: recording a payment that pushes spent > allocated is rejected.** Apply in `action-program` create/update (payments are sub-records there) AND when the standalone payment mutation exists — check current router: payments are created inside create/update only. Implement `assertPaymentWithinBudget(prisma, actionProgramId, newPaymentAmount)` in budget-calc.ts: spentOther + newPayment ≤ allocated else BAD_REQUEST.
- **budgetAmount removal**: `budgetAmount` is dropped from the Prisma model in Task 5 — but this task must NOT reference it anywhere. `budgetCurrency` stays.

## event-proposal.ts

- **eventType → eventTypeId**: input now `eventTypeId?` → `tx.eventType.findUnique` → SetNull-safe (no FK write when absent). Prisma model still has `eventType String?` until Task 5 — **write BOTH**: `eventType: eventTypeRow?.name ?? null` (keeps seed data readable) and `eventTypeId`.
- **Remove `proposedBudget`** from all writes (field dropped in Task 5 — just stop referencing it).
- **miscItems**: upsert pattern (id present → update; else create; delete removed ids). Compute `total` server-side as `qty × price` (ignore client total? NO — validate client total matches within tolerance? **Decision: trust but recompute** — recompute `total = quantity × price` server-side, simplest correct).
- **vendors + vendor payments**: nested upsert — vendor rows (id → update, new → create, missing → delete), payments nested the same way. `EventVendorPayment.paymentDate` → `new Date()`.
- **plannedCost**: `Σ sku.total + Σ misc.total + Σ vendor.amount` — store on the proposal.
- **budgetLineId + HARD BLOCK**: same as action-program (scope validation AREA/REGION + committedOther + plannedCost ≤ allocated, BAD_REQUEST otherwise). Event's area = proposal.areaId.
- **vendor payment spent check**: `assertPaymentWithinBudget` for event vendor payments too (spent = EP payments + vendor payments).

## sales-order.ts

- **`actionProgramId` on create/update**: optional link — validate program exists + is APPROVED + active window (startDate ≤ date ≤ endDate) + outlet in program outlets → else BAD_REQUEST.
- **Auto-discount suggestion**: `findBestDiscount` already exists in `lib/action-program-discount.ts` and a `lookupDiscount` procedure already exists — **extend the client contract: add procedure `suggestDiscounts`** input `{outletId, date, skuIds: string[]}` → returns `Record<skuId, {discountPercent, actionProgramId, actionProgramName}>` using findBestDiscount per sku (Promise.all). Keep `lookupDiscount` for backward compat.

## reporting.ts

- `promoRoi` (~line 461): replace `budgetAmount` with `plannedCost` in the actionProgram select; replace `proposedBudget` with `plannedCost` in eventProposal select; update `mapProgram`/`mapProposal` to use `p.plannedCost`. Type field: keep `type` (still exists in Prisma until Task 5).

**Note (Task 5 dependency):** Prisma still has `type`/`eventType`/`budgetAmount`/`proposedBudget` until Task 5 removes them. This task must compile against the CURRENT schema: keep writing `type` (from actionType map) and `eventType` (from eventType name); simply stop reading/writing `budgetAmount`/`proposedBudget` (make them optional-safe or drop from code paths — `reporting.ts` MUST stop selecting them since... wait, they still exist in Prisma. **Decision: reporting.ts switches to plannedCost NOW; budgetAmount/proposedBudget columns remain but unused** — no, if they remain in the model the select must be valid. Since Task 5 drops them from the model, and Task 4 runs BEFORE Task 5, keep `budgetAmount`/`proposedBudget` selects OUT of reporting to avoid a broken intermediate state — selecting is fine while the field exists, so switch now.)

**Steps:**
- [ ] Extend `lib/budget-calc.ts` with `assertPaymentWithinBudget`, `assertBudgetCapacity` (committed+planned ≤ allocated), `computeActionProgramPlannedCost`, `computeEventProposalPlannedCost`
- [ ] Update action-program router (type swap + outlets + plannedCost + budgetLine hard block)
- [ ] Update event-proposal router (eventTypeId + miscItems + vendors + payments + plannedCost + budgetLine hard block)
- [ ] Update sales-order router (actionProgramId link + suggestDiscounts)
- [ ] Update reporting.ts promoRoi → plannedCost
- [ ] Verify: `cd apps/server && bun run check-types` + `bunx vitest run src/tests/routers/action-program.test.ts src/tests/routers/event-proposal.test.ts src/tests/routers/crm-sales.test.ts` — all must pass
- [ ] Report: files, typecheck + test output

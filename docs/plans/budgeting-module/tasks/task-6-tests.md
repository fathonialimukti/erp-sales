### Task 6: Server tests — budget logic + program/sales-order integration

**Files:**
- Create: `apps/server/src/tests/routers/budget.test.ts` (single comprehensive file)
- Modify: none (existing tests must keep passing)

**Frozen contract — tests follow the `action-program.test.ts` pattern:**

- `createCaller` from `../helpers/caller.js`; `beforeAll` creates actor user, region, area, customer, outlet via caller (like action-program.test.ts lines 22-50).
- Use `randomUUID()` for unique names/codes.

## Test cases (each `it()`):

**Master modules (basic CRUD smoke):**
1. budgetType CRUD: create → list contains it → detail → update → delete
2. budgetPeriod CRUD: create with startDate/endDate strings → detail returns dates
3. actionType CRUD
4. eventType CRUD
5. vendor CRUD (with status filter on list)
6. budgetLine create with AREA scope; create with REGION scope; **scope violation** (REGION without regionId) → BAD_REQUEST; **duplicate** (same type/period/scope/region) → BAD_REQUEST

**Budget remaining + hard block (core):**
7. budgetLine `summary`: create line amount 1,000,000 (AREA) → summary shows allocated 1,000,000, committed 0, spent 0, remaining 1,000,000
8. **committed**: create ActionType DISCOUNT + action program (APPROVED via approval flow — check how action-program.test.ts approves; if no direct approve mutation exists, create with the caller's actor having approve permissions — see existing test; otherwise set approvalStatus via prisma directly in test setup like `prisma.actionProgram.update({where:{id}, data:{approvalStatus:'APPROVED'}})` — **prefer prisma direct update for test determinism**). Give program plannedCost 400,000 (outlet cost 400,000). Summary: committed 400,000, remaining 600,000.
9. **hard block create**: second program with plannedCost 700,000 on the same line → BAD_REQUEST "over-allocated"
10. **hard block update**: program with 300,000 updated to 900,000 → BAD_REQUEST; updated to 500,000 → OK
11. **scope mismatch**: program in area B linked to line scoped to area A → BAD_REQUEST
12. **payment hard block**: line 1,000,000, program approved with plannedCost 400,000, payment 700,000 → BAD_REQUEST (spent+payment > allocated? No: 700,000 ≤ 1,000,000 — use payment 900,000: 400+900 > 1,000 → wait, committed+spent model: payment pushes spent over → `allocated − committed − spentNew < 0` → BAD_REQUEST). Correct numbers: allocated 1,000,000, committed 400,000 → payment 700,000 OK (spent 700 ≤ 600? **NO — 700 > 600 remaining** → BAD_REQUEST). Use payment 500,000 → OK (remaining after = 100,000).
13. **event proposal committed**: EventProposal with plannedCost 600,000 (misc item total 600,000) APPROVED → summary committed += 600,000
14. **event misc/vendor totals**: proposal with miscItems [{qty 2, price 50,000}] + vendor [{amount 300,000}] → plannedCost = 100,000 + 300,000 = 400,000; vendor payment 100,000 → spent includes it
15. **vendor payment hard block**: vendor payment pushing over → BAD_REQUEST

**Sales order link:**
16. salesOrder.create with `actionProgramId` of approved DISCOUNT program matching outlet+date → saved; with mismatched outlet → BAD_REQUEST
17. `suggestDiscounts` procedure: given approved DISCOUNT program with ActionProgramSku {price 10,000, priceAfterDiscount 8,000, discount 2,000} → returns discountPercent 20 for that skuId

**plannedCost sums:**
18. action program create with outlets [{cost 100,000}, {cost 50,000}] + items [{cost 25,000}] + skus [{cost 10,000}] → detail.plannedCost = 185,000

**Test setup notes:**
- Approval: use `prisma.actionProgram.update` direct to set APPROVED (fast, deterministic).
- Payment procedures: check how payments are created in the router — if inside create/update payloads, create program WITH payments; if a separate `addPayment` mutation exists, use it.
- Cleanup: `afterAll` — delete created records bottom-up (or rely on test DB isolation — check how other tests handle; region.test.ts pattern).

**Steps:**
- [ ] Write `budget.test.ts` per cases above (adjust to actual router shapes where the brief diverges — but do NOT relax the hard-block assertions)
- [ ] Run: `cd apps/server && bunx vitest run src/tests/routers/budget.test.ts` — all green
- [ ] Run full regression: `bunx vitest run` (or scoped: all router tests) — no new failures. Existing tests that broke because of schema/API changes (action-program.test.ts, event-proposal.test.ts, crm-sales.test.ts) — **fix them minimally** (they're part of this task's scope; the plan says "update PH seeder" but PH data was never seeded — tests create their own data).
- [ ] Report: test results, any test-file fixes

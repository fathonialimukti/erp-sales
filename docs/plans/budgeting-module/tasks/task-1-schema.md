### Task 1: Prisma schema — new master models + ActionProgram/EventProposal/SalesOrder changes

**Files:**
- Modify: `apps/server/src/prisma/schema.prisma`
- No tests (schema change; verified by `bun prisma validate` + generate + build)

**Frozen contract — do NOT reinterpret. Exact Prisma from PLAN.md §4 (verbatim):**

1. Add models:
   - `BudgetType` → `budget_types`: id (ulid), `code String @unique`, `name`, `description String?`, createdAt/updatedAt, `budgetLines BudgetLine[]`
   - `BudgetPeriod` → `budget_periods`: id, `code String @unique`, `name`, `startDate DateTime @db.Date`, `endDate DateTime @db.Date`, `status String @default("OPEN")`, `budgetLines BudgetLine[]`
   - `BudgetLine` → `budget_lines`: id, `budgetTypeId` + relation, `periodId` + relation, `scope String @default("AREA")`, `regionId String?` + `Region?` relation, `areaId String?` + `Area?` relation, `amount Decimal`, `currency String @default("IDR")`, `actionPrograms ActionProgram[]`, `eventProposals EventProposal[]`, `@@unique([budgetTypeId, periodId, scope, regionId, areaId])`
   - `ActionType` → `action_types`: id, `code String @unique`, `name`, `description String?`, `actionPrograms ActionProgram[]`
   - `EventType` → `event_types`: id, `code String @unique`, `name`, `description String?`, `eventProposals EventProposal[]`
   - `Vendor` → `vendors`: id, `code String? @unique`, `name`, `contactName String?`, `contactPhone String?`, `email String?`, `address String?`, `category String?`, `status String @default("ACTIVE")`, `eventVendors EventVendor[]`, createdAt/updatedAt
   - `EventMiscItem` → `event_misc_items`: id, `eventProposalId` + relation, `name`, `category String?`, `quantity Decimal`, `price Decimal`, `total Decimal`, `notes String?`, createdAt/updatedAt, `@@index([eventProposalId])`
   - `EventVendor` → `event_vendors`: id, `eventProposalId` + relation, `vendorId` + relation to Vendor, `scope String?`, `amount Decimal`, `notes String?`, `payments EventVendorPayment[]`, createdAt/updatedAt, `@@index([eventProposalId])`
   - `EventVendorPayment` → `event_vendor_payments`: id, `eventVendorId` + relation, `amount Decimal`, `paymentDate DateTime @db.Date`, `method String?`, `reference String?`, `notes String?`, createdAt, `@@index([eventVendorId])`

2. `ActionProgram`:
   - **Drop** `type ActionProgramType` field and the `enum ActionProgramType` block (after backfill — see note)
   - **Drop** `budgetAmount Decimal?` (keep `budgetCurrency`)
   - **Add** `actionTypeId String` + `actionType ActionType @relation(fields: [actionTypeId], references: [id], onDelete: Restrict, onUpdate: Cascade)` (map `action_type_id`)
   - **Add** `budgetLineId String?` + `budgetLine BudgetLine? @relation(fields: [budgetLineId], references: [id], onDelete: SetNull, onUpdate: Cascade)` (map `budget_line_id`)
   - **Add** `plannedCost Decimal @default(0)` (map `planned_cost`)
   - **Add** `@@index([actionTypeId])` and `@@index([budgetLineId])`

3. `ActionProgramOutlet`: add `explanation String?` and `cost Decimal @default(0)` (keep composite `@@id([actionProgramId, outletId])`)

4. `EventProposal`:
   - **Drop** `eventType String?` and `proposedBudget Decimal?`
   - **Add** `eventTypeId String?` + `eventType EventType? @relation(fields: [eventTypeId], references: [id], onDelete: SetNull, onUpdate: Cascade)` (map `event_type_id`)
   - **Add** `budgetLineId String?` + `budgetLine BudgetLine? @relation(fields: [budgetLineId], references: [id], onDelete: SetNull, onUpdate: Cascade)` (map `budget_line_id`)
   - **Add** `plannedCost Decimal @default(0)` (map `planned_cost`)
   - **Add** `miscItems EventMiscItem[]`, `vendors EventVendor[]`
   - **Add** `@@index([eventTypeId])`, `@@index([budgetLineId])`

5. `SalesOrder`: add `actionProgramId String?` (map `action_program_id`) + `actionProgram ActionProgram? @relation(fields: [actionProgramId], references: [id], onDelete: SetNull, onUpdate: Cascade)` + `@@index([actionProgramId])`

**Steps:**
- [ ] Add all models/fields per contract (match existing style: `@id @default(ulid())`, `@map("snake_case")`, `@@map("crm_*")` for business tables; master tables without `crm_` prefix as specified)
- [ ] Verify: `cd apps/server && bun prisma validate` — must pass
- [ ] `bun prisma db push` (repo has no migrations dir) — must succeed against dev DB
- [ ] `bun prisma generate`
- [ ] Do NOT drop enum `ActionProgramType` yet — that happens in Task 5 (seeder backfill) to keep seed green. Instead, keep enum for now (Task 5 removes it).
- [ ] `bun run build` (apps/server) — must succeed. Verify dist client: `grep -c "BudgetType" dist/prisma/generated/index.js` ≥ 1
- [ ] Report: files changed, prisma validate output, db push result, build result

**Note:** because Task 5 backfills ActionType rows from the enum, do not delete `enum ActionProgramType` in this task. `type` field stays until Task 5 swaps it for `actionTypeId`... **CONTRADICTION RESOLVED:** Task 2-5 run in one Backend session chain; the enum drop + type swap happens in Task 5 together with the seeder backfill. Do all schema edits in this task EXCEPT: keep `type` field + enum block untouched (Task 5 removes them after backfill). All other fields (actionTypeId, budgetLineId, plannedCost, etc.) go in now.

**Acceptance:** `bun prisma validate` clean; `db push` applied; generated client contains BudgetType; server builds.

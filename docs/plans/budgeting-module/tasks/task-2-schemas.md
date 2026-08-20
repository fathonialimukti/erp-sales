### Task 2: Zod schemas package — new + updated modules

**Files:**
- Create: `packages/schemas/src/budget-type.ts`, `budget-period.ts`, `budget-line.ts`, `action-type.ts`, `event-type.ts`, `vendor.ts`
- Modify: `packages/schemas/src/action-program.ts`, `event-proposal.ts`, `sales-order.ts`, `index.ts`

**Frozen contract:**

New files (follow `region.ts` pattern: `createListInputSchema()` + create/update/id schemas + inferred types):

- `budget-type.ts`: `budgetTypeListInputSchema`, `createBudgetTypeSchema {code, name, description?}`, `updateBudgetTypeSchema {currentId, code, name, description?}`, `budgetTypeIdSchema`
- `budget-period.ts`: `budgetPeriodListInputSchema`, `createBudgetPeriodSchema {code, name, startDate, endDate, status? default 'OPEN'}`, `updateBudgetPeriodSchema {currentId, code, name, startDate, endDate, status?}`, `budgetPeriodIdSchema`
- `action-type.ts`: `actionTypeListInputSchema`, `createActionTypeSchema {code, name, description?}`, `updateActionTypeSchema {currentId, code, name, description?}`, `actionTypeIdSchema`
- `event-type.ts`: same shape as action-type
- `vendor.ts`: `vendorListInputSchema` (extend `createListInputSchema({ status: z.string().optional() })`), `createVendorSchema {code?, name, contactName?, contactPhone?, email?, address?, category?, status?}`, `updateVendorSchema {currentId, ...}`, `vendorIdSchema`
- `budget-line.ts`: `budgetLineListInputSchema` (extend `createListInputSchema({ budgetTypeId, periodId, scope, regionId, areaId — all optional })`), `createBudgetLineSchema {budgetTypeId, periodId, scope: z.enum(['REGION','AREA']), regionId?, areaId?, amount: z.number().positive(), currency?}`, `updateBudgetLineSchema {currentId, ...same}`, `budgetLineIdSchema`. **Region/area presence rule:** scope REGION → regionId required; scope AREA → areaId required. Implement with a `.superRefine` that rejects when the matching id is missing.

Modify existing files:

- `action-program.ts`:
  - `actionProgramListInputSchema`: keep `areaId`/`approvalStatus`, **replace `type: z.string()` with `actionTypeId: z.string().optional()`**
  - `actionProgramSkuInputSchema`: **add `cost` → rename? NO — cost already exists.** Just keep.
  - `actionProgramOutletInputSchema` — **NEW**: `{ outletId: z.string().min(1), explanation: z.string().optional(), cost: z.number().nonnegative().default(0) }`
  - `createActionProgramSchema` / `updateActionProgramSchema`: **replace `type` with `actionTypeId: z.string().min(1)`**, **replace `outletIds: z.array(z.string())` with `outlets: z.array(actionProgramOutletInputSchema).min(1)`**, add `budgetLineId: z.string().optional()`, keep `budgetCurrency`. Keep `payments`, `skus`, `items`.
  - Export new types: `ActionProgramOutletInput`, plus existing inferred types.
- `event-proposal.ts`:
  - `createEventProposalSchema`/`updateEventProposalSchema`: **replace `eventType: z.string().optional()` with `eventTypeId: z.string().optional()`**, **remove `proposedBudget`**, add `budgetLineId: z.string().optional()`
  - **New** `eventMiscItemInputSchema {id?: string, name: z.string().min(1), category?: z.string(), quantity: z.number().positive(), price: z.number().nonnegative(), total: z.number().nonnegative(), notes?: z.string()}`
  - **New** `eventVendorInputSchema {id?: string, vendorId: z.string().min(1), scope?: z.string(), amount: z.number().nonnegative(), notes?: z.string(), payments: z.array(eventVendorPaymentInputSchema).optional().default([])}`
  - **New** `eventVendorPaymentInputSchema {amount: z.number().positive(), paymentDate: z.string().min(1), method?: z.string(), reference?: z.string(), notes?: z.string()}`
  - Add `miscItems: z.array(eventMiscItemInputSchema).optional().default([])`, `vendors: z.array(eventVendorInputSchema).optional().default([])` to create/update schemas
  - Export new types.
- `sales-order.ts`: add `actionProgramId: z.string().optional()` to `createSalesOrderSchema` and `updateSalesOrderSchema`.
- `index.ts`: add `export * from './budget-type'`, `'./budget-period'`, `'./budget-line'`, `'./action-type'`, `'./event-type'`, `'./vendor'`.

**Note:** the enum `ActionProgramType` and `type` field still exist in Prisma until Task 5. The Zod layer switches to `actionTypeId` now — the server router will be updated in Task 3/4 accordingly. Keep `rules: z.any().optional()` as-is.

**Steps:**
- [ ] Create the 6 new schema files
- [ ] Modify the 3 existing files + index.ts
- [ ] Verify: `cd apps/server && bun run check-types` (or `bunx tsc --noEmit` in packages/schemas) — must pass
- [ ] Report: files created/modified, typecheck result

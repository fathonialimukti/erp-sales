# Budgeting Module — Implementation Plan

> **Status:** PLAN ONLY — no code written yet.
> **Date:** 2026-08-19
> **Scope:** New `budgeting` module (budget types + period + budget lines), new `action-type` & `event-type` & `vendor` master modules, action-program & event-program budget integration, sales-order ↔ action-program linkage with auto-discount prefill.

---

## 1. Goal (tuned from your prompt)

Build a **budgeting module** that puts a hard, trackable limit on **action programs** and **event programs**, and connects **sales orders** to action programs so discount spend is auto-applied and deducted from the budget.

Your original prompt, restated with the domain terms this codebase already uses:

| Your words | Codebase term | Notes |
|---|---|---|
| "budgeting" | **Budget Type** (new module) | e.g. `TRADE_PROMO`, `EVENT`, `DISPLAY_RENTAL` |
| "period" | **Budget Period** (new module) | e.g. `2026-Q1`, `2026-H1`, `2026` |
| "budget from area A, area B, regional" | **BudgetLine scope (REGION \| AREA)** | each line = period × type × region/area |
| "action type" | **Action Type** (new module) | e.g. `CASHIER`, `END_GONDOLA`, `SPECIAL_DISPLAY`, `DISCOUNT` |
| "event type" | **Event Type** (new module) | e.g. `GRAND_OPENING`, `SAMPLING`, `BAZAAR` |
| "vendor" | **Vendor** (new module) | e.g. event organizer, POS material supplier |
| "action program" | `ActionProgram` (exists) | add budget linkage + per-outlet cost |
| "event program" | `EventProposal` (exists) | add budget linkage + misc items + vendors |
| "sales order" | `SalesOrder` (exists) | add `actionProgramId` link + auto discount |

---

## 2. Real-world research (why this shape)

Sources: Rework FMCG TPM guide, AFSS TPM case study (Indonesian FMCG distributor), McKinsey/Nielsen trade-promo data.

### 2.1 Budget is allocated per **period × budget type**, then consumed by programs
- TPM systems allocate promotion budget **per product/region/period** and track **remaining budget in real time** (AFSS).
- Budget overruns (e.g. 140% of allocation) are only caught at quarterly reconciliation **without** a live ledger — the #1 failure mode.
- **Decision:** a `BudgetPeriod` + `BudgetType` + `BudgetLine` (period × type × amount) model, with a **computed remaining** = allocated − committed (approved programs) − spent (payments/claims).

### 2.2 Action types are a real taxonomy, not free text
- FMCG trade-promo types: off-invoice discount, bill-back, free goods, consumer promo at outlet, DSR incentive, **display rental / gondola end / checkout counter** (Rework).
- Your examples (`CASHIER`, `END_GONDOLA`, `SPECIAL_DISPLAY`, `DISCOUNT`) map to **display/placement + price mechanics**.
- **Decision:** `ActionType` becomes a **master-data module** (seeded), and `ActionProgram.type` becomes a FK to it (replacing the free-text `Input` and the hardcoded `ActionProgramType` enum).

### 2.3 Per-outlet cost with explanation is standard "outlet targeting"
- TPM best practice: target only outlets where the commercial condition exists; each outlet carries its own cost (Rework).
- **Decision:** extend `ActionProgramOutlet` with `explanation` (text) + `cost` (per-outlet), so a program implemented across several outlets has a per-outlet cost that sums into the budget.

### 2.4 Discount programs must link to actual sales orders
- Off-invoice discount = per-unit price reduction on invoice; claims must be validated against **outlet + period + SKU** (Rework).
- **Decision:** `SalesOrder.actionProgramId` FK. On create, if the outlet+date matches an active `DISCOUNT` action program, **auto-prefill** the discount from the program's SKU rules.

### 2.5 Events have misc items + vendors, and consume budget
- Events (grand opening, sampling, bazaar) spend on **misc items** (banner, sound system, tent, sampling goods) and **vendors** (organizer, supplier) — each a line with qty × price = total.
- **Decision:** `EventProposal` gains `miscItems` (name/price/qty/total) + `vendors` (vendorId/scope/amount) + a budget line link; `EventType` and `Vendor` become master modules.

---

## 3. Current state (verified in code)

- `ActionProgram` (schema.prisma:485) — `type` is enum `ActionProgramType` (`DISCOUNT/BUNDLE/FREE_ITEM/REBATE/LOYALTY/DISPLAY_RENTAL`), has `budgetAmount` (unused), `ActionProgramOutlet` is **id-less** (composite PK, no cost/explanation), `ActionProgramSku` has `discount`/`priceAfterDiscount`.
- `EventProposal` (schema.prisma:590) — `eventType` is free-text `String?`, `proposedBudget` (unused), `EventProposalSku` + `EventProposalPayment` only (no misc items, no vendors).
- `SalesOrder` (schema.prisma:342) — no action-program link; `SalesOrderItem.discountPercent` exists.
- Client: `ActionProgramFormPage` uses free-text `type` Input; `EventProposalFormPage` uses free-text `eventType` Input. Both are `module="planning"` / `module="event"`.
- Seeder: `seed.ts` seeds permissions only for these; the **PH seeder** (`seed/`) seeds 8 action programs + 3 event proposals with `DISPLAY_RENTAL` etc.
- Router registration: `apps/server/src/router.ts`; nav: `nav-menu.ts` + `Sidebar.tsx` (two-gate rule — see repo memory).

---

## 4. Data model (Prisma)

### 4.1 New master modules

```prisma
model BudgetType {
  id        String   @id @default(ulid())
  code      String   @unique
  name      String
  description String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  budgetLines BudgetLine[]
  @@map("budget_types")
}

model BudgetPeriod {
  id        String   @id @default(ulid())
  code      String   @unique          // e.g. "2026-Q1"
  name      String                    // e.g. "Q1 2026"
  startDate DateTime @db.Date
  endDate   DateTime @db.Date
  status    String   @default("OPEN") // OPEN | CLOSED
  budgetLines BudgetLine[]
  @@map("budget_periods")
}

model BudgetLine {
  id            String   @id @default(ulid())
  budgetTypeId  String
  budgetType    BudgetType @relation(...)
  periodId      String
  period        BudgetPeriod @relation(...)
  scope         String   @default("AREA")   // REGION | AREA
  regionId      String?  // required when scope = REGION
  region        Region?  @relation(...)
  areaId        String?  // required when scope = AREA
  area          Area?    @relation(...)
  amount        Decimal  // allocated
  currency      String   @default("IDR")
  actionPrograms ActionProgram[]
  eventProposals  EventProposal[]
  @@unique([budgetTypeId, periodId, scope, regionId, areaId])
  @@map("budget_lines")
}
```

### 4.2 Action type / event type / vendor

```prisma
model ActionType {
  id        String   @id @default(ulid())
  code      String   @unique   // CASHIER, END_GONDOLA, SPECIAL_DISPLAY, DISCOUNT, ...
  name      String
  description String?
  actionPrograms ActionProgram[]
  @@map("action_types")
}

model EventType {
  id        String   @id @default(ulid())
  code      String   @unique   // GRAND_OPENING, SAMPLING, BAZAAR, ...
  name      String
  description String?
  eventProposals EventProposal[]
  @@map("event_types")
}

model Vendor {
  id        String   @id @default(ulid())
  code      String?  @unique
  name      String
  contactName String?
  contactPhone String?
  email     String?
  address   String?
  category  String?  // ORGANIZER | POS_MATERIAL | CATERING | ...
  status    String   @default("ACTIVE")
  eventVendors EventVendor[]
  @@map("vendors")
}
```

### 4.3 ActionProgram changes

```prisma
model ActionProgram {
  // existing fields...
  type        String   // was ActionProgramType enum → now FK to ActionType
  actionTypeId String  @map("action_type_id")
  actionType  ActionType @relation(...)
  budgetLineId String? @map("budget_line_id")
  budgetLine  BudgetLine? @relation(...)
  plannedCost Decimal   @default(0)  // computed: sum(outlet.cost) + sum(item.cost) + sum(sku.cost)
  // budgetAmount REPLACED by plannedCost (computed server-side; see §5)
}

model ActionProgramOutlet {
  actionProgramId String
  actionProgram   ActionProgram @relation(...)
  outletId        String
  outlet          Outlet @relation(...)
  explanation     String?   // why this outlet is in the program
  cost            Decimal   @default(0)  // per-outlet cost
  @@id([actionProgramId, outletId])
}
```

### 4.4 EventProposal changes

```prisma
model EventProposal {
  // existing fields...
  eventTypeId String? @map("event_type_id")
  eventType   EventType? @relation(...)
  budgetLineId String? @map("budget_line_id")
  budgetLine  BudgetLine? @relation(...)
  plannedCost Decimal   @default(0)  // computed: sum(sku.total) + sum(misc.total) + sum(vendor.amount)
  miscItems   EventMiscItem[]
  vendors     EventVendor[]
  // proposedBudget REPLACED by plannedCost (computed server-side; see §5)
}

model EventMiscItem {
  id              String   @id @default(ulid())
  eventProposalId String
  eventProposal   EventProposal @relation(...)
  name            String   // FREE-FORM: "Rent sound system", "Food for salesmen", "Tent", ...
  category        String?  // optional grouping: RENT | FOOD | MATERIAL | OTHER
  quantity        Decimal
  price           Decimal
  total           Decimal   // qty × price (computed client-side, validated server-side)
  notes           String?
  @@map("event_misc_items")
}

model EventVendor {
  id              String   @id @default(ulid())
  eventProposalId String
  eventProposal   EventProposal @relation(...)
  vendorId        String
  vendor          Vendor @relation(...)
  scope           String?  // what they provide
  amount          Decimal  // agreed/contracted amount
  notes           String?
  payments        EventVendorPayment[]
  @@map("event_vendors")
}

model EventVendorPayment {
  id              String   @id @default(ulid())
  eventVendorId   String
  eventVendor     EventVendor @relation(...)
  amount          Decimal
  paymentDate     DateTime @db.Date
  method          String?
  reference       String?
  notes           String?
  createdAt       DateTime @default(now())
  @@map("event_vendor_payments")
}
```

### 4.5 SalesOrder changes

```prisma
model SalesOrder {
  // existing fields...
  actionProgramId String? @map("action_program_id")
  actionProgram   ActionProgram? @relation(...)
}
```

---

## 5. Budget consumption rules (the core logic) — HARD BLOCK

**Committed** (reserved) vs **Spent** (realized) — the two numbers that reduce remaining budget:

```
remaining = allocated − committed − spent
```

- **Committed** = sum of `plannedCost` of **APPROVED** action programs / event proposals linked to the budget line.
  - Action program `plannedCost` = `sum(ActionProgramOutlet.cost)` + `sum(ActionProgramItem.cost)` + `sum(ActionProgramSku.cost)` — computed & stored server-side on save.
  - Event proposal `plannedCost` = `sum(EventProposalSku.total)` + `sum(EventMiscItem.total)` + `sum(EventVendor.amount)` — computed & stored server-side on save.
  - This replaces the old `budgetAmount` / `proposedBudget` manual fields (removed from schema; `reporting.ts` promoRoi updated to use `plannedCost`).
- **Spent** = sum of `ActionProgramPayment.amount` + `EventProposalPayment.amount` + `EventVendorPayment.amount` for those programs (realized cash out).
- **HARD BLOCK (user decision #1):** on create/update, if `committed + new plannedCost > allocated` → reject with `TRPCError BAD_REQUEST` ("Budget line over-allocated"). Applies to DRAFT too — no warn path.
- **Payment hard block:** recording a payment that would push `spent > allocated` is also rejected.
- **Scope validation:** the program's `areaId` must match the budget line's scope — `AREA` scope requires `program.areaId === line.areaId`; `REGION` scope requires the program's area to belong to `line.regionId`. Mismatch → reject.
- **Period auto-derivation:** when a program's `startDate`/`endDate` (or `eventDate`) falls inside a `BudgetPeriod`, the period is auto-suggested (not auto-locked) on the form.
- **Budget picker on client:** filtered by program area → shows only lines whose scope matches that area/region.

---

## 6. Server work (Backend Engineer)

1. **Schema** (`apps/server/src/prisma/schema.prisma`): add models above (BudgetType/BudgetPeriod/BudgetLine with REGION|AREA scope, ActionType, EventType, Vendor, EventMiscItem, EventVendor, EventVendorPayment); change `ActionProgram.type` → `actionTypeId` FK + `plannedCost`; add `ActionProgramOutlet.explanation/cost`; add `EventProposal.eventTypeId/budgetLineId/plannedCost` + relations; add `SalesOrder.actionProgramId`. Drop `ActionProgramType` enum + `budgetAmount`/`proposedBudget` fields.
2. **Migration:** `bun prisma db push` (repo has no migrations dir — see repo memory) + `bun prisma generate`. Seeder must backfill `ActionType` rows from the old enum values before dropping.
3. **Schemas** (`packages/schemas/src/`): new `budget-type.ts`, `budget-period.ts`, `budget-line.ts`, `action-type.ts`, `event-type.ts`, `vendor.ts`; update `action-program.ts` (actionTypeId, budgetLineId, per-outlet {explanation,cost}, drop budgetAmount), `event-proposal.ts` (eventTypeId, budgetLineId, miscItems, vendors, vendorPayments, drop proposedBudget), `sales-order.ts` (add `actionProgramId`). Export from `index.ts`.
4. **Routers** (`apps/server/src/routers/`): `budget-type.ts`, `budget-period.ts`, `budget-line.ts` (with `remaining` computed + scope filters), `action-type.ts`, `event-type.ts`, `vendor.ts` (+ vendor payment sub-resource); update `action-program.ts` (plannedCost compute, outlet cost/explanation, budgetLineId + scope validation + hard-block, type→actionTypeId), `event-proposal.ts` (plannedCost compute, misc items, vendors, payments, budgetLineId + hard-block), `sales-order.ts` (link + auto-discount suggestion); update `reporting.ts` promoRoi (`budgetAmount` → `plannedCost`).
5. **Auto-discount prefill logic** (`apps/server/src/lib/`): on `salesOrder.create`, find active `DISCOUNT` action program for `outletId` + `date` in period; return suggested `discountPercent` per line from `ActionProgramSku.discount`/`priceAfterDiscount` — **editable** by the user (decision #4).
6. **Permissions** (`seed.ts` PERMISSIONS): `budget@read/create/update/delete`, `action-type@*`, `event-type@*`, `vendor@*` (resource@action format).
7. **Seeder:** seed `BudgetType`/`BudgetPeriod`/`BudgetLine` (mixed AREA + REGION scope samples), `ActionType` (CASHIER, END_GONDOLA, SPECIAL_DISPLAY, DISCOUNT, BUNDLE, FREE_ITEM, REBATE, LOYALTY, DISPLAY_RENTAL), `EventType` (GRAND_OPENING, SAMPLING, BAZAAR, ...), `Vendor` (organizer, POS material, catering); update PH seeder to new FKs + plannedCost.
8. **Tests** (`apps/server/src/tests/routers/`): budget remaining calc, hard-block on overrun (create/update/payment), scope mismatch rejection, plannedCost sums, sales-order auto-discount suggestion, event misc/vendor totals + vendor payments.

---

## 7. Client work (Frontend Engineer)

1. **Routes** (`routes.tsx`): `/budget`, `/budget-type`, `/budget-period`, `/action-type`, `/event-type`, `/vendor` (kebab-case — repo memory rule).
2. **Nav** (`nav-menu.ts` + `Sidebar.tsx`): add to `nav.programs` group (or new `nav.budgeting` group); add hrefs to section arrays (two-gate rule) + `HREF_MODULE`.
3. **Module color** (`index.css` + `types/module.ts`): new `budget` module hue (e.g. 320° magenta is taken by settings — pick e.g. 260° violet or 340° rose); `action-type`/`event-type`/`vendor` can reuse `planning`/`event`/`report` hues or get their own.
4. **Pages:** `BudgetPage` (list + remaining vs allocated progress), `BudgetTypePage`, `BudgetPeriodPage`, `ActionTypePage`, `EventTypePage`, `VendorPage` (list/detail/form, following existing master-data page patterns). `BudgetLinePage` shows scope (REGION/AREA) picker + region/area selector.
5. **ActionProgramFormPage:** replace free-text `type` with `ActionType` SelectSearch; add per-outlet cost + explanation editor; add budget line picker filtered by the program's area (scope-aware) with remaining-budget indicator.
6. **EventProposalFormPage:** replace free-text `eventType` with `EventType` SelectSearch; add misc-items table (**custom free-form rows**: name/category/quantity/price/total — "Rent sound system", "Food for salesmen"); add vendors table with per-vendor payments sub-table; add budget line picker.
7. **SalesOrderFormPage:** when outlet+date matches a DISCOUNT program, show a banner + auto-prefill discount per line (editable).
8. **i18n:** add keys for all new labels (underscore namespace — repo memory rule).

---

## 8. Decisions (user-confirmed 2026-08-19) — all questions resolved

1. **Budget overrun → HARD BLOCK.** Reject save (and reject payments) when the line would be over-allocated. No warn path, DRAFT included.
2. **`ActionProgramType` enum → migrate to `ActionType` seed rows** (CASHIER, END_GONDOLA, SPECIAL_DISPLAY, DISCOUNT, BUNDLE, FREE_ITEM, REBATE, LOYALTY, DISPLAY_RENTAL) and drop the enum.
3. **Budget granularity → scope dimension on `BudgetLine`:** `scope = REGION | AREA` with `regionId` / `areaId`. Example: one line for "Jakarta Utara — Q1 trade promo" (AREA), one for "Jawa Barat — Q1" (REGION). Programs validate against the line's scope.
4. **Sales-order auto-discount → PREFILL, EDITABLE.** Server returns suggested discount per line from the matched DISCOUNT program; the user can change it before save.
5. **Event misc items → CUSTOM free-form lines** ("Rent sound system", "Food for salesmen", "Tent") with `name/category/quantity/price/total` — NOT SKU-backed, kept separate from `EventProposalSku`. They feed `plannedCost`.
6. **Vendor payments → tracked.** New `EventVendorPayment` table (amount/date/method/reference/notes). Vendor payments count toward **Spent**.

---

## 9. Suggested implementation order

1. Schema + migration + generate
2. Schemas package (Zod)
3. Master routers (budget-type, budget-period, action-type, event-type, vendor) + budget-line with remaining
4. Action-program / event-proposal router updates (budget linkage, outlet cost, misc/vendors)
5. Sales-order link + auto-discount
6. Permissions + seeder
7. Server tests
8. Client: routes/nav/module color → master pages → form updates → sales-order prefill → i18n
9. Verification: `bun run check-types`, `bunx vitest run` (scoped), manual UI pass

---

## 10. Files touched (map)

| Layer | Files |
|---|---|
| Prisma | `apps/server/src/prisma/schema.prisma` |
| Schemas | `packages/schemas/src/{budget-type,budget-period,budget-line,action-type,event-type,vendor}.ts`, `action-program.ts`, `event-proposal.ts`, `sales-order.ts`, `index.ts` |
| Routers | `apps/server/src/routers/{budget-type,budget-period,budget-line,action-type,event-type,vendor}.ts`, `action-program.ts`, `event-proposal.ts`, `sales-order.ts`, `reporting.ts`, `router.ts` |
| Server lib | `apps/server/src/lib/` (budget calc, auto-discount) |
| Seed | `apps/server/src/prisma/seed.ts`, `apps/server/src/prisma/seed/` (PH) |
| Tests | `apps/server/src/tests/routers/` |
| Client | `routes.tsx`, `nav-menu.ts`, `Sidebar.tsx`, `index.css`, `types/module.ts`, `pages/{budget,budget-type,budget-period,action-type,event-type,vendor}/`, `pages/action-program/ActionProgramFormPage.tsx`, `pages/event-proposal/EventProposalFormPage.tsx`, `pages/sales-order/SalesOrderFormPage.tsx`, `locales/*` |

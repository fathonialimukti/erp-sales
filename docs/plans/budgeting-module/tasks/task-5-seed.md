### Task 5: Permissions + seeder + enum drop (finalize schema)

**Files:**
- Modify: `apps/server/src/prisma/schema.prisma` (enum drop + `type`/`eventType` field removal)
- Modify: `apps/server/src/prisma/seed.ts`
- No client files.

**Frozen contract:**

## 1. Schema finalization (do this FIRST)

- Remove `enum ActionProgramType` block entirely.
- `ActionProgram`: remove `type ActionProgramType @map("type")` field (actionTypeId now drives it).
- `EventProposal`: remove `eventType String? @map("event_type")` field (eventTypeId drives it).
- Verify: `bun prisma validate`, `bun prisma db push`, `bun prisma generate`, `bun run build` in apps/server. **This is a destructive-ish push (drops columns) — the DB currently has seeded action programs? NO: current seed does NOT create action programs/event proposals (verified — seedCrmData only does regions/areas/categories/skus/customers/outlets). So drop is safe. Confirm with `bun prisma db push` success.**

## 2. Seed permissions (PERMISSIONS array in seed.ts)

Add (resource@action):

```
{ name: "budget@read", ... } { name: "budget@create", ... } { name: "budget@update", ... } { name: "budget@delete", ... }
{ name: "budget-type@read/create/update/delete", ... }   // 4 entries
{ name: "budget-period@read/create/update/delete", ... } // 4 entries
{ name: "budget-line@read/create/update/delete", ... }   // 4 entries
{ name: "action-type@read/create/update/delete", ... }   // 4 entries
{ name: "event-type@read/create/update/delete", ... }    // 4 entries
{ name: "vendor@read/create/update/delete", ... }        // 4 entries
```

Total 25 new entries. Follow existing comment-group style.

## 3. Seed master data (new function `seedBudgetingData()` called from `main()` after `seedCrmData()`)

- **BudgetType**: `TRADE_PROMO` "Trade Promotion", `EVENT` "Event", `DISPLAY_RENTAL` "Display Rental", `CONSUMER_PROMO` "Consumer Promotion"
- **BudgetPeriod**: `2026-Q1` "Q1 2026" (2026-01-01 → 2026-03-31), `2026-Q2` "Q2 2026" (2026-04-01 → 2026-06-30), `2026-H1` "H1 2026" (2026-01-01 → 2026-06-30), `2026` "FY 2026" (2026-01-01 → 2026-12-31) — all status OPEN
- **BudgetLine** (mixed scope; areas from seedCrmData's `areas` — need regionIds too):
  - TRADE_PROMO × 2026-Q1 × AREA JKT-UT → amount 250,000,000
  - TRADE_PROMO × 2026-Q1 × AREA JKT-SL → amount 200,000,000
  - TRADE_PROMO × 2026-Q1 × REGION Jakarta → amount 800,000,000 (covers JKT-UT + JKT-SL)
  - EVENT × 2026-Q1 × AREA BDG-TM → amount 150,000,000
  - DISPLAY_RENTAL × 2026-H1 × REGION Bandung → amount 100,000,000
  - CONSUMER_PROMO × 2026 × REGION Surabaya → amount 300,000,000
  - currency IDR
- **ActionType**: CASHIER, END_GONDOLA, SPECIAL_DISPLAY, DISCOUNT, BUNDLE, FREE_ITEM, REBATE, LOYALTY, DISPLAY_RENTAL (name = humanized: "Cashier", "End Gondola", "Special Display", "Discount", "Bundle", "Free Item", "Rebate", "Loyalty", "Display Rental")
- **EventType**: GRAND_OPENING "Grand Opening", SAMPLING "Sampling", BAZAAR "Bazaar", PRODUCT_LAUNCH "Product Launch", SPONSORSHIP "Sponsorship"
- **Vendor** (3): `ORG-001` "Event Organizer Pro" (category ORGANIZER, ACTIVE), `POS-001` "POS Material Supply" (POS_MATERIAL), `CAT-001` "Catering Nusantara" (CATERING)

**IMPORTANT:** seed.ts uses `prisma.<model>.create` — the seed runs against the **generated** client, so regenerate first. Clean order in seedBudgetingData: `deleteMany` budget lines/programs... actually just `deleteMany` on budgetLines, eventMiscItems, eventVendors, eventVendorPayments, vendors, eventTypes, actionTypes, budgetPeriods, budgetTypes (bottom-up) then create fresh (idempotent like seedCrmData).

**Steps:**
- [ ] Schema: drop enum + 2 fields, validate, db push, generate, build
- [ ] seed.ts: PERMISSIONS + seedBudgetingData()
- [ ] Run: `cd apps/server && bun prisma db push && bun prisma generate && bun run build`
- [ ] Run seed: `bun prisma db seed` from `apps/server` (prisma.config.ts maps seed → `bun run src/prisma/seed.ts`)
- [ ] Verify DB: `bun -e "import {prisma} from './src/lib/prisma.js'; const t=await prisma.budgetType.count(); console.log('budgetTypes',t)"` (or a quick script) — expect 4+ budget types, 4 periods, 6 lines, 9 action types, 5 event types, 3 vendors
- [ ] Restart server per repo memory: `cd /workspaces/erp-sales && bun run build --filter=@repo/server... ` then `bun pm2 restart ecosystem.config.js` (build + restart)
- [ ] Report: schema/build output, seed counts, pm2 restart result

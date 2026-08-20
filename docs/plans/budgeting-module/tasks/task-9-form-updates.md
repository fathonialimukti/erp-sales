### Task 9: Client form updates — ActionProgram / EventProposal / SalesOrder

**Files:**
- Modify: `apps/client/src/pages/action-program/ActionProgramFormPage.tsx`
- Modify: `apps/client/src/pages/event-proposal/EventProposalFormPage.tsx`
- Modify: `apps/client/src/pages/sales-order/SalesOrderFormPage.tsx`

**Frozen contract:**

## ActionProgramFormPage

- **Replace free-text `type` Input** with an `ActionType` SelectSearch (options from `trpcClient.actionType.list`). The form's create/update payload now sends `actionTypeId` (NOT `type`).
- **Replace `outletIds: string[]`** with `outlets: [{outletId, explanation?, cost}]` — the outlet multi-select now carries per-outlet `cost` (number input) + `explanation` (text input) per selected outlet. Keep the existing outlet picker UX but add the two fields per row.
- **Add budget line picker**: `budgetLineId` optional SelectSearch from `trpcClient.budgetLine.list`, **filtered by the program's selected area** (pass `areaId` filter to the list query). Show the line's remaining budget as a hint (from `summary.remaining`).
- **Period auto-suggestion**: when startDate/endDate are set, if they fall inside a BudgetPeriod (from `trpcClient.budgetPeriod.list`), show a hint suggesting the matching period (do NOT auto-lock).
- Keep `skus`, `items`, `payments`, `budgetCurrency`, `rules` as-is.

## EventProposalFormPage

- **Replace free-text `eventType` Input** with an `EventType` SelectSearch (`trpcClient.eventType.list`) → sends `eventTypeId`.
- **Remove `proposedBudget`** field from the form (field gone from API).
- **Add misc-items table** (custom free-form rows): name (text), category (optional select: RENT/FOOD/MATERIAL/OTHER), quantity (number), price (number), total (auto = qty × price, read-only). Add/remove row buttons. Sends `miscItems: [{name, category?, quantity, price, total}]`.
- **Add vendors table**: vendor SelectSearch (`trpcClient.vendor.list`), scope (text), amount (number), notes; **per-vendor payments sub-table** (amount, paymentDate, method?, reference?, notes?) with add/remove. Sends `vendors: [{vendorId, scope?, amount, notes?, payments: [{amount, paymentDate, method?, reference?, notes?}]}]`.
- **Add budget line picker** (same as action-program, filtered by area).
- Keep `skus`, `payments`, `currency`, `observationDays` as-is.

## SalesOrderFormPage

- **Auto-discount prefill banner**: when outlet + date are set, call `trpcClient.salesOrder.suggestDiscounts({outletId, date, skuIds})` (skuIds from the current line items). If any SKU has a suggested discount, show a banner ("Discount program found: <name>") and **prefill `discountPercent` per line** (editable — user can change before save).
- **actionProgramId**: when a discount program is matched, set the order's `actionProgramId` (from the suggestion) so it's sent on create/update. If the user edits the discount away, keep the link (simplest correct) — or clear it; **decision: keep the link once set**.
- The suggestion is a hint, not a hard block — the user can save without it.

**i18n:** add keys under `actionProgram.*`, `eventProposal.*`, `salesOrder.*` for the new labels (budget line picker, misc items, vendors, payments, discount banner). **This task owns these keys** (Task 8 owns the master-page keys).

**Steps:**
- [ ] Update ActionProgramFormPage
- [ ] Update EventProposalFormPage
- [ ] Update SalesOrderFormPage
- [ ] Add i18n keys (en.json + id.json)
- [ ] Verify: `cd apps/client && bun run check-types` — must pass
- [ ] Report: files changed, typecheck result

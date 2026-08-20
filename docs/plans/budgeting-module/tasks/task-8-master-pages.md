### Task 8: Client master pages (budget + 6 master modules)

**Files:**
- Create: `apps/client/src/pages/budget/BudgetPage.tsx`
- Create: `apps/client/src/pages/budget-type/{BudgetTypeIndexPage,BudgetTypeDetailPage,BudgetTypeFormPage}.tsx`
- Create: `apps/client/src/pages/budget-period/{BudgetPeriodIndexPage,BudgetPeriodDetailPage,BudgetPeriodFormPage}.tsx`
- Create: `apps/client/src/pages/budget-line/{BudgetLineIndexPage,BudgetLineDetailPage,BudgetLineFormPage}.tsx`
- Create: `apps/client/src/pages/action-type/{ActionTypeIndexPage,ActionTypeDetailPage,ActionTypeFormPage}.tsx`
- Create: `apps/client/src/pages/event-type/{EventTypeIndexPage,EventTypeDetailPage,EventTypeFormPage}.tsx`
- Create: `apps/client/src/pages/vendor/{VendorIndexPage,VendorDetailPage,VendorFormPage}.tsx`

**Frozen contract:**

Follow the `apps/client/src/pages/region/*` pattern EXACTLY (IndexPage: TanStack Query `useQuery` + `trpcClient.<ns>.list.query`, DataTable, FilterBar, Pagination, ConfirmDialog, DropdownMenu actions, `hasPermissionAtom`; DetailPage: `useQuery` + `trpcClient.<ns>.detail.query`, PageHeader with `module="budget"`; FormPage: create/update via `useMutation`, navigate back, toast). Use `useMeta`, `useToast`, `PageHeader`, `EmptyState`, `Button`, `Input`, `Label`, `Select`/`SelectSearch` from `@/components/ui/*`.

**Router namespaces (from backend — verified):**
- `trpcClient.budgetType.{list, detail, create, update, delete}` — fields: code, name, description?
- `trpcClient.budgetPeriod.{list, detail, create, update, delete}` — fields: code, name, startDate, endDate, status (OPEN/CLOSED)
- `trpcClient.budgetLine.{list, detail, create, update, delete}` — fields: budgetTypeId, periodId, scope (REGION|AREA), regionId?, areaId?, amount, currency; **list/detail rows carry `summary: {allocated, committed, spent, remaining}`** (numbers)
- `trpcClient.actionType.{list, detail, create, update, delete}` — code, name, description?
- `trpcClient.eventType.{list, detail, create, update, delete}` — code, name, description?
- `trpcClient.vendor.{list, detail, create, update, delete}` — code?, name, contactName?, contactPhone?, email?, address?, category?, status?

**Page specifics:**

1. **BudgetPage** (`/budget`): the flagship page. Shows budget lines with **remaining vs allocated progress bars**. Query `trpcClient.budgetLine.list` (limit 100). For each row render: budget type name, period name, scope badge (REGION/AREA), region/area name, allocated (formatted IDR), committed, spent, remaining, and a progress bar (remaining/allocated). Use a simple div-based progress bar (or shadcn `Progress` if available). Group by period or type for readability. `module="budget"`. i18n prefix `budget.*`.
2. **BudgetLineFormPage**: scope picker (REGION/AREA) that conditionally shows region selector (from `trpcClient.region.list`) or area selector (from `trpcClient.area.list`); budgetType selector (`trpcClient.budgetType.list`); period selector (`trpcClient.budgetPeriod.list`); amount input. On edit, prefill from detail.
3. **BudgetLineDetailPage**: show line info + summary (allocated/committed/spent/remaining) + linked action programs & event proposals (from detail's `actionPrograms`/`eventProposals` arrays — id/name/plannedCost/approvalStatus).
4. **Master pages** (budget-type, budget-period, action-type, event-type, vendor): standard CRUD like region. Vendor list filters by status. BudgetPeriod form uses date inputs for startDate/endDate.
5. All pages use `module="budget"` for PageHeader/eyebrow (the new module accent from Task 7).

**i18n:** add keys to `en.json` + `id.json` under `<domain>.*` (e.g. `budget.index.title`, `budgetLine.form.field_scope`, `vendor.form.field_category`, etc.) — follow the `region.*` key naming convention. **This task owns the i18n keys for the new pages** (Task 10 handles the form-update keys for action-program/event-proposal/sales-order).

**Steps:**
- [ ] Create BudgetPage + 6 master module page sets (19 files)
- [ ] Add i18n keys (en.json + id.json)
- [ ] Verify: `cd apps/client && bun run check-types` — must pass
- [ ] Report: files created, typecheck result

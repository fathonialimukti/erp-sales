### Task 8 (FOLLOW-UP — authorize separately): Body/table-cell font-weight → `font-normal`

**Agent:** Frontend Engineer
**Status:** Proposed by Task 7 audit; NOT yet authorized for execution. Run only if user approves.

## Why
T1 inverted the design law's font-weight rule (DESIGN.md §3): body/table/caption = `font-normal` (400); bold reserved for titles/KPI/totals/status/eyebrow/section-labels/buttons/table-headers. The old "bold-everywhere" law left explicit `font-semibold`/`font-bold` on many description-list `<dd>` values, table body cells, and message bodies. These now flatten hierarchy and should drop to `font-normal`.

## Scope (mechanical + a few judgment calls)

### Mechanical → `font-normal` (15 files)
1. `apps/client/src/components/DataTable.tsx:177` — skeleton `<table>` body `font-semibold` → `font-normal`
2. `apps/client/src/components/DataTable.tsx:208` — real `<table>` body `font-semibold` → `font-normal`
3. `apps/client/src/components/DataTable.tsx:223` — header cell `font-bold` → `font-semibold` (downgrade, NOT normal — headers stay emphasized)
4. `apps/client/src/pages/email-crm/EmailCrmDetailPage.tsx:519,523` — email message body cell → `font-normal` (HIGHEST PRIORITY — clear body-text violation)
5. `apps/client/src/pages/email-crm/EmailCrmDetailPage.tsx:414,420,439,456` — dl values → `font-normal`
6. `apps/client/src/pages/activity-logs/ActivityLogDetailPage.tsx:136,165` — dl → `font-normal`
7. `apps/client/src/pages/area/AreaDetailPage.tsx:174,180` — dl → `font-normal`
8. `apps/client/src/pages/outlet/OutletDetailPage.tsx:181,187,193,207` — dl → `font-normal`
9. `apps/client/src/pages/region/RegionDetailPage.tsx:164,170,176,218` — dl → `font-normal`
10. `apps/client/src/pages/sku/SkuDetailPage.tsx:178,184,192` — dl → `font-normal`
11. `apps/client/src/pages/users/UserDetailPage.tsx:195,201` — dl → `font-normal`
12. `apps/client/src/pages/visit-log/VisitLogDetailPage.tsx:295,318,330,342,351,443` — dl + notes body → `font-normal`
13. `apps/client/src/pages/access-control/RoleDetailPage.tsx:191,242,247` — dl values → `font-normal`
14. `apps/client/src/pages/sales-order/SalesOrderIndexPage.tsx:250` — doc-number cell → `font-normal`
15. `apps/client/src/pages/sales-order/SalesOrderPipeline.tsx:164` — card doc-number → `font-normal`

### Judgment calls (KPI-adjacent counts — keep if rendered as a KPI tile, else `font-normal`)
- `CustomerDetailPage.tsx:181` (outlet count), `ActionProgramDetailPage.tsx:189`, `KnowledgeBaseDetailPage.tsx:180`, `SkuCategoryDetailPage.tsx:182`, `EventProposalDetailPage.tsx:281` (if a monetary total, keep; if a plain count dl, `font-normal`)

### DO NOT TOUCH (bold-reserved — confirmed by audit)
All PageHeader titles/eyebrows, KpiCard/ReportKpiCard values+labels, FormSection/EmptyState/StatusChip/FormField labels, Sidebar/Topbar brand+eyebrows, LandingPage/LoginPage/Dashboard KPI strings, SalesOrderDetailPage/FormPage totals (:737,:746,:752,:805,:831), SalesOrderPipeline count badge+amount (:127,:172), RegionFormPage:261 (Button), NotificationsPage:220 unread state, AiAdminChatPage:227 markdown `<th>`, ApprovalTimeline:312.

## Verify
`bun run check-types` clean. Spot-check a DetailPage renders with restored hierarchy (regular body values, bold titles/totals).

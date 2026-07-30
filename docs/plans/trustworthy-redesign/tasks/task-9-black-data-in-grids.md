### Task 9: Black data in grids + soften muted chrome

**Agent:** Frontend Engineer
**Origin:** User feedback on `/region` table — chromatic-Azure `text-muted-foreground` on data cells (codes, counts, IDs, secondary names) makes grids read as blue/black speckle, not professional financial data.

## Problem
The "no gray text" law (DESIGN.md §3) set `--muted-foreground` to chromatic Azure `oklch(0.32 0.18 242.749)` — a real blue, chroma 0.18. Applied to **chrome** (eyebrows, "9 regions" count, caption meta) it reads warm/branded. Applied to **data-grid cells and detail-page `<dd>` values**, it speckles the grid blue-and-black, which the user correctly reads as unprofessional. Corporate/professional data tools (Salesforce, NetSuite, Bloomberg, Excel, Linear) use **black for all data**, differentiate by weight/size/mono/alignment, and reserve color for status/links only.

## Thesis (amends DESIGN.md §3 — scoped exception)
**Inside data grids and description-list values, color = meaning only.** Black carries the data; hierarchy comes from weight + size + mono + alignment. `text-muted-foreground` (chromatic Azure) stays for **chrome narratives only**: table-level count text ("9 regions"), filter labels, empty-state copy, eyebrow `<dt>` labels, section captions, sort hints. It never colors a data cell.

## Scope — three coordinated changes

### Change 1 — `apps/client/src/components/DataTable.tsx` (data-grid color policy)
- Line 83: sort-hint icon `text-muted-foreground/70` → **keep** (chrome — sort affordance)
- Line 167: empty-state count `text-sm font-medium text-foreground` → **keep** (already black)
- Line 177 + 208: `<table className="... text-sm font-semibold text-foreground">` → change `font-semibold` → `font-normal` (table body weight per Task 8 follow-up; data is black here, good) — **keep `text-foreground`**
- Line 223: header cell `font-bold tracking-wide text-muted-foreground` → change to `font-semibold tracking-wide text-foreground` (headers are chrome but should read as structured black labels, not blue; `font-semibold` per Task 8's header downgrade)
Net: table body + headers all black; only the sort-hint icon stays chromatic.

### Change 2 — Index-page cell renderers (17 files) — data cells go black
For EACH `*IndexPage.tsx`, find cell renderers that put `text-muted-foreground` on **data** (codes, emails, customer/area/role names, IDs, document numbers, counts, secondary values spans) and change to `text-foreground`. Keep `text-muted-foreground` only on cell-internal chrome (e.g. a tiny meta label above a value — rare). Differentiate secondary data by **weight/size/mono**, not color.

Files + the data-cell lines to flip (verify each by reading — line numbers approximate):
- `region/RegionIndexPage.tsx:81` (code `font-mono text-xs text-muted-foreground` → `text-foreground`), `:93` (areas count `tabular-nums text-muted-foreground` → `text-foreground`)
- `area/AreaIndexPage.tsx:74` (code), `:86` (count)
- `outlet/OutletIndexPage.tsx:90` (code), `:106` (customerName)
- `customer/CustomerIndexPage.tsx:90` (code) + other data-cell hits
- `sku/SkuIndexPage.tsx:96` (code) + other data-cell hits
- `sku-category/SkuCategoryIndexPage.tsx:74` (code) + other data-cell hits
- `users/UsersIndexPage.tsx:105` (email), `:114` (role name)
- `access-control/RolesIndexPage.tsx:91` (description span — if it's data, black; if chrome meta, keep), `:100` (count)
- `visit-log/VisitLogIndexPage.tsx:116` (data span) + other data-cell hits
- `activity-logs/ActivityLogsIndexPage.tsx:78` (code), `:102` (email)
- `action-program/ActionProgramIndexPage.tsx:82` (code), `:104` (count)
- `email-crm/EmailCrmIndexPage.tsx:133` (email), `:176` (customer name)
- `event-proposal/EventProposalIndexPage.tsx:82` (code) + other data-cell hits
- `knowledge-base/KnowledgeBaseIndexPage.tsx:96` (data span), `:278` (empty-state copy → **keep muted**, it's chrome)
- `sales-order/SalesOrderIndexPage.tsx:253` (data `text-[11px]`), `:272` (data), `:287` (area name), `:298` (count) + other data-cell hits
- `sales-order/SalesOrderPipeline.tsx:134` (data span), `:150` (empty-state copy → keep muted)

**Rule of thumb per hit:** is this span rendering a field VALUE the user scans as data? → `text-foreground`. Is it a label/count-above-table/empty-caption/sort-hint? → keep `text-muted-foreground`. When unsure, prefer black for anything inside a `<td>`.

### Change 3 — Detail-page `<dd>` values go black (folds in Task 8's dd scope)
Detail pages currently render `<dd className="text-sm font-semibold text-foreground">` for primary values (already black — good) but some render `<dd className="text-sm text-muted-foreground">` for secondary values (e.g. `EmailCrmDetailPage:448`). Flip any `<dd>` that is a **data value** to `text-foreground`. Keep `<dt>` labels chromatic (they're eyebrow-chrome). Also apply the Task 8 font-weight pass while here: `<dd>` data values → `text-foreground font-normal` (was `font-semibold`); keep `font-bold` only on totals/KPI-style values.

Detail pages to touch (data-cell `<dd>` + the Task 8 weight flip):
- `region/RegionDetailPage.tsx` (:164 code, :170 name, :176 count → black + `font-normal`; :218 list item name is data → black)
- `area/AreaDetailPage.tsx` (:174, :180 + Task 8 lines)
- `outlet/OutletDetailPage.tsx` (:181, :187, :193, :207 + Task 8)
- `customer/CustomerDetailPage.tsx` (:181 + Task 8)
- `sku/SkuDetailPage.tsx` (:178, :184, :192 + Task 8)
- `sku-category/SkuCategoryDetailPage.tsx` (:182 + Task 8)
- `users/UserDetailPage.tsx` (:181 email is already black? verify; :195, :201 + Task 8)
- `visit-log/VisitLogDetailPage.tsx` (:295, :318, :330, :342, :351, :443 + Task 8)
- `action-program/ActionProgramDetailPage.tsx` (:189 + Task 8)
- `activity-logs/ActivityLogDetailPage.tsx` (:136, :165 + Task 8)
- `access-control/RoleDetailPage.tsx` (:191, :242, :247 + Task 8)
- `email-crm/EmailCrmDetailPage.tsx` (:414, :420, :439, :448, :456, :519, :523 + Task 8 — :448 is the clearest blue-data violation)
- `event-proposal/EventProposalDetailPage.tsx` (:281 if total keep bold; :392 body → black normal + Task 8)
- `knowledge-base/KnowledgeBaseDetailPage.tsx` (:180 + Task 8)
- `sales-order/SalesOrderDetailPage.tsx` (:606 `text-muted-foreground` on a non-current timeline node — semantic state, **keep**; :620 `text-muted-foreground` on non-current node — semantic, **keep**; :657 table header `text-muted-foreground` → `text-foreground`; dl values per Task 8)

**DO NOT touch** (semantic state, keep chromatic/blue): `SalesOrderDetailPage:606,620` (timeline non-current = semantic), `Dashboard:412` (`bg-muted text-muted-foreground` on zero-delta = semantic), `NotificationsPage:225` (timestamp — borderline; prefer black `text-foreground` since it's data, but if it reads as chrome-meta keep), status-chip colors, `<dt>` eyebrow labels (keep chromatic).

### Change 4 — Soften `--muted-foreground` chroma (chrome stays tasteful)
In `apps/client/src/index.css`:
- `:root` `--muted-foreground: oklch(0.32 0.18 242.749)` → `oklch(0.34 0.10 242.749)` (drop chroma 0.18→0.10; nudge L 0.32→0.34 for legibility). Stays chromatic (not gray), but a whisper of blue, not a shout.
- `.dark` `--muted-foreground: oklch(0.72 0.14 242)` → `oklch(0.72 0.08 242)` (chroma 0.14→0.08).
This ensures the remaining chrome usages (eyebrows, "9 regions", sort hints) read as a calm tint, supporting the professional feel.

## Rules
- VS Code edit tools only (`replace_string_in_file` with `expected_replacements` for identical strings; `multi_replace_string_in_file` for batch). NEVER shell/heredoc.
- ONLY flip data-cell / `<dd>`-value colors to `text-foreground`. Keep `text-muted-foreground` on chrome: table-level count text, filter labels, `<dt>` eyebrow labels, empty-state copy, sort-hint icons, section captions.
- Keep semantic-state colors (timeline non-current, zero-delta, status chips) untouched.
- Do NOT introduce gray text (`text-gray-*`/`text-slate-*` etc.) — `--muted-foreground` stays chromatic, just softer.
- Fold in the Task 8 font-weight pass on the same `<dd>`/table-body touches (efficiency): data `<dd>` → `text-foreground font-normal`; table body → `font-normal`; table headers → `font-semibold` (downgrade from `font-bold`). Keep `font-bold` on titles/KPI/totals/status/eyebrow.
- `ui-ux-pro-max` available if a second opinion on the data-grid hierarchy helps.

## Verify before returning
- Run `bun run check-types` from repo root. Confirm clean.
- Run `grep_search` for `text-muted-foreground` across `apps/client/src/pages/**/*IndexPage.tsx` + the touched DetailPages — confirm remaining hits are chrome-only (counts, labels, empty-state, sort hints), NOT data cells.
- Mentally re-render the `/region` table: Code `JKT` black mono, Name `Jakarta` black, Areas `2` black tabular. Header row black `font-semibold`. "9 regions" above table = soft blue chrome. That's the target.

## Return to me
1. DataTable.tsx changes (lines 177/208/223 exact before/after)
2. Per IndexPage: list of data-cell lines flipped to `text-foreground` (file:line count)
3. Per DetailPage: `<dd>` data values flipped to `text-foreground font-normal` (+ any Task 8 weight changes)
4. index.css `--muted-foreground` new values (light + dark)
5. Confirmation semantic-state colors preserved (SalesOrderDetailPage:606,620; Dashboard:412; StatusChip)
6. `bun run check-types` result
7. Final grep result: remaining `text-muted-foreground` hits are chrome-only
8. Any deviation + why
9. One-sentence "do data grids now read as black-data/color=meaning, professional?" yes/no

### Task 4: Budget export (client)

**Files:**
- Modify: the budget index page (find via glob `apps/client/src/pages/budget/*.tsx`; if budgets surface on multiple pages, export lives on the primary index page only)
- Test (write only — never run): only if logic is extractable and testable per repo conventions; otherwise state why not

**Interfaces:**
- Consumes (from Task 3 `## Produces`, verbatim):
  - **Shared util:** `apps/client/src/lib/export/useWorkbookExport.ts`
    - `useWorkbookExport(): UseWorkbookExportResult` — hook; `UseWorkbookExportResult = { exportWorkbook: (options: WorkbookExportOptions) => Promise<string | null>; isExporting: boolean }` (resolves with the generated filename, or `null` on failure with the error toast already shown)
    - `workbookFilename(prefix: string, now?: Date): string` — `prefix-YYYY-MM-DD.xlsx`
    - `interface WorkbookExportOptions { prefix: string; sheetName: string; columns: WorkbookColumn[]; rows: Record<string, unknown>[]; summary?: { sheetName: string; rows: { label: string; value: string | number }[] } }`
    - `interface WorkbookColumn { key: string; header: string; format?: (value: unknown) => string | number }` (headers are pre-translated via `intl.formatMessage`)
  - **UI pattern to copy:** the reworked report sections (`apps/client/src/pages/reports/sections/*Report.tsx`) — export button with `Loader2` + disabled while `isExporting`
  - **Data source:** existing budget tRPC routers (`budget`, `budget-line`, `budget-period`) — read the budget pages/routers for the exact list/detail query shape; no new server endpoints
- Produces (for Task 6 i18n): exact NEW keys under the budget i18n prefix (match the page's existing prefix naming)

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- The budget pages + `apps/client/src/lib/export/useWorkbookExport.ts` + one reworked report section as pattern reference
- `apps/client/src/locales/en.json` (budget key prefix)

**Frozen contract:**
- "Export Excel" button on the budget index page toolbar (same placement/pattern as reports)
- Workbook: one row per budget line (or per budget if lines aren't loaded on the index — read the actual data shape and pick the leanest mapping that still carries real numbers); columns all via intl headers; money right-aligned via `format`
- Filename prefix: `budgets` → `budgets-YYYY-MM-DD.xlsx`
- Currency digits convention: IDR → 0, others → 2 (match how the page formats money on screen)
- Loading + error feedback via the hook (toast handled by hook; button spinner handled by you)
- Scope guard: ONLY budget page files; no locale edits (reference keys with `defaultMessage` fallbacks); no new dependencies; no server changes

**Steps:**
- [ ] Step 1: Wire the export button + data mapping
- [ ] Step 2: Write scoped test if feasible
- [ ] Step 3: Self-review; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: file(s) changed, columns exported, and exact NEW i18n keys (name + en/id meaning) for Task 6.

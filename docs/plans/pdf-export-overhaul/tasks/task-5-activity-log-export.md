### Task 5: Activity log export (client)

**Files:**
- Modify: the activity/system log page (find via glob/grep `apps/client/src/pages/**/*{Log,log,Audit,audit}*.tsx`)
- Test (write only — never run): only if logic is extractable and testable per repo conventions; otherwise state why not

**Interfaces:**
- Consumes (from Task 3 `## Produces`, verbatim):
  - **Shared util:** `apps/client/src/lib/export/useWorkbookExport.ts`
    - `useWorkbookExport(): UseWorkbookExportResult` — hook; `UseWorkbookExportResult = { exportWorkbook: (options: WorkbookExportOptions) => Promise<string | null>; isExporting: boolean }` (resolves with the generated filename, or `null` on failure with the error toast already shown)
    - `workbookFilename(prefix: string, now?: Date): string` — `prefix-YYYY-MM-DD.xlsx`
    - `interface WorkbookExportOptions { prefix: string; sheetName: string; columns: WorkbookColumn[]; rows: Record<string, unknown>[]; summary?: { sheetName: string; rows: { label: string; value: string | number }[] } }`
    - `interface WorkbookColumn { key: string; header: string; format?: (value: unknown) => string | number }` (headers are pre-translated via `intl.formatMessage`)
  - **UI pattern to copy:** the reworked report sections (`apps/client/src/pages/reports/sections/*Report.tsx`) — export button with `Loader2` + disabled while `isExporting`
  - **Data source:** the existing activity/log tRPC list endpoint (paginated) — read the page + router for the exact shape; no new server endpoints. Fetch-all client-side by looping pages (cursor/offset per the API), **cap at 10,000 rows** with a translated toast/warning telling the user the export was truncated
- Produces (for Task 6 i18n): exact NEW keys under the log page's existing i18n prefix

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- The activity log page + its tRPC router + `apps/client/src/lib/export/useWorkbookExport.ts` + one reworked report section as pattern reference
- `apps/client/src/locales/en.json` (existing key prefix for the log page)

**Frozen contract:**
- "Export Excel" button on the log page toolbar (same pattern as reports)
- Columns: timestamp, actor/user, action/resource, and whatever detail fields the log model exposes — all headers via intl
- Filename prefix: `activity-log` → `activity-log-YYYY-MM-DD.xlsx`
- Timestamp column formatted with the existing date/time convention used on screen
- Cap 10,000 rows with translated truncation warning; loading + error feedback via the hook
- Scope guard: ONLY the log page file(s); no locale edits (reference keys with `defaultMessage` fallbacks); no new dependencies; no server changes

**Steps:**
- [ ] Step 1: Wire paginated fetch-all + export button
- [ ] Step 2: Write scoped test if feasible
- [ ] Step 3: Self-review; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: file(s) changed, columns exported, row cap behavior, and exact NEW i18n keys (name + en/id meaning) for Task 6.

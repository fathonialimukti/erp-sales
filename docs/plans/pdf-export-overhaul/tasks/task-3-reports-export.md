### Task 3: Reports export rework + shared workbook util + purpose-built report print

**Files:**
- Create: shared workbook export util (path per conventions, e.g. `apps/client/src/lib/export/useWorkbookExport.ts`)
- Create: print-only report sheet component + print stylesheet (e.g. `apps/client/src/components/reports/ReportPrintSheet.tsx`, `apps/client/src/styles/report-print.css` — placement per conventions)
- Modify: `apps/client/src/components/reports/useReportExport.ts` (delegate to the shared util)
- Modify: all four report sections — `apps/client/src/pages/reports/sections/{SalesReport,FieldReport,CollectionReport,PromoReport}.tsx` (export wiring + print-area markup)
- Modify: `apps/client/package.json` — replace `xlsx@0.18.5` with the current SheetJS CDN release (`xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` or latest 0.20.x) and sync the lockfile via the workspace install command
- Test (write only — never run): unit test for the shared util (workbook build, i18n headers, date-stamped filename, error path)

**Interfaces:**
- Consumes (from Task 1 `## Produces`, verbatim):
  - **Client identity path:** `settings.companyIdentity` — tRPC `protectedProcedure.query`, no input, no extra permission. Response shape: `{ name: string; addressLines: string[]; phone: string; taxId: string }`. Used for the print sheet header block via `trpcClient.settings.companyIdentity.query()` in a `queryFn`.
  - **Print ink hexes (mirror with a `/* KEEP IN SYNC with apps/server/src/lib/print-palette.ts */` comment):** `PRINT_INK #080D16` · `PRINT_MUTED #003B67` · `PRINT_BORDER #D6DFE7` · `PRINT_PAPER #FFFFFF` · `PRINT_PRIMARY #0069A6` · `PRINT_WASH_SOFT #F4F7F9` · `PRINT_WASH_PRIMARY #E6F0F6` · `PRINT_WASH_DESTRUCTIVE #FDE6E7`.
  - **Currency digits convention:** IDR → 0, all other currencies → 2.
  - Server code is consumed via tRPC/HTTP only — never import server modules from the client.
- Produces (frozen contract for Tasks 4 & 5 — report exactly): the shared util's export name, file path, and full call signature
- Produces (for Task 6 i18n): exact NEW keys under `reports.print.*` / `reports.export.*`

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- `apps/client/src/components/reports/useReportExport.ts`, the four report section files, one `Region*.tsx` page for page conventions
- `apps/client/src/locales/en.json` + `id.json` (existing `reports.*` column keys — reuse for xlsx headers wherever they exist)

**Frozen contract:**
- Shared util behavior: builds `.xlsx` with i18n column headers (all headers via intl — none hardcoded English), date-stamped filename `prefix-YYYY-MM-DD.xlsx`, async with loading + translated error states (no synchronous UI-blocking `XLSX.writeFile` without feedback), KPI/trend summary second sheet only where data is trivially available from existing state
- Report print (fixes audit HIGH findings): real CSS for `.printing-report` / `.print-area` / `.no-print` — hide shell chrome (sidebar/topbar/buttons), light-ink reset so dark-mode cannot produce white-on-white paper, `print-color-adjust: exact`, `break-inside: avoid` on rows/cards, A4 target
- Print sheet content: title block (report name, date range, generated-at timestamp) + company identity block (name / addressLines / phone / taxId from Task 1's client source); report table reuses on-screen column definitions
- i18n prefixes: `reports.print.*` (sheet labels) and `reports.export.*` (button/loading/error/filename); reuse existing column keys for headers
- Scope guard: no raw hex (use the print ink pattern from the frozen print palette — mirror hexes with a KEEP-IN-SYNC comment referencing `apps/server/src/lib/print-palette.ts`), all user-visible strings via intl, functional components, `trpcClient.*` in `queryFn` only

**Steps:**
- [ ] Step 1: Build + unit-test the shared util (tests written, not run)
- [ ] Step 2: Rework `useReportExport.ts` + four sections onto the util
- [ ] Step 3: Print sheet component + print CSS (including the class definitions that are currently missing)
- [ ] Step 4: Bump xlsx via SheetJS CDN, sync lockfile
- [ ] Step 5: Self-review; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact util export name + signature + path, exact new file paths, exact NEW i18n keys (name + en/id meaning), and confirmation of the xlsx version installed.

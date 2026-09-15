### Task P-T1: Shared document-print foundation

**Files:**
- Create: `apps/client/src/lib/print/usePrintSheet.ts` — shared print-sheet hook
- Create: `apps/client/src/styles/print-document.css` — base document-print stylesheet
- Modify: only the import wiring required to load the new CSS per existing convention (check how `apps/client/src/styles/report-print.css` is imported and follow it exactly)
- Test (write only — never run): unit test for the hook's print-timing logic if headlessly assertable (mock `window.print`, rAF, afterprint); otherwise state why not

**Interfaces:**
- Consumes (frozen facts from the PDF Export Overhaul plan):
  - **Print palette (mirror with `/* KEEP IN SYNC with apps/server/src/lib/print-palette.ts */`):** `PRINT_INK #080D16` · `PRINT_MUTED #003B67` · `PRINT_BORDER #D6DFE7` · `PRINT_PAPER #FFFFFF` · `PRINT_PRIMARY #0069A6` · `PRINT_SUCCESS #00A859` · `PRINT_WARNING #EF9900` · `PRINT_DESTRUCTIVE #E7000B` · `PRINT_WASH_NEUTRAL #EAEFF3` · `PRINT_WASH_SOFT #F4F7F9` · `PRINT_WASH_PRIMARY #E6F0F6` · `PRINT_WASH_SUCCESS #D9F2E6` · `PRINT_WASH_DESTRUCTIVE #FDE6E7` · status map `DRAFT/AI_VALIDATED/PROPOSED/APPROVED/REJECTED → {bg,fg}` (unknown → neutral). Currency digits: IDR → 0, others → 2.
  - **Company identity:** `settings.companyIdentity` — tRPC `protectedProcedure.query`, no input → `{ name: string; addressLines: string[]; phone: string; taxId: string }`
  - **Pattern sources to read (do NOT modify):** `apps/client/src/components/reports/ReportPrintSheet.tsx` (portal + body-class + light-ink reset pattern) and `apps/client/src/pages/sales-order/SalesOrderPrint.tsx` + `SalesOrder.css` §12 (formal-document sheet: letterhead, meta grid, line-item table, totals band, signature trio, printed-on footer, double-rAF timing, afterprint cleanup)
- Produces (frozen contract for P-T2/P-T3 — report exactly): the hook's export name, signature, and full option/return types; the complete CSS class inventory with one-line purpose each; the CSS import path consumers must use

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- Both pattern sources above + `apps/client/src/styles/report-print.css` + how it is imported
- `apps/client/src/lib/motion.ts` (motion law — print sheet needs none, confirm no violations)

**Frozen contract:**
- `usePrintSheet` owns: body-class scoping for document print, double-rAF paint timing before `window.print()`, afterprint cleanup, re-entrancy guard (no double-print while printing). The sheet component itself owns the portal to `<body>` and its markup (hook stays DOM-agnostic — same split as the pattern sources)
- `print-document.css` provides the base formal-document classes: `@page { size: A4; margin: 14mm 12mm }`, document scoping (shell chrome hidden ONLY while the sheet is mounted, in the same `:has()`/body-class style as the existing scoped hack — must not contaminate other pages), letterhead block, meta grid, line-item table (zebra, `break-inside: avoid`, header repeat via `thead`), totals band with border fallback, status pills using the palette status map, signature trio, printed-on footer, `print-color-adjust: exact`, light-ink reset (dark-mode cannot reach paper)
- Class names follow the existing `so-print__*` naming spirit but for the new base (`print-document__*` or better — your call, report it)
- NO raw hex outside the mirrored palette; NO touching `SalesOrderPrint.tsx`, `ReportPrintSheet.tsx`, `report-print.css`, or any locale file
- Lean: extract only what two consumers genuinely share; nothing speculative

**Steps:**
- [ ] Step 1: Extract the shared hook + CSS from the pattern sources (read-only reference)
- [ ] Step 2: Write hook unit test if feasible
- [ ] Step 3: Self-review against the contract; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact hook export name + full signature, exact CSS class inventory, exact import path for consumers.

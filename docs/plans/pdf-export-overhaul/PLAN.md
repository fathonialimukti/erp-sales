# PDF Export Overhaul — Plan

**Scope:** Option C — P0 stabilization + P1 design convergence + P2 new exports (activity log, budgets, purpose-built report print).

**Findings source (2026-09-08 audits):** quality-engineer inventory + frontend-engineer design review. Key defects: PDFKit silently drops one line item per page break; global print CSS hack in `SalesOrder.css` blanks every other page's printouts; report print toggles classes no stylesheet defines (prints raw app UI); dark-mode leak on report print; two divergent brands (violet PDFKit vs blue-gradient HTML sheet); server PDF has zero i18n; xlsx headers hardcoded English; `xlsx@0.18.5` stale CVEs.

## Task DAG

| # | Task | Layer | Owner | Files (ownership) |
|---|------|-------|-------|-------------------|
| T1 | Server PDF rework + print palette + company identity | L1 (seq) | backend-engineer | `apps/server/src/lib/sales-order-pdf.ts`, `routes/sales-order-pdf.ts`, new `lib/print-palette.ts`, `lib/company-identity.ts`, identity exposure router |
| T2 | Sales-order print sheet fixes | L2 (par) | frontend-engineer | `pages/sales-order/SalesOrderPrint.tsx`, `SalesOrder.css` print sections, sales-order index/detail print lines |
| T3 | Reports export rework + shared workbook util + purpose-built report print | L2 (par) | frontend-engineer | `components/reports/*`, new export util, new print sheet + print CSS, `apps/client/package.json` |
| T4 | Budget export | L3 (par) | frontend-engineer | budget pages only |
| T5 | Activity log export | L3 (par) | frontend-engineer | activity log page only |
| T6 | i18n keys (en + id) | L4 (seq) | frontend-engineer | `locales/en.json`, `locales/id.json` only |
| T7 | Final whole-branch review + run all tests | final | quality-engineer | none (review only) |

**Contracts:** T2/T3 consume T1's `## Produces` verbatim. T4/T5 consume T3's export util signature. T6 consumes union of i18n keys reported by T2–T5. Implementers write scoped tests but never run them; QE runs everything.

**Deferred (out of scope, tracked):** invoice/quotation module (domains don't exist), logo asset upload (identity is text-based), consolidation of the two sales-order print mechanisms (dual paths kept; palette unified instead).

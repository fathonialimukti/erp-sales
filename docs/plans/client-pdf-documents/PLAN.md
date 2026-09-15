# Client-Side PDF Documents — Action Program & Event Proposal

**Scope:** two new client-side print/PDF documents (browser print → Save as PDF; no PDFKit), per user decision. Reuses the proven recipe from the PDF Export Overhaul: portaled print-only sheet, frozen print palette, `settings.companyIdentity` letterhead, en+id i18n, double-rAF print timing.

**Target domains:** `action-program` and `event-proposal` (both had zero export capability per the 2026-09-08 audit).

**Approach:** the two sheets share a document-print foundation (portal + print-timing hook + base document CSS). That foundation is extracted once (Layer 1), then each domain sheet consumes it in parallel. Existing print surfaces (`SalesOrderPrint`, `ReportPrintSheet`) are NOT refactored onto the foundation this pass — noted as debt.

## Task DAG

| # | Task | Layer | Owner | Files (ownership) |
|---|------|-------|-------|-------------------|
| P-T1 | Shared document-print foundation (`usePrintSheet` hook + `print-document.css`) | L1 (seq) | frontend-engineer | new `lib/print/` + `styles/` files only |
| P-T2 | Action Program print sheet + detail-page print button | L2 (par) | frontend-engineer | `pages/action-program/*` + new sheet component |
| P-T3 | Event Proposal print sheet + detail-page print button | L2 (par) | frontend-engineer | `pages/event-proposal/*` + new sheet component |
| P-T4 | i18n keys (en + id) | L3 (seq) | frontend-engineer | `locales/en.json`, `locales/id.json` only |
| P-T5 | Final whole-branch review + tests | final | quality-engineer | none (review only) |

**Contracts:** P-T2/P-T3 consume P-T1's hook signature + CSS class inventory verbatim, plus the frozen palette hexes and `settings.companyIdentity` shape from the PDF Export Overhaul plan. P-T4 consumes the union of i18n keys reported by P-T2/P-T3.

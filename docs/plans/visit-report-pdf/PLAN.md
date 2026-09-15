# Visit Report — Client-Side PDF Document

**Scope:** third consumer of the document-print foundation — a per-visit formal document (proof-of-visit artifact: outlet, salesman, timing, notes/outcomes, sign-off) — plus the helper lift the QE review flagged as justified at the 3rd consumer, and the two one-line Low findings from that review.

**Approach:** client-side print/PDF only (browser print → Save as PDF), same recipe as Action Program / Event Proposal sheets. Server PDFKit stays sales-order-only.

## Task DAG

| # | Task | Layer | Owner | Files (ownership) |
|---|------|-------|-------|-------------------|
| V-T1 | Foundation consolidation: lift shared formatters + letterhead/meta/signature parts; fix status-map gap + `@/lib/trpc` import; drop gratuitous exports | L1 (seq) | frontend-engineer | `lib/print/*` (new shared module), `styles/print-document.css`, both existing print sheets + their tests |
| V-T2 | Visit Report print sheet + trigger on the visit surface | L2 (seq after V-T1) | frontend-engineer | `pages/visit-log/*` (or wherever visits render) + new sheet component |
| V-T3 | i18n keys (en + id) | L3 | frontend-engineer | `locales/en.json`, `locales/id.json` only |
| V-T4 | Final whole-branch review + tests | final | quality-engineer | none (review only) |

**Contracts:** V-T2 consumes V-T1's shared-module exports verbatim plus the existing foundation contract (`usePrintSheet`, `print-document__*` classes, palette, `settings.companyIdentity`). V-T3 consumes the union of V-T2's reported keys.

**Deliberately out of scope:** migrating `SalesOrderPrint.tsx` / `ReportPrintSheet.tsx` onto the foundation (bigger refactor, separate decision), photo embedding if visit photos are not already served by an accessible URL (report gap if so).

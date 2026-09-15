### Task J-T2: Migrate Action Program document to jsPDF modal

**Files:**
- Create: `apps/client/src/pages/action-program/actionProgramPdf.ts` — pure spec-mapping module (`buildActionProgramPdfSpec(record, identity, labels)` + helpers, testable in node env)
- Create: `apps/client/src/tests/pages/action-program/actionProgramPdf.test.ts` — mapping tests (adapt existing `actionProgramPrintSheet.test.ts` coverage: `computeProgramTotals` parity with server `computeActionProgramPlannedCost`, `toNum` coercion via shared `print-format`, currency digits)
- Delete: `apps/client/src/pages/action-program/ActionProgramPrintSheet.tsx`, `ActionProgramPrintSheet.css`, and the old print-sheet test file
- Modify: `apps/client/src/pages/action-program/ActionProgramDetailPage.tsx` — trigger becomes modal-open (no `usePrintSheet`, no portaled sheet)

**Interfaces:**
- Consumes (from J-T1 `## Produces`, verbatim — the frozen foundation contract):
  - `apps/client/src/lib/pdf/pdfTheme.ts`: `documentStatusTone(status): "neutral" | "primary" | "success" | "destructive"` (DRAFT→neutral · VALIDATING/AI_VALIDATED/PROPOSED→primary · APPROVED→success · REJECTED→destructive)
  - `apps/client/src/lib/pdf/documentPdf.ts`:
    - `DocumentPdfLetterhead { identity: PdfCompanyIdentity | null; fallbackInitial; fallbackName; fallbackTagline; phoneLabel; taxIdLabel; title; documentNumber; status: { label: string; tone: DocumentPdfStatusTone } | null }`
    - `DocumentPdfMetaItem { label; value }` (4-col grid) · `DocumentPdfTableCell { text; align?: "left"|"right"; bold? }` · `DocumentPdfTableSpec { title?; columns; widths; numericColumns?; rows: DocumentPdfTableCell[][]; subtotal?: { label; value }; emptyMessage? }` (widths are relative fractions summing to 1)
    - `DocumentPdfBlock = { kind: "section"; title; body } | { kind: "table"; table } | { kind: "grandTotal"; label; value }`
    - `DocumentPdfSignature { label; name?; meta? }`
    - `DocumentPdfSpec { letterhead; meta; blocks; signatures; footer: { printedOn; pageIndicator? } }` — labels pre-resolved, zero i18n in renderer
  - `apps/client/src/lib/pdf/usePdfDocument.ts`: `sanitizePdfFileName(raw): string`
  - `apps/client/src/components/pdf/PdfDocumentModal.tsx`: `PdfDocumentModalProps { open; onOpenChange; title; buildKey: string ("") = not ready; buildSpec: (identity: PdfCompanyIdentity | null) => DocumentPdfSpec; fileName; identity?; labels? }` — modal queries `settings.companyIdentity` itself unless `identity` is passed
  - Shared formatters stay: `apps/client/src/lib/print/print-format.ts` (`toNum`, `currencyDigits`, `formatDocumentMoney`, `titleCase`, `formatDateTime`) — AP keeps its local-time `formatDate`/`formatQty` (period instants are local — do NOT unify to UTC)
- Consumes (content contract — the document's CONTENT is preserved 1:1 from the existing print sheet; only the rendering engine changes):
  Title "Action Program" · docNumber fallback `AP #<id8>` · status via `documentStatusTone(approvalStatus)` · meta 8 cells (Program, Type, Period, Area, PIC, Prepared by, Status, Currency) · description section (omit when null) · three tables with subtotals Σ cost (outlets: code/outlet/explanation/cost; items: name+notes/qty/price/cost; SKUs: code/name+notes/qty/price/discount-as-money/cost; each with `emptyMessage`) · grandTotal = stored `plannedCost` · signatures Prepared by / PIC / Approved by (blank) · footer `printedOn`
- Produces (for J-T5 i18n): any NEW keys (expect none — reuse `action_program.print.*`; if the modal needs labels beyond J-T1's, report them)

**Reads (in your own context):** `AGENTS.md`, `docs/plans/jspdf-documents/PLAN.md` (pipeline contract), the current `ActionProgramPrintSheet.tsx` (content source — delete after porting), `ActionProgramDetailPage.tsx`, `PdfDocumentModal.tsx` + `documentPdf.ts` + `usePdfDocument.ts`, `print-format.ts`

**Frozen contract:**
- Trigger: the existing toolbar "Print / PDF" button now opens `PdfDocumentModal` (open state on the page). NO direct `window.print`, no `usePrintSheet`
- `buildKey`: stable per record state — `<id>:<updatedAt>` (or equivalent; "" while `data` loads → modal shows loading, never builds incomplete)
- `buildSpec`: pure mapping module, receives `identity` from the modal, resolves ALL labels via `intl.formatMessage` captured on the page (callers own i18n)
- `fileName`: `sanitizePdfFileName(<documentNumber>)`
- Document CONTENT identical to the current sheet (same fields, same totals logic, same empty guards, same signature roles); the renderer handles layout/pagination
- No `@/` alias in the new module; relative imports; no edits to shared `lib/pdf/*` or `lib/print/print-format.ts` (report gaps); no locale edits; no server changes
- Scope guard: only the files listed above

**Steps:** [1] Port mapping → pure module + tests · [2] Rewire page (modal open/close, delete sheet files) · [3] Self-review content parity vs old sheet · do NOT run tests · do NOT git-write

**Report back (mandatory):** End with `## Produces`: files created/deleted/modified, spec-mapping summary, buildKey choice, and any NEW i18n keys (expect none).

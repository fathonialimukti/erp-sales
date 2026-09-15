### Task J-T3: Migrate Event Proposal document to jsPDF modal

**Files:**
- Create: `apps/client/src/pages/event-proposal/eventProposalPdf.ts` — pure spec-mapping module (`buildEventProposalPdfSpec(record, identity, labels)`, testable in node env)
- Create: `apps/client/src/tests/pages/event-proposal/eventProposalPdf.test.ts` — mapping tests (adapt existing `eventProposalPrint.test.ts` coverage)
- Delete: `apps/client/src/pages/event-proposal/EventProposalPrintSheet.tsx`, `EventProposalPrintSheet.css`, and the old print-sheet test file
- Modify: `apps/client/src/pages/event-proposal/EventProposalDetailPage.tsx` — trigger becomes modal-open (no `usePrintSheet`, no portaled sheet)

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
  - `apps/client/src/components/pdf/PdfDocumentModal.tsx`: `PdfDocumentModalProps { open; onOpenChange; title; buildKey: string ("") = not ready; buildSpec: (identity: PdfCompanyIdentity | null) => DocumentPdfSpec; fileName; identity?; labels? }`
  - Shared formatters stay: `apps/client/src/lib/print/print-format.ts` — EP keeps its UTC `formatDocumentDate`/`formatEventDateRange` (`@db.Date` columns — do NOT unify to local)
- Consumes (content contract — preserved 1:1 from the existing print sheet):
  Title "Event Proposal" · docNumber fallback `EP #<id8>` · status via `documentStatusTone(approvalStatus)` · meta grid (Event, Event type, Venue, Event date range, Area, Organizer, Currency, Observation days) · description section (when present) · three tables with subtotals (SKUs: code/product+notes/qty/price/total Σ; Miscellaneous: item+notes/category/qty/price/total Σ; Vendors: vendor+notes/scope/amount Σ; each with `emptyMessage`) · grandTotal = stored `plannedCost` with computed-sum fallback · signatures Proposed by / Area Manager (meta = approval date) / Director (meta = approval date) · footer `printedOn`
- Produces (for J-T5 i18n): any NEW keys (expect none — reuse `event_proposal.print.*`; report if the modal needs more)

**Reads (in your own context):** `AGENTS.md`, `docs/plans/jspdf-documents/PLAN.md`, current `EventProposalPrintSheet.tsx` (content source — delete after porting), `EventProposalDetailPage.tsx`, `PdfDocumentModal.tsx` + `documentPdf.ts` + `usePdfDocument.ts`, `print-format.ts`

**Frozen contract:**
- Trigger: the existing toolbar "Print" button now opens `PdfDocumentModal`. NO direct `window.print`, no `usePrintSheet`
- `buildKey`: stable per record state (`<id>:<updatedAt>` or equivalent; "" while loading)
- `buildSpec`: pure mapping module, `identity` from the modal, ALL labels via captured `intl`
- `fileName`: `sanitizePdfFileName(<documentNumber>)`
- Document CONTENT identical to the current sheet; renderer owns layout/pagination
- No `@/` alias in the new module; no edits to shared `lib/pdf/*` or `lib/print/print-format.ts` (report gaps); no locale edits; no server changes
- Scope guard: only the files listed above

**Steps:** [1] Port mapping → pure module + tests · [2] Rewire page (modal open/close, delete sheet files) · [3] Self-review content parity · do NOT run tests · do NOT git-write

**Report back (mandatory):** End with `## Produces`: files created/deleted/modified, spec-mapping summary, buildKey choice, and any NEW i18n keys (expect none).

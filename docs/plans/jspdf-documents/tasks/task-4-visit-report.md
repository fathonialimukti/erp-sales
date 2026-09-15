### Task J-T4: Migrate Visit Report document to jsPDF modal

**Files:**
- Create: `apps/client/src/pages/visit-log/visitReportPdf.ts` — pure spec-mapping module (`buildVisitReportPdfSpec(record, identity, labels)`, testable in node env)
- Create: `apps/client/src/tests/pages/visit-log/visitReportPdf.test.ts` — mapping tests (adapt existing `visitReportPrint.test.ts` date-helper coverage: `@db.Date` → UTC, check-in/out instants → local)
- Delete: `apps/client/src/pages/visit-log/VisitReportPrintSheet.tsx`, `VisitReportPrintSheet.css`, and the old print-sheet test file
- Modify: `apps/client/src/pages/visit-log/VisitLogDetailPage.tsx` — trigger becomes modal-open (no `usePrintSheet`, no portaled sheet)

**Interfaces:**
- Consumes (from J-T1 `## Produces`, verbatim — the frozen foundation contract):
  - `apps/client/src/lib/pdf/pdfTheme.ts`: `documentStatusTone(status): "neutral" | "primary" | "success" | "destructive"` (DRAFT→neutral · VALIDATING/AI_VALIDATED/PROPOSED→primary · APPROVED→success · REJECTED→destructive)
  - `apps/client/src/lib/pdf/documentPdf.ts`:
    - `DocumentPdfLetterhead { identity: PdfCompanyIdentity | null; fallbackInitial; fallbackName; fallbackTagline; phoneLabel; taxIdLabel; title; documentNumber; status: { label: string; tone: DocumentPdfStatusTone } | null }`
    - `DocumentPdfMetaItem { label; value }` (4-col grid) · `DocumentPdfBlock = { kind: "section"; title; body } | { kind: "table"; table } | { kind: "grandTotal"; label; value }` (visit report: sections only — no tables, no money)
    - `DocumentPdfSignature { label; name?; meta? }`
    - `DocumentPdfSpec { letterhead; meta; blocks; signatures; footer: { printedOn; pageIndicator? } }` — labels pre-resolved
  - `apps/client/src/lib/pdf/usePdfDocument.ts`: `sanitizePdfFileName(raw): string`
  - `apps/client/src/components/pdf/PdfDocumentModal.tsx`: `PdfDocumentModalProps { open; onOpenChange; title; buildKey: string ("") = not ready; buildSpec: (identity: PdfCompanyIdentity | null) => DocumentPdfSpec; fileName; identity?; labels? }`
  - Shared formatters stay: `apps/client/src/lib/print/print-format.ts` (`formatDateTime` for the printed-on footer); VR keeps its own split: `formatVisitDate` (UTC, `date` is `@db.Date`) + `formatVisitTimestamp` (local, check-in/out instants)
- Consumes (content contract — preserved 1:1 from the existing print sheet):
  Title "Visit Report" · docNumber fallback `VR #<id8>` (domain has no documentNumber) · status via `documentStatusTone(approvalStatus)` · meta 8 cells (Date, Salesman, Outlet, Customer, Area, Check-in, Check-out, Linked sales order by documentNumber ?? id) · purpose section (OMITTED when null — deliberate) · notes section (always; explicit empty state "No notes recorded.") · feedback section (always; explicit empty state) · NO tables/grand total (domain has none) · single signature "Visited by" (salesman) · footer `printedOn` · photos omitted (`VisitLog.photos` opaque Json, no URL serving — documented gap, do not hack)
- Produces (for J-T5 i18n): any NEW keys (expect none — reuse `visit_log.print.*`; report if the modal needs more)

**Reads (in your own context):** `AGENTS.md`, `docs/plans/jspdf-documents/PLAN.md`, current `VisitReportPrintSheet.tsx` (content source — delete after porting), `VisitLogDetailPage.tsx`, `PdfDocumentModal.tsx` + `documentPdf.ts` + `usePdfDocument.ts`, `print-format.ts`

**Frozen contract:**
- Trigger: the existing toolbar "Print / PDF" button now opens `PdfDocumentModal`. NO direct `window.print`, no `usePrintSheet`
- `buildKey`: stable per record state (`<id>:<updatedAt>` or equivalent; "" while loading)
- `buildSpec`: pure mapping module, `identity` from the modal, ALL labels via captured `intl`
- `fileName`: `sanitizePdfFileName("VR <id8>" or document number)`
- Document CONTENT identical to the current sheet
- No `@/` alias in the new module; no edits to shared `lib/pdf/*` or `lib/print/print-format.ts` (report gaps); no locale edits; no server changes
- Scope guard: only the files listed above

**Steps:** [1] Port mapping → pure module + tests · [2] Rewire page (modal open/close, delete sheet files) · [3] Self-review content parity · do NOT run tests · do NOT git-write

**Report back (mandatory):** End with `## Produces`: files created/deleted/modified, spec-mapping summary, buildKey choice, and any NEW i18n keys (expect none).

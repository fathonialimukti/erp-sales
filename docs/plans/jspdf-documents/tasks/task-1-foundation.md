### Task J-T1: jsPDF foundation (theme, renderer, hook, modal, deps)

**Files:**
- Modify: `apps/client/package.json` — add `jspdf` + `jspdf-autotable` (latest stable), sync lockfile via the workspace install command
- Create: `apps/client/src/lib/pdf/pdfTheme.ts` — frozen palette as RGB tuples + document geometry constants
- Create: `apps/client/src/lib/pdf/documentPdf.ts` — spec-driven document renderer (the single place where document craft lives)
- Create: `apps/client/src/lib/pdf/usePdfDocument.ts` — build/preview/print/download lifecycle hook
- Create: `apps/client/src/components/pdf/PdfDocumentModal.tsx` — preview modal (screen UI, semantic tokens)
- Test (write only — never run): renderer smoke (blob starts with `%PDF-`, expected page count for a sample spec), hook lifecycle (build once per buildKey, revoke on cleanup) via a testable seam, filename sanitizer

**Interfaces:**
- Consumes (frozen facts):
  - **Palette (mirror to RGB; KEEP IN SYNC with `apps/server/src/lib/print-palette.ts`):** INK #080D16 · MUTED #003B67 · BORDER #D6DFE7 · PAPER #FFFFFF · PRIMARY #0069A6 · SUCCESS #00A859 · WARNING #EF9900 · DESTRUCTIVE #E7000B · WASH_NEUTRAL #EAEFF3 · WASH_SOFT #F4F7F9 · WASH_PRIMARY #E6F0F6 · WASH_SUCCESS #D9F2E6 · WASH_DESTRUCTIVE #FDE6E7 · status map DRAFT(neutral)/VALIDATING(primary)/AI_VALIDATED(primary)/PROPOSED(primary)/APPROVED(success)/REJECTED(destructive)
  - **Geometry:** A4 portrait, margins 14mm top/bottom · 12mm left/right (mirrors `print-document.css @page`)
  - **Company identity:** `settings.companyIdentity` — tRPC `protectedProcedure.query`, no input → `{ name: string; addressLines: string[]; phone: string; taxId: string }` (the modal/sheets query it; the renderer receives it as data)
  - **Formatters:** reuse `apps/client/src/lib/print/print-format.ts` (`toNum`, `currencyDigits`, `formatDocumentMoney`, `titleCase`, `formatDateTime`) — do NOT duplicate
  - **Pipeline mechanics (preserve exactly):** build gated on open + stable `buildKey`; builder identity via ref (effect must not depend on it); `URL.revokeObjectURL` on cleanup AND before rebuild; print = `iframe.contentWindow.focus() + print()` with catch → `window.open(blobUrl, '_blank')` (Firefox PDF.js fallback); download = anchor with `download` attr; NO build delay (no offscreen canvases in this app — the reference app's 50 ms timer exists only for QR canvas paint; note this in a comment for future QR work)
- Produces (frozen contract for J-T2/J-T3/J-T4 — report exactly):
  - `usePdfDocument` hook signature + return type (`{ pdfUrl, isBuilding, error, print, download }` or better)
  - `DocumentPdfSpec` type — the full spec shape the renderer consumes
  - `buildDocumentPdf(spec): jsPDF` + `pdfBlobUrl(spec): { url, revoke }` (or your split — report it)
  - `PdfDocumentModal` props contract (what the sheets pass: title, buildFn/buildKey, fileName, identity?, labels)
  - `sanitizePdfFileName(raw: string): string`
  - Any NEW i18n keys for modal chrome (reuse existing `common.action.*` / `common.action.close` where they exist — verify first)

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`, `docs/plans/jspdf-documents/PLAN.md` (pipeline contract section)
- `apps/client/src/lib/print/print-format.ts`, `apps/server/src/lib/print-palette.ts` (values only), one existing sheet (`ActionProgramPrintSheet.tsx`) as the layout grammar reference
- Context7 for `jspdf` + `jspdf-autotable` current API (text, `roundedRect`, `addImage`, autoTable themes/headStyles/bodyStyles/didDrawPage for repeated headers + page numbers) — verify API details, do not trust memory

**Frozen contract:**
- Renderer implements the `print-document` layout grammar ONCE, spec-driven: letterhead (brand plate + company name/address/contact + doc title/number/status pill on the right, ink rule below) → 4-col meta grid → titled sections (wrapping paragraphs) → tables via autoTable (zebra WASH_SOFT, repeated header row per page, right-aligned tabular numeric columns, subtotal rows) → grand-total ink band (INK fill, PAPER text) → signature blocks (rule + name + label, optional meta) → footer rule + printed-on stamp + "Page X of Y" on every page
- Labels arrive in the spec pre-resolved (callers resolve via `intl.formatMessage` at build time — renderer does zero i18n)
- Status pill = rounded rect in status color + label (label from spec)
- `PdfDocumentModal`: shadcn Dialog, semantic tokens only (no raw hex on screen), iframe `title` attr, loading spinner while building, error state with retry, footer = Print + Download + Close; modal stays open while printing; Firefox fallback per pipeline contract
- All exports via relative imports inside `lib/pdf/*` (no `@/` alias in lib modules — root-vitest runnability)
- Lean: no QR support, no server calls, no document migrations in this task, nothing speculative beyond the spec fields listed
- Screen chrome follows design law; PDF bytes follow the palette

**Steps:**
- [ ] Step 1: Verify current jsPDF/autoTable APIs via Context7; add deps + lockfile
- [ ] Step 2: Theme + renderer primitives (with smoke test)
- [ ] Step 3: Hook lifecycle + modal
- [ ] Step 4: Self-review against the pipeline contract; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact export names + full signatures + module paths, `DocumentPdfSpec` field list, modal props contract, i18n keys needed (name + en/id), and the jsPDF/autoTable versions installed.

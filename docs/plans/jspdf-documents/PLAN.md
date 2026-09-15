# jsPDF Client-Side Documents — Pipeline Adoption

> **STATUS: ACTIVE** (re-confirmed by user: "modal preview before download or print, preview using browser pdf view" — the requirement IS this pipeline). The three document sheets (Action Program, Event Proposal, Visit Report) migrate from direct browser-print to the modal flow: button → `PdfDocumentModal` → iframe blob preview in the browser's native PDF viewer → Print (scoped to the PDF) or Download.

**Scope:** adopt the jsPDF → Blob → object-URL → iframe preview → iframe print → download pipeline (proven in the user's other app) for this ERP's client-side PDF documents. Migrates the three print-CSS document sheets (Action Program, Event Proposal, Visit Report) onto it; establishes one spec-driven client renderer so future documents are data-mapping exercises.

**Why:** the PDF bytes ARE the document — preview is WYSIWYG in the browser's own viewer, print is scoped to the PDF (no `@media print` CSS tricks, no cross-page contamination class of bugs), download is a real `.pdf` file, and the Tauri/WebView2 story improves (PDFium built in).

## Pipeline contract (from the reference app — preserve its mechanics)

1. **Build:** `buildBlob()` assembles PDF bytes in RAM via jsPDF (+ jspdf-autotable for tables). No server. No canvases in this app → **no 50 ms paint delay needed** (that exists only for offscreen `QRCodeCanvas` sources; documented for future QR-label support, not built now — YAGNI).
2. **Preview:** `URL.createObjectURL(blob)` → `<iframe src={blobUrl}>` renders in the browser's native PDF viewer. Same blob serves all three actions.
3. **Print:** `iframe.contentWindow.focus(); iframe.contentWindow.print();` — scoped to the PDF. Firefox PDF.js may reject parent-frame `print()` → catch opens the blob URL in a full tab.
4. **Download:** `<a href={blobUrl} download={sanitizedFileName}>` — one blob, three actions.
5. **Lifecycle:** build gated on open + data-ready via a stable `buildKey`; builder in a ref; `URL.revokeObjectURL` on cleanup/rebuild (no leaks); loading/error states instead of a blank iframe.
6. **Platform matrix:** WebView2/Windows full support; Firefox print → tab fallback; WebKitGTK (Linux) has no PDF viewer → iframe blank, **Download button always present** as escape hatch. macOS WKWebView: preview ok, iframe print unreliable → same download escape hatch.

**Platform caveats accepted:** standard PDF fonts (Helvetica) cover en + id (Latin script — no font embedding needed). PDF text is drawn, not CSS-crafted; the frozen print palette transfers as RGB.

## Task DAG

| # | Task | Layer | Owner | Files (ownership) |
|---|------|-------|-------|-------------------|
| J-T1 | jsPDF foundation: theme, spec-driven document renderer, `usePdfDocument` hook, `PdfDocumentModal`, deps | L1 (seq) | frontend-engineer | new `lib/pdf/*`, `components/pdf/PdfDocumentModal.tsx`, `apps/client/package.json` |
| J-T2 | Migrate Action Program document to jsPDF | L2 (par) | frontend-engineer | `pages/action-program/*` only |
| J-T3 | Migrate Event Proposal document to jsPDF | L2 (par) | frontend-engineer | `pages/event-proposal/*` only |
| J-T4 | Migrate Visit Report document to jsPDF | L2 (par) | frontend-engineer | `pages/visit-log/*` only |
| J-T5 | i18n keys for modal chrome (union) | L3 (par) | frontend-engineer | `locales/en.json`, `locales/id.json` only |
| J-T6 | Delete dead print-CSS foundation (keep `print-format.ts`) | L3 (par) | frontend-engineer | `lib/print/usePrintSheet.ts`, `PrintDocumentParts.tsx`, `styles/print-document.css`, their tests |
| J-T7 | Final whole-branch review + tests | final | quality-engineer | none (review only) |

**Explicitly out of scope:** Sales Order (server PDFKit is canonical; its preview modal already uses the blob-URL pattern), Reports screen-print (different use case), QR labels (pattern documented above; no current requirement), migrating `SalesOrderPrint.tsx` HTML sheet (would create a third SO renderer).

**Survives the migration:** `lib/print/print-format.ts` (pure formatters — renderer-agnostic, consumed by the jsPDF builders). Dies after J-T6: `usePrintSheet.ts`, `PrintDocumentParts.tsx`, `print-document.css` (+ their tests).

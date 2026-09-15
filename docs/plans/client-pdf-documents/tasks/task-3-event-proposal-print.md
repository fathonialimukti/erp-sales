### Task P-T3: Event Proposal print sheet (client-side PDF)

**Files:**
- Create: `apps/client/src/pages/event-proposal/EventProposalPrintSheet.tsx` (portaled print-only sheet; own any domain-specific CSS in `EventProposalPrintSheet.css` imported by this component — you exclusively own both)
- Modify: `apps/client/src/pages/event-proposal/EventProposalDetailPage.tsx` (find exact name via glob `apps/client/src/pages/event-proposal/*.tsx`) — add "Print" button to the detail toolbar following the existing toolbar conventions
- Test (write only — never run): only if data-mapping logic is extractable and testable; otherwise state why not

**Interfaces:**
- Consumes (from P-T1 `## Produces`, verbatim):
  - **Hook:** `import { usePrintSheet } from "@/lib/print/usePrintSheet";` → `usePrintSheet(): { isPrinting: boolean; print: () => void }`. Mount the portaled sheet alongside; `<Button onClick={print} disabled={isPrinting}>`. Do NOT import `print-document.css` — it is side-effect-loaded by the hook. Body class `printing-document`, double-rAF timing, afterprint cleanup, re-entrancy guard are all handled by the hook.
  - **CSS base classes:** `print-document` root (screen `display:none`, print block) plus `__header`, `__brand*`, `__title-block`/`__title`/`__doc`, `__status` (+ `__status--draft|--ai_validated|--proposed|--approved|--rejected` via `print-document__status--${status.toLowerCase()}`), `__meta-grid`/`__meta`/`__meta-label`/`__meta-value`, `__table`/`__th`/`__td` (+ `--num`, `--strong`), zebra + `thead` repeat + `__empty-row`, `__total-label`/`__total-value`, `__grand-band`*, `__signatures`*, `__footer`/`__footer-printed`. Use ONLY these where possible; domain extras go in your own CSS file.
  - **Palette + conventions:** frozen palette hexes only (KEEP IN SYNC with `apps/server/src/lib/print-palette.ts`); currency digits IDR → 0, others → 2; status labels reused from the page's existing label map (no raw enums).
  - **Company identity:** `settings.companyIdentity` — tRPC `protectedProcedure.query`, no input → `{ name: string; addressLines: string[]; phone: string; taxId: string }` (letterhead pattern: read it from `SalesOrderPrint.tsx`).
- Consumes (data): read the event-proposal router + existing pages yourself for the exact fields; do NOT invent fields — map what exists (expect: proposal identity/number, event name/venue/date, outlet/customer, status, PIC, items/activities with quantities and costs, budget/estimated totals).
- Produces (for P-T4 i18n): exact NEW keys under the page's existing prefix

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- Event-proposal pages + router; `apps/client/src/lib/print/usePrintSheet.ts`; `SalesOrderPrint.tsx` (letterhead + document-sheet recipe); one reworked report section (button recipe)

**Frozen contract:**
- Formal document layout: letterhead → title block ("Event Proposal" + document number + status pill) → meta grid (event, venue, date, outlet/customer) → items/activities table (right-aligned `tabular-nums` money) → totals rows + grand-total band (outside the table) → signature trio (the domain's real roles — proposed/approved-by etc.) → printed-on footer
- Empty-data guard row via `__empty-row`; long text wraps (no fixed heights — the PDFKit overlap bug must not recur)
- Print button: toolbar placement per the page's conventions, Lucide icon, disabled while `isPrinting`, label via intl
- NO raw hex outside the palette; no locale edits (reference keys with `defaultMessage` fallbacks); no server changes; no changes to `usePrintSheet.ts` or `print-document.css` (report gaps instead of patching shared files)
- Scope guard: only the files listed above

**Steps:**
- [ ] Step 1: Map domain data → document sections (read router + pages)
- [ ] Step 2: Build sheet + toolbar button
- [ ] Step 3: Scoped test if feasible; self-review; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: files changed/created, document section list with mapped fields, and exact NEW i18n keys (name + en/id meaning) for P-T4.

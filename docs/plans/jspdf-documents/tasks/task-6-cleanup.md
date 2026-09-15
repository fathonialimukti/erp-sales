### Task J-T6: Delete the dead print-CSS foundation

**Files:**
- Delete: `apps/client/src/lib/print/usePrintSheet.ts`
- Delete: `apps/client/src/lib/print/PrintDocumentParts.tsx`
- Delete: `apps/client/src/styles/print-document.css`
- Delete: `apps/client/src/tests/lib/usePrintSheet.test.ts`
- KEEP (do NOT touch): `apps/client/src/lib/print/print-format.ts` (consumed by all three jsPDF mapping modules) and its test `apps/client/src/tests/lib/print-format.test.ts`
- KEEP (do NOT touch): `apps/client/src/components/reports/ReportPrintSheet.tsx`, `apps/client/src/styles/report-print.css` (reports screen-print is a separate, still-live mechanism), `SalesOrderPrint.tsx` / `SalesOrder.css` (sales-order HTML sheet, separate decision)

**Interfaces:**
- Consumes: the fact that all three consumers (Action Program, Event Proposal, Visit Report) migrated to the jsPDF pipeline and deleted their print sheets (J-T2/T3/T4 `## Produces`)
- Produces: confirmation of zero dangling references; exact list of deleted files

**Reads (in your own context):**
- `AGENTS.md`
- Grep sweep `apps/client/src` for: `usePrintSheet`, `PrintDocumentParts`, `print-document.css`, `print-document__`, `printing-document`, `createPrintFlow`, `PRINT_DOCUMENT_BODY_CLASS` — every hit must be either one of the four files being deleted or a comment in plan docs; if ANY live code reference remains, STOP and report it instead of deleting

**Frozen contract:**
- Pure deletion: no new code, no reference updates (there must be none), no locale changes, no server changes
- If the grep sweep finds a live reference outside the deletion set, abort and report — do not "fix" another task's files
- Scope guard: only the four files listed above

**Steps:** [1] Grep sweep (abort-on-reference rule) · [2] Delete the four files · [3] Re-sweep to confirm zero references; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: files deleted, sweep evidence (pre/post reference counts), any aborts.

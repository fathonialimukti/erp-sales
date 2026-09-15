### Task V-T1: Foundation consolidation + QE finding fixes

**Context:** the document-print foundation now has 2 consumers (Action Program, Event Proposal) and gains a 3rd (Visit Report, next task). The QE review of `docs/plans/client-pdf-documents/` found ~90 lines duplicated across the two sheets (Finding 3) plus two one-line polish items (Findings 1–2) and gratuitous exports (Finding 4). This task resolves all four BEFORE the 3rd consumer lands, so it consumes the clean foundation.

**Files:**
- Create: `apps/client/src/lib/print/print-format.ts` — pure shared formatters (place the genuinely duplicated ones; name per conventions)
- Create: `apps/client/src/lib/print/PrintDocumentParts.tsx` — shared print-JSX parts: letterhead block (incl. `settings.companyIdentity` consumption + loading fallback), meta cell, signature block (only what BOTH sheets genuinely share)
- Modify: `apps/client/src/styles/print-document.css` — status map: ADD `--validating` (primary wash treatment, mirroring the sales-order CSS pattern); KEEP `--ai_validated` (matches the server palette's status map; harmless); document both in the KEEP-IN-SYNC comment block
- Modify: `apps/client/src/pages/action-program/ActionProgramPrintSheet.tsx` — consume the shared modules; FIX the `@/lib/trpc` alias import to a relative import (QE Finding 2 — enables config-less root vitest); remove exports that exist only for in-file use (QE Finding 4), keeping whatever its test genuinely imports
- Modify: `apps/client/src/pages/action-program/ActionProgramPrintSheet.css` — only if class usage changes
- Modify: `apps/client/src/tests/pages/action-program/actionProgramPrintSheet.test.ts` — update imports to the moved helpers
- Modify: `apps/client/src/pages/event-proposal/EventProposalPrintSheet.tsx` + `apps/client/src/tests/pages/event-proposal/eventProposalPrint.test.ts` — same consumption
- Modify: `apps/client/src/tests/lib/` — add/move unit tests for the extracted formatters if the existing sheet tests covered them

**Interfaces:**
- Consumes (frozen facts): print palette hexes (KEEP IN SYNC with `apps/server/src/lib/print-palette.ts`); `settings.companyIdentity` → `{ name, addressLines, phone, taxId }`; currency digits IDR → 0, others → 2; the two sheets' current helper implementations (read them — the lift must be behavior-preserving: `currencyDigits`, `toNum`/`toNumber`, `titleCase`, `formatDateTime`, `formatDocumentMoney`, `formatDocumentDate`, letterhead JSX, `MetaCell`, `SignatureBlock`)
- Produces (frozen contract for V-T2 — report exactly): every shared export name + full signature + the module paths V-T2 must import; the CSS status-class inventory after the fix
- Do NOT touch: `usePrintSheet.ts` hook logic, `print-document.css` beyond the status map, `SalesOrderPrint.tsx`, `ReportPrintSheet.tsx`, `report-print.css`, `report-print` classes, detail pages, locale files, server files

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- Both print sheets + their CSS + their tests; `print-document.css`; `SalesOrderPrint.tsx` letterhead (as behavioral reference for the shared part)
- QE review findings in `docs/plans/client-pdf-documents/` context (Findings 1–4 as described above)

**Frozen contract:**
- **Pure refactor:** both sheets render byte-identical print output after the lift (no visual change — this is consolidation, not redesign)
- Shared helpers are pure functions; shared JSX parts are presentational only and take data via props (no tRPC calls inside `PrintDocumentParts` — the letterhead part receives identity data as props; the sheets keep their own `settings.companyIdentity` queries)
- Relative imports inside `lib/print/*` and from the sheets (no `@/` alias in print modules — root-vitest runnability)
- No raw hex outside the palette; no locale changes; no behavior change to screen chrome
- Scope guard: consolidation only — no new capabilities, no speculative flexibility (ponytail)

**Steps:**
- [ ] Step 1: Extract formatters → `print-format.ts`; extract shared JSX → `PrintDocumentParts.tsx` (behavior-preserving)
- [ ] Step 2: Rewire both sheets + tests; fix `@/lib/trpc` import; apply the status-map CSS fix
- [ ] Step 3: Self-review (byte-identical output claim, findings 1/2/4 resolved); do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact shared export names + signatures + module paths, the CSS status-class inventory, and confirmation each of Findings 1, 2, 4 is resolved.

### Task V-T2: Visit Report print sheet (client-side PDF)

**Files:**
- Create: `apps/client/src/pages/visit-log/VisitReportPrintSheet.tsx` (portaled print-only sheet; own any domain-specific CSS in `VisitReportPrintSheet.css` imported by this component — you exclusively own both; adjust the directory to where the visit domain actually lives — discover via glob/grep for visit-log pages)
- Modify: the visit trigger surface — the visit detail view if one exists, otherwise the index row action — per what the domain actually renders (discover first; do not build a new page for this)
- Test (write only — never run): unit tests for extractable mapping/totals logic if present; markup itself is not headlessly assertable (node env, no jsdom)

**Interfaces:**
- Consumes (from V-T1 `## Produces`, verbatim):
  - **Shared formatters — `apps/client/src/lib/print/print-format.ts`** (import relatively, e.g. `../../lib/print/print-format` from `pages/visit-log/`):
    - `toNum: (value: unknown) => number` — Prisma Decimal wire coercion; non-finite/null/undefined → 0
    - `currencyDigits: (currency: string) => number` — IDR → 0, others → 2
    - `formatDocumentMoney: (value: unknown, currency: string) => string`
    - `titleCase: (value: string) => string`
    - `formatDateTime: (iso: string) => string` — printed-on footers, not date-only columns
    - Deliberately NOT shared: `formatDocumentDate`/`formatEventDateRange` (EP, UTC) and AP's local-time `formatDate`/`formatQty` — write visit-domain date handling per the domain's actual column types (`@db.Date` → UTC-style, timestamp → local-style; match how the visit pages format dates on screen)
  - **Shared JSX parts — `apps/client/src/lib/print/PrintDocumentParts.tsx`** (import relatively):
    - `Letterhead` — props `{ identity: PrintCompanyIdentity | undefined; fallbackInitial: string; fallbackName: string; fallbackTagline: string; phoneLabel: string; taxIdLabel: string }`; sheet keeps its own `settings.companyIdentity` query (tRPC `protectedProcedure.query`, no input → `{ name, addressLines, phone, taxId }`) and its own intl'd labels
    - `MetaCell: ({ label, value })`
    - `SignatureBlock: ({ label, name?, meta? })`
  - **Print hook:** `import { usePrintSheet } from "../../lib/print/usePrintSheet";` → `{ isPrinting: boolean; print: () => void }`; mount the portaled sheet alongside; do NOT import `print-document.css` (side-effect-loaded by the hook)
  - **CSS base classes:** `print-document` root + `__header`, `__brand*`, `__title-block`/`__title`/`__doc`, `__status` (+ `--draft|--validating|--ai_validated|--proposed|--approved|--rejected` via `print-document__status--${status.toLowerCase()}`; visits may have no approval status — omit the pill if the domain has none), `__meta-grid`/`__meta`/`__meta-label`/`__meta-value`, `__table`/`__th`/`__td` (+ `--num`, `--strong`), zebra + `__empty-row`, `__signatures`*, `__footer`/`__footer-printed`. Domain extras go in your own CSS file (palette hexes only).
- Consumes (data): read the visit-log router + pages yourself for the exact fields; do NOT invent fields — map what exists (expect: outlet/customer, salesman/user, visit date, check-in/check-out times, notes/outcome/result, possibly photos with accessible URLs). If photos exist but lack printable URLs, report the gap instead of hacking around it.
- Produces (for V-T3 i18n): exact NEW keys under the page's existing prefix

**Reads (in your own context):**
- `AGENTS.md`, `docs/design-system/DESIGN.md`
- Visit-log router + pages (including how the e2e's "visit log page loads" table renders rows); `apps/client/src/lib/print/print-format.ts`, `PrintDocumentParts.tsx`, `usePrintSheet.ts`; `ActionProgramPrintSheet.tsx` (as the canonical consumer recipe, post-lift)

**Frozen contract:**
- Formal document layout: letterhead → title block ("Visit Report" + visit identifier + status pill only if the domain has a status) → meta grid → notes/outcome sections (wrapping text, no fixed heights) → any tabular visit data via `__table` → signature (salesman/visited-by; add outlet-acknowledgement line only if the domain carries it) → printed-on footer
- Trigger: "Print / PDF" button using `usePrintSheet`, disabled while `isPrinting`, Lucide `Printer` icon (`aria-hidden`), label via intl — placed per the surface's existing conventions
- NO raw hex outside the palette; no locale edits (reference keys with `defaultMessage` fallbacks); no server changes; relative imports only (no `@/` alias) in the sheet and its CSS imports; no changes to shared print modules (report gaps instead)
- Scope guard: only the visit-domain files listed above

**Steps:**
- [ ] Step 1: Discover the visit domain surface + map fields → document sections
- [ ] Step 2: Build sheet + trigger
- [ ] Step 3: Scoped test if feasible; self-review; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: files changed/created, document section list with mapped fields, trigger placement decision + rationale, and exact NEW i18n keys (name + en/id meaning) for V-T3.

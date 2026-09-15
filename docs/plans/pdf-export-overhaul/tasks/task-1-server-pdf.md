### Task 1: Server PDF rework + print palette + company identity

**Files:**
- Create: `apps/server/src/lib/print-palette.ts`
- Create: `apps/server/src/lib/company-identity.ts`
- Modify: `apps/server/src/lib/sales-order-pdf.ts`
- Modify: `apps/server/src/routes/sales-order-pdf.ts`
- Modify: the server router that will expose company identity to the client (pick the leanest existing pattern — check for an existing app-settings/meta/about router first; only add a minimal read procedure if none exists)
- Test (write only — never run): `apps/server/src/tests/sales-order-pdf.test.ts` (and/or a route test under `apps/server/src/tests/routes/` following existing placement)

**Interfaces:**
- Consumes (facts from 2026-09-08 audit, verbatim): `GET /api/sales-order/:id/pdf` served by `apps/server/src/routes/sales-order-pdf.ts`, generator `apps/server/src/lib/sales-order-pdf.ts` (pdfkit@0.19.1, A4), auth via shared `withAuth` middleware requiring `sales-order@read`, mounted at `apps/server/src/index.ts:178`, previewed by a client iframe modal. Known defects to fix: `drawItemsTable` (lines 284–289) early-`return`s after `addPage()` and drops that row entirely; header row not repeated after page break; fixed 28pt meta rows / 22pt item cells overlap on wrapped text; LINE TOTAL column ~10% of content width wraps IDR amounts; ~200pt bottom reserve applied per page (dead whitespace mid-document); footer only on last page; all labels hardcoded English; `maximumFractionDigits: 0` hardcoded for all currencies; `Content-Disposition` filename embeds `#` and space unsanitized; post-`pipe()` throw yields a truncated HTTP 200.
- Produces (frozen contract for Tasks 2 & 3 — report exactly):
  - `GET /api/sales-order/:id/pdf?locale=en|id` — missing or invalid `locale` defaults to `en`
  - `apps/server/src/lib/print-palette.ts` — named constants for print ink (text/muted/border), brand primary, status colors; canonical hex values derived from `docs/design-system/DESIGN.md` (Aurora Azure primary; hardcoded hex is correct for print ink — CSS vars would leak dark-mode)
  - `apps/server/src/lib/company-identity.ts` — `getCompanyIdentity(): { name: string; addressLines: string[]; phone: string; taxId: string }`, env-sourced with sane defaults (text-based; logo asset upload is deferred)
  - Exact tRPC path the client uses to read company identity
  - Sanitized ASCII `Content-Disposition` filename; failures after `pipe()` must not leave a truncated 200 (destroy/close the response on error)

**Reads (in your own context):**
- `AGENTS.md`
- `docs/design-system/DESIGN.md` (palette derivation)
- `apps/server/src/lib/sales-order-pdf.ts`, `apps/server/src/routes/sales-order-pdf.ts`, `apps/server/src/lib/express-auth.ts`
- Reference router + conventions: `apps/server/src/routers/region.ts`
- Env/config pattern reference: `apps/server/src/routers/backup.ts`
- Reference test style: `apps/server/src/tests/backup.test.ts`

**Frozen contract:**
- Resource: sales-order (existing). Permission stays `sales-order@read` on the PDF route.
- Fixes required: no line item dropped at page break (draw the pending row after the break); table header row re-emitted after every `addPage()`; row heights measured via `doc.heightOfString()`; wider LINE TOTAL column sized for IDR magnitudes; bottom reserve applied only on the final page; footer with "Page X of Y" on all pages; per-currency `maximumFractionDigits` (0 for IDR, 2 otherwise — follow the existing `localeForCurrency()` switch pattern); localized label dictionary en + id (raw enum statuses mapped to translated labels); empty line-items guard row.
- Scope guard: do NOT touch client files; do NOT consolidate print mechanisms; do NOT add logo upload.

**Steps:**
- [ ] Step 1: Write failing tests (label dictionary per locale, currency digits, filename sanitization, route locale param + auth)
- [ ] Step 2: Implement minimal changes (palette + identity + generator + route + exposure)
- [ ] Step 3: Self-review against every defect in Consumes
- [ ] Step 4: Do NOT run tests (QE owns test execution). Do NOT git-write.

**Report back (mandatory):** End with `## Produces` listing: exact exports from `print-palette.ts` (with hex values), `company-identity.ts` shape, the exact company-identity tRPC path + response shape, the locale query-param contract, and test files created.

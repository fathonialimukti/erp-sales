### Task 4: Prose / Docs + Project DNA (tiny, additive)

**Files:**
- Create: `CONTEXT.md` (project DNA: stack, naming, errors, NEVER/ALWAYS, domain) if missing; else patch
- Create: `.github/copilot-instructions.md` (same DNA, Copilot path) if missing; else patch
- Modify: `README.md` (de-cookie-cutter: real description, no emoji headers, no checkmark lists, 7 required items: what/why, stack, quickstart, scripts, architecture link, i18n, license)
- Modify: `.github/pull_request_template.md` (require intent, scope, verification, screenshots for UI) if missing; create
- Modify: docs/prose hits (em-dash density, `delve`, `robust`/`comprehensive`/`utilize`/`leverage` clusters, narrating comments) — report only, fix in owning layer if trivial
- Test: none (docs only)

**Interfaces:**
- Consumes: T1R ## Produces (prose/visual section) + T1 audit debt ledger note (40 ponytail markers). Paste verbatim when dispatching.
- Produces: DNA files created/patched, README sections, PR template path, prose fixes list

**Reads (in your own context — no context is provided):**
- `AGENTS.md`, `PRODUCT.md`, `docs/ARCHITECTURE.md`
- `README.md`, `CONTEXT.md` (if exists), `.github/copilot-instructions.md` (if exists)
- Skill: `writing-plans` for DNA structure (concise, no fluff)

**Frozen contract:**
- DNA must contain: STACK (exact libs+versions), NAMING, ERRORS (log-then-rethrow, never silent), NEVER (raw SQL, magic strings, `any`, console.log prod), ALWAYS (i18n keys, ULID, activity log, pagination helpers), DOMAIN (invoices/agencies/sales-orders/cartons/approvals per PRODUCT.md)
- README: no emoji section headers, no `TODO: add real description`, no Getting-Started→Prerequisites→Installation→Usage→Contributing→License cookie-cutter
- Additive only — do not rewrite history, do not reword unrelated docs

**Steps:**
- [ ] Step 1: Check which DNA files exist, draft missing ones from AGENTS.md + PRODUCT.md
- [ ] Step 2: Patch README skeleton + PR template
- [ ] Step 3: Self-review (no tests to run)

**Preservation (mandatory):** additive only. No route/procedure/page/permission/i18n changes in this task.

**Report back (mandatory):**
End with `## Produces` listing files created/modified + DNA sections added.

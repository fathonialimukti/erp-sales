### Task 17: i18n for legacy login fallback form

**Files:**
- Modify: `apps/client/src/locales/en.json` (add-only)
- Modify: `apps/client/src/locales/id.json` (mirror, natural ID)
- Do NOT touch: pages, server, schemas

**Interfaces:**
- Consumes: T16 legacy form needs (baseline — T16 final list wins): email/password labels + placeholders, rememberMe, signIn CTA, signingIn busy, errors (invalid credentials, generic), forgotPassword (only if legacy form had it — check T16 report; do not invent new features).
- Produces: final key list EN+ID.

**Reads:** AGENTS.md, en.json, id.json (own context; check which `login.*` keys survived T4's password removal — reuse survivors, add only missing).

**Frozen contract:**
- Prefix `login.*` for form copy (keep `demo.*`/`auth.*` untouched). All via `intl.formatMessage`. Natural Indonesian.
- Add-only; do not modify existing demo keys.

**Steps:** [ ] Add missing EN [ ] Mirror ID [ ] Parity check [ ] Self-review, no tests [ ] Report.

**Report back (mandatory):** End with `## Produces`: exact key list EN+ID verbatim.

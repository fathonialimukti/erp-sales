### Task 5: i18n for Demo Login (passwordless Option A)

**Files:**
- Modify: `apps/client/src/locales/en.json` (add keys only, owned by this task)
- Modify: `apps/client/src/locales/id.json` (mirror keys, owned by this task)
- Do NOT touch: pages, routes, server, schemas

**Interfaces:**
- Consumes: T4 declares keys it needs; baseline set below (T4 may add — T6/routes uses final list from your Produces):
  - `auth.login.title`, `auth.login.subtitle`
  - `demo.title`, `demo.subtitle`, `demo.selectUser`, `demo.loginAs`, `demo.loggingIn`
  - `demo.empty`, `demo.emptyHint`
  - `demo.disabled`, `demo.disabledHint`
  - `demo.capabilities`, `demo.role`
  - `demo.errors.forbidden`, `demo.errors.notFound`, `demo.errors.generic`
- Produces: exact final key list EN+ID for T4/T6

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/client/src/locales/en.json`
- `apps/client/src/locales/id.json`

**Frozen contract:**
- Prefixes: `auth.*`, `login.*`, `demo.*`. All user-visible strings via `intl.formatMessage`. No hardcoded strings in pages (T4 enforces). Indonesian translations must be natural (not word-for-word MT).
- No password-related strings (Option A has no password field).

**Steps:**
- [ ] Step 1: Add EN keys with copy matching demo one-click UX
- [ ] Step 2: Mirror ID keys with natural translations
- [ ] Step 3: Self-review (no test run)
- [ ] Step 4: Report back

**Report back (mandatory):**
End with `## Produces` listing exact i18n keys added in en.json + id.json (verbatim for T4/T6 `Consumes:`).

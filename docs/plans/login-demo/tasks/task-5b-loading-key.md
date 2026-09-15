### Task 5b: Add missing `demo.loading` key (follow-up from T4)

**Files:**
- Modify: `apps/client/src/locales/en.json` (add one key)
- Modify: `apps/client/src/locales/id.json` (mirror one key)
- Do NOT touch anything else

**Interfaces:**
- Consumes (from T4 ## Produces): `LoginPage` uses `demo.loading` with `defaultMessage: "Loading demo accounts…"` fallback; T5 added 16 keys but missed this one.
- Produces: `demo.loading` EN+ID

**Reads (in your own context):**
- `AGENTS.md`
- `apps/client/src/locales/en.json`
- `apps/client/src/locales/id.json`

**Frozen contract:**
- EN: `"demo.loading": "Loading demo accounts…"`
- ID: `"demo.loading": "Memuat akun demo…"` (use natural Indonesian; adjust only if you have a better natural phrasing, report exact choice)
- Add-only, no other edits. No password strings.

**Steps:**
- [ ] Add key in both files
- [ ] Validate JSON parity
- [ ] Self-review, no test run
- [ ] Report back with `## Produces` (exact two lines added)

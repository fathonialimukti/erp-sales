### Task 22: i18n fix — showMore without {count}, prune dead keys

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`
- Do NOT touch: pages, components, server, schemas

**Interfaces:**
- Consumes (from T21 ## Produces):
  - Runtime hazard: `demo.showMore` value in BOTH locales is still `"Show details · {count} access areas"` — react-intl throws on missing `{count}` now that the trigger no longer passes it. Must purge.
  - `demo.capabilities` + `demo.action.*` (read/create/update/delete/validate/propose/approve) now unused → prune ONLY if zero refs in codebase (verify via grep in your own context).
  - Keep: `demo.about.title`, `demo.about.generic`, `demo.showLess` (values fine).
- Produces: final EN+ID key state.

**Reads (own context):** AGENTS.md, en.json, id.json, grep for `demo.capabilities` / `demo.action.` / `demo.showMore` / `demo.showLess` usage in apps/client/src.

**Frozen contract:**
- `demo.showMore`: EN "Show more" / ID "Tampilkan lebih banyak" (natural, no placeholder).
- `demo.showLess`: keep EN "Show less" / ID "Sembunyikan" (verify present).
- Prune `demo.capabilities` and `demo.action.*` only if zero usages remain (T21 removed all; verify — if any usage survives, keep key and report).
- Add-only otherwise; parity check EN↔ID.

**Steps:** [ ] Fix showMore both locales [ ] Verify + prune dead keys [ ] Parity check [ ] Self-review, no tests [ ] Report.

**Report back (mandatory):** End with `## Produces`: exact key changes (updated/pruned/kept) EN+ID.
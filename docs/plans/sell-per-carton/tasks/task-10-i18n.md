### Task 10: i18n keys (en + id)

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Interfaces:**
- Consumes: the key names referenced by T6, T7, T8
- Produces: the full bilingual string inventory for the feature

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `apps/client/src/locales/en.json`, `apps/client/src/locales/id.json`

**Frozen contract:**
- Keys under `sku.*` and `salesOrder.*` only (no new top-level namespace).
- Cover: pack size field + hint (`pcs per carton`), pack-size display (`{n} pcs/carton` / `per piece`), carton qty label, pcs qty label, the non-multiple validation message naming the pack size (`must be a multiple of {packSize}`), and the PDF line rendering (`{carton} carton ({pcs} pcs)`).
- Both languages complete — EN and ID are product-grade from day one; no English-only placeholders in `id.json`.
- Parameters via react-intl ICU (`{packSize}`, `{carton}`, `{pcs}`).

**Steps:**
- [ ] Add keys to `en.json`
- [ ] Mirror to `id.json` with real translations
- [ ] Verify ICU placeholders match between languages
- [ ] Self-review: any key referenced by T6/T7/T8 missing?

**Report back (mandatory):** `## Produces` — the exact key list.

**Preservation:** additive only — do not remove or rename existing keys.

### Task J-T5: i18n keys for the PDF modal chrome (en + id)

**Files:**
- Modify: `apps/client/src/locales/en.json` ONLY
- Modify: `apps/client/src/locales/id.json` ONLY

**Interfaces:**
- Consumes (NEW keys reported verbatim by J-T1, confirmed missing by J-T2/T3/T4 — add after verifying):

| Key | en | id |
|---|---|---|
| `common.action.print` | Print | Cetak |
| `common.action.download` | Download | Unduh |
| `common.action.retry` | Retry | Coba lagi |
| `pdf.preview.aria` | Document preview | Pratinjau dokumen |
| `pdf.preview.error_hint` | Something went wrong while building the PDF. | Terjadi kesalahan saat membuat PDF. |

- Swept-up item (referenced-but-undefined, pre-existing): `nav.brand_sub` — both migrated documents relied on its `defaultMessage` ("Sales OS"). Add en `"Sales OS"` and id `"Sales OS"` (product proper noun; keep identical unless you find a clearly better established id translation in the file's context).
- Reused existing (do NOT re-add): `common.action.close`, `common.loading`, `common.modal.error`.

**Reads (in your own context):** `AGENTS.md`; both locale files; sweep-grep `apps/client/src` for `pdf.preview`, `common.action.print/download/retry`, `nav.brand_sub` to confirm the reference set matches exactly.

**Frozen contract:**
- Preserve existing JSON nesting/style; flat dotted keys per current convention
- Exact en↔id key parity; no placeholders in this batch
- Do not reorder, reformat, or touch pre-existing keys (the working tree carries uncommitted keys from earlier plans — leave them untouched)
- Locale files only — report component discrepancies instead of fixing them

**Steps:** [1] Verify + add the 5 keys to both files · [2] Sweep for extras · [3] Self-review parity; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact keys added per file, swept-up extras, discrepancies.

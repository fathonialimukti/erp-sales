### Task V-T3: i18n keys for the Visit Report sheet (en + id)

**Files:**
- Modify: `apps/client/src/locales/en.json` ONLY
- Modify: `apps/client/src/locales/id.json` ONLY

**Interfaces:**
- Consumes (NEW keys reported verbatim by V-T2; add any that are missing after verifying):

| Key | en | id |
|---|---|---|
| `visit_log.detail.print` | Print / PDF | Cetak / PDF |
| `visit_log.print.title` | Visit Report | Laporan Kunjungan |
| `visit_log.print.company_phone` | Phone | Telepon |
| `visit_log.print.company_tax_id` | Tax ID | NPWP |
| `visit_log.print.meta_customer` | Customer | Pelanggan |
| `visit_log.print.meta_area` | Area | Area |
| `visit_log.print.meta_check_in` | Check-in | Jam Masuk |
| `visit_log.print.meta_check_out` | Check-out | Jam Keluar |
| `visit_log.print.meta_linked_order` | Linked sales order | Order Penjualan Terkait |
| `visit_log.print.section_feedback` | Feedback | Umpan Balik |
| `visit_log.print.empty_notes` | No notes recorded. | Belum ada catatan. |
| `visit_log.print.empty_feedback` | No feedback recorded. | Belum ada umpan balik. |
| `visit_log.print.signature_visited_by` | Visited by | Dikunjungi oleh |
| `visit_log.print.printed_on` | Printed on {date} | Dicetak pada {date} |

**Reads (in your own context):**
- `AGENTS.md`
- `apps/client/src/locales/en.json`, `apps/client/src/locales/id.json`
- Sweep: grep `apps/client/src` for `visit_log.print` and `visit_log.detail.print` to catch referenced-but-undefined keys beyond the table; add those too and report them

**Frozen contract:**
- Preserve existing JSON nesting/style; flat dotted keys per current convention
- Exact en↔id key parity; ICU placeholders (`{date}`) preserved verbatim
- Do not reorder, reformat, or touch pre-existing keys (note: the working tree already contains uncommitted keys from prior plans — leave them untouched)
- Locale files only — report component discrepancies instead of fixing them

**Steps:**
- [ ] Step 1: Verify which keys exist; add missing ones to both files
- [ ] Step 2: Sweep for extra referenced-but-undefined keys
- [ ] Step 3: Self-review parity + placeholders; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact keys added per file, swept-up extras, discrepancies.

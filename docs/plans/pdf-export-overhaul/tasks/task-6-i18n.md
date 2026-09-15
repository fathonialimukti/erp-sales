### Task 6: i18n keys for export/print strings (en + id)

**Files:**
- Modify: `apps/client/src/locales/en.json` ONLY
- Modify: `apps/client/src/locales/id.json` ONLY

**Interfaces:**
- Consumes (union of NEW keys reported verbatim by Tasks 2–5). Add any that are missing; skip any that already exist (verify first):

| Key | en | id |
|---|---|---|
| `sales_order.print.company_phone` | Phone | Telepon |
| `sales_order.print.company_tax_id` | Tax ID | NPWP |
| `sales_order.print.empty_items` | No line items. | Belum ada item. |
| `reports.export.loading` | Preparing export… | Menyiapkan ekspor… |
| `reports.export.error` | Export failed. Please try again. | Ekspor gagal. Silakan coba lagi. |
| `reports.print.summary` | Summary | Ringkasan |
| `reports.print.period` | Period: {from} – {to} | Periode: {from} – {to} |
| `reports.print.generated_at` | Generated {datetime} | Dibuat {datetime} |
| `reports.print.phone` | Phone | Telepon |
| `reports.print.tax_id` | Tax ID | NPWP |
| `budget_line.index.export_excel` | Export Excel | Ekspor Excel |
| `budget_line.index.export_loading` | Preparing export… | Menyiapkan ekspor… |
| `budget_line.index.export_failed` | Export failed. Please try again. | Ekspor gagal. Silakan coba lagi. |
| `budget_line.index.header_currency` | Currency | Mata Uang |
| `activity_log.export.excel` | Export Excel | Ekspor Excel |
| `activity_log.export.loading` | Preparing export… | Menyiapkan ekspor… |
| `activity_log.export.sheet_name` | Activity logs | Log aktivitas |
| `activity_log.export.truncated` | Export is limited to the first {limit} logs. Narrow the filters to include older entries. | Ekspor dibatasi pada {limit} log pertama. Persempit filter untuk menyertakan entri yang lebih lama. |
| `activity_log.export.header_email` | Email | Email |
| `activity_log.export.header_resource_id` | Resource ID | ID Resource |
| `activity_log.export.header_message` | Message | Pesan |
| `activity_log.export.header_detail` | Detail | Detail |
| `activity_log.export.unknown_user` | Unknown | Tidak dikenal |

**Reads (in your own context):**
- `AGENTS.md`
- `apps/client/src/locales/en.json`, `apps/client/src/locales/id.json` (existing structure + nesting)
- Grep the client for the new key prefixes to sweep for any referenced-but-undefined keys Tasks 2–5 introduced beyond this table (e.g. keys referenced in `intl.formatMessage`/`defineMessages` without a `defaultMessage`); add those too and report them

**Frozen contract:**
- Preserve existing JSON nesting/style exactly (flat dotted keys vs nested objects — follow the file's current convention)
- Exact en↔id key parity: every key added to en.json must exist in id.json and vice versa
- ICU placeholders (`{from}`, `{to}`, `{datetime}`, `{limit}`) must be preserved verbatim in both locales
- Do not reorder, reformat, or touch pre-existing keys
- Scope guard: locale files only — no component changes even if a key looks wrong (report the discrepancy instead)

**Steps:**
- [ ] Step 1: Verify which of the table's keys already exist; add the missing ones to both files
- [ ] Step 2: Sweep for referenced-but-undefined new keys; add with sensible en/id translations
- [ ] Step 3: Self-review parity + placeholder integrity; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact keys added per file, any swept-up extras, and any discrepancies found in components.

### Task P-T4: i18n keys for the two print sheets (en + id)

**Files:**
- Modify: `apps/client/src/locales/en.json` ONLY
- Modify: `apps/client/src/locales/id.json` ONLY

**Interfaces:**
- Consumes (union of NEW keys reported verbatim by P-T2 and P-T3). Add any that are missing; skip any that already exist (verify first).

**From P-T2 — `action_program.*`:**

| Key | en | id |
|---|---|---|
| `action_program.detail.print` | Print / PDF | Cetak / PDF |
| `action_program.print.title` | Action Program | Program Aksi |
| `action_program.print.company_phone` | Phone | Telepon |
| `action_program.print.company_tax_id` | Tax ID | NPWP |
| `action_program.print.meta_program` | Program | Program |
| `action_program.print.meta_period` | Period | Periode |
| `action_program.print.meta_currency` | Currency | Mata uang |
| `action_program.print.prepared_by` | Prepared by | Disusun oleh |
| `action_program.print.approved_by` | Approved by | Disetujui oleh |
| `action_program.print.col_code` | Code | Kode |
| `action_program.print.col_outlet` | Outlet | Outlet |
| `action_program.print.col_explanation` | Explanation | Penjelasan |
| `action_program.print.col_cost` | Cost | Biaya |
| `action_program.print.col_item` | Item | Item |
| `action_program.print.col_qty` | Qty | Qty |
| `action_program.print.col_unit_price` | Unit price | Harga satuan |
| `action_program.print.col_product` | Product | Produk |
| `action_program.print.col_price` | Price | Harga |
| `action_program.print.col_disc` | Disc | Diskon |
| `action_program.print.section_outlets` | Assigned outlets | Outlet yang ditugaskan |
| `action_program.print.section_items` | Program items | Item program |
| `action_program.print.section_skus` | SKU lines | Baris SKU |
| `action_program.print.totals_outlets` | Outlets subtotal | Subtotal outlet |
| `action_program.print.totals_items` | Items subtotal | Subtotal item |
| `action_program.print.totals_skus` | SKUs subtotal | Subtotal SKU |
| `action_program.print.totals_grand` | Grand total | Total keseluruhan |
| `action_program.print.empty_items` | No program items. | Tidak ada item program. |
| `action_program.print.empty_skus` | No SKU lines. | Tidak ada baris SKU. |
| `action_program.print.printed_on` | Printed on {date} | Dicetak pada {date} |
| `action_program.print.status.draft` | Draft | Draf |
| `action_program.print.status.validating` | AI Processing | Proses AI |
| `action_program.print.status.proposed` | Pending Approval | Menunggu Persetujuan |
| `action_program.print.status.approved` | Approved | Disetujui |
| `action_program.print.status.rejected` | Rejected | Ditolak |

**From P-T3 — `event_proposal.*`:**

| Key | en | id |
|---|---|---|
| `event_proposal.detail.print` | Print | Cetak |
| `event_proposal.print.title` | Event Proposal | Proposal Acara |
| `event_proposal.print.company_phone` | Phone | Telepon |
| `event_proposal.print.company_tax_id` | Tax ID | NPWP |
| `event_proposal.print.status.draft` | Draft | Draf |
| `event_proposal.print.status.validating` | Validated | Tervalidasi |
| `event_proposal.print.status.proposed` | Pending Approval | Menunggu Persetujuan |
| `event_proposal.print.status.approved` | Approved | Disetujui |
| `event_proposal.print.status.rejected` | Rejected | Ditolak |
| `event_proposal.print.meta_organizer` | Organizer | Penyelenggara |
| `event_proposal.print.meta_currency` | Currency | Mata Uang |
| `event_proposal.print.meta_observation` | Observation days | Hari Observasi |
| `event_proposal.print.section_misc` | Miscellaneous items | Item Lain-lain |
| `event_proposal.print.section_vendors` | Vendors | Vendor |
| `event_proposal.print.col_code` | Code | Kode |
| `event_proposal.print.col_product` | Product | Produk |
| `event_proposal.print.col_item` | Item | Item |
| `event_proposal.print.col_category` | Category | Kategori |
| `event_proposal.print.col_vendor` | Vendor | Vendor |
| `event_proposal.print.col_scope` | Scope | Ruang Lingkup |
| `event_proposal.print.col_qty` | Qty | Jml |
| `event_proposal.print.col_price` | Price | Harga |
| `event_proposal.print.col_total` | Total | Total |
| `event_proposal.print.empty_skus` | No SKUs. | Tidak ada SKU. |
| `event_proposal.print.empty_misc` | No miscellaneous items. | Tidak ada item lain-lain. |
| `event_proposal.print.empty_vendors` | No vendors. | Tidak ada vendor. |
| `event_proposal.print.totals_skus` | SKUs subtotal | Subtotal SKU |
| `event_proposal.print.totals_misc` | Miscellaneous subtotal | Subtotal Item Lain-lain |
| `event_proposal.print.totals_vendors` | Vendors subtotal | Subtotal Vendor |
| `event_proposal.print.totals_grand` | Planned total | Total Rencana |
| `event_proposal.print.signature_proposer` | Proposed by | Diusulkan oleh |
| `event_proposal.print.signature_area_manager` | Area Manager | Manajer Area |
| `event_proposal.print.signature_director` | Director | Direktur |
| `event_proposal.print.signature_approved_on` | Approved on {date} | Disetujui pada {date} |
| `event_proposal.print.meta_printed` | Printed on {date} | Dicetak pada {date} |

**Reads (in your own context):**
- `AGENTS.md`
- `apps/client/src/locales/en.json`, `apps/client/src/locales/id.json`
- Sweep: grep `apps/client/src` for the new prefixes (`action_program.print`, `event_proposal.print`, and the two `*.detail.print` keys) to catch referenced-but-undefined keys beyond the tables; add those too and report them

**Frozen contract:**
- Preserve existing JSON nesting/style; flat dotted keys per current convention
- Exact en↔id key parity; ICU placeholders (`{date}`) preserved verbatim in both locales
- Do not reorder, reformat, or touch pre-existing keys
- Locale files only — report component discrepancies instead of fixing them

**Steps:**
- [ ] Step 1: Verify which keys exist; add missing ones to both files
- [ ] Step 2: Sweep for extra referenced-but-undefined keys; add with en/id translations
- [ ] Step 3: Self-review parity + placeholders; do NOT run tests; do NOT git-write

**Report back (mandatory):** End with `## Produces`: exact keys added per file, swept-up extras, discrepancies.

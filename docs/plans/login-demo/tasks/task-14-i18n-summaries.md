### Task 14: i18n for expandable summaries (aetherglo roles)

**Files:**
- Modify: `apps/client/src/locales/en.json` (add-only)
- Modify: `apps/client/src/locales/id.json` (mirror, natural ID)
- Do NOT touch: pages, components, server, schemas

**Interfaces:**
- Consumes: T13 key list (baseline below; T13 final list wins on conflicts):
  - `demo.about.title`, `demo.about.generic`, `demo.about.system-admin`, `demo.about.demo-manager`, `demo.about.demo-supervisor`, `demo.about.demo-salesperson`, `demo.about.demo-inbound-staff`
  - `demo.showMore` ("Show details · {count} access areas"), `demo.showLess`
  - `demo.action.read/create/update/delete/validate/propose/approve`
- Produces: final EN+ID key list.

**Reads:** AGENTS.md, en.json, id.json (own context).

**Frozen contract:**
- EN copy:
  - title "About this user", generic "General workspace access. Expand details to see everything this account can do."
  - system-admin "Full access — manages users, roles, and every sales workflow."
  - demo-manager "Runs the sales operation — reviews, validates, and approves team orders."
  - demo-supervisor "Supervises the team — proposes and validates orders, never approves."
  - demo-salesperson "Field account — creates and manages their own sales orders and visits."
  - demo-inbound-staff "Receiving only — records incoming goods, no pricing or sales orders."
  - showMore "Show details · {count} access areas", showLess "Show less"
  - actions: View/Create/Edit/Delete/Validate/Propose/Approve
- ID (natural, not MT): title "Tentang pengguna ini", generic "Akses ruang kerja umum. Buka detail untuk melihat semua yang dapat dilakukan akun ini.", system-admin "Akses penuh — mengelola pengguna, peran, dan seluruh alur penjualan.", demo-manager "Menjalankan operasional penjualan — meninjau, memvalidasi, dan menyetujui order tim.", demo-supervisor "Menyelia tim — mengajukan dan memvalidasi order, tanpa menyetujui.", demo-salesperson "Akun lapangan — membuat dan mengelola order penjualan dan kunjungannya sendiri.", demo-inbound-staff "Khusus penerimaan — mencatat barang masuk, tanpa harga atau order penjualan.", showMore "Lihat detail · {count} area akses", showLess "Sembunyikan", actions Lihat/Buat/Ubah/Hapus/Validasi/Ajukan/Setujui.
- Retire `demo.capabilities` ONLY if zero refs remain in your context; else leave it (do not break other screens).

**Steps:** [ ] Add EN [ ] Mirror ID [ ] Parity check [ ] Self-review, no tests [ ] Report.

**Report back (mandatory):** End with `## Produces`: exact final key list EN+ID verbatim.

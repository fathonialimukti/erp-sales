### Task 7: i18n — `ai.widget.*` keys (en + id)

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Interfaces:**
- Consumes: SPEC §9 key list (frozen). Existing locale file structure (read them — flat vs nested keys; adapt key syntax to the file's existing convention while keeping the `ai.widget.*` logical names, and report the final literal keys).
- Produces: all keys below present in both files with the exact copy given. Tasks 5/6 consume these names.

**Reads (in your own context):**
- `apps/client/src/locales/en.json` + `id.json` (existing structure + where `ai.*` keys live, if any)
- `docs/plans/ai-chat-widgets/SPEC.md` §9
- `AGENTS.md`

**Frozen contract — exact copy (en → id):**

| Key | en | id |
|---|---|---|
| `ai.widget.form.submit` | Submit | Kirim |
| `ai.widget.form.submitting` | Submitting… | Mengirim… |
| `ai.widget.form.submitted` | Submitted | Terkirim |
| `ai.widget.form.cancel` | Cancel | Batal |
| `ai.widget.confirm.writeWarning` | This will run a write SQL statement against the database. | Ini akan menjalankan pernyataan SQL tulis ke database. |
| `ai.widget.confirm.backupAck` | I have verified the backup | Saya telah memverifikasi backup |
| `ai.widget.confirm.backupRunNow` | Create backup now | Buat backup sekarang |
| `ai.widget.confirm.confirm` | Confirm & run | Konfirmasi & jalankan |
| `ai.widget.confirm.reject` | Reject | Tolak |
| `ai.widget.confirm.readOnlyBadge` | Read only | Hanya baca |
| `ai.widget.confirm.writeBadge` | Write | Tulis |
| `ai.widget.status.pending` | Waiting for your input | Menunggu masukan Anda |
| `ai.widget.status.confirmed` | Confirmed | Dikonfirmasi |
| `ai.widget.status.rejected` | Rejected | Ditolak |
| `ai.widget.status.executed` | Executed | Dieksekusi |
| `ai.widget.status.failed` | Failed | Gagal |
| `ai.widget.result.rowsAffected` | {count} row(s) affected | {count} baris terpengaruh |
| `ai.widget.result.rowsReturned` | {count} row(s) returned | {count} baris dikembalikan |
| `ai.widget.result.showTable` | Show result table | Tampilkan tabel hasil |
| `ai.widget.result.truncated` | Results truncated | Hasil dipotong |
| `ai.widget.result.rolledBack` | Transaction rolled back — no changes applied. | Transaksi dibatalkan — tidak ada perubahan diterapkan. |
| `ai.widget.error.expired` | This action was already handled or expired. | Tindakan ini sudah diproses atau kedaluwarsa. |
| `ai.widget.error.unsupported` | Unsupported widget | Widget tidak didukung |

**Steps:**
- [ ] Step 1: Read both locale files; match their JSON key structure exactly.
- [ ] Step 2: Add every key above to `en.json` and `id.json` (ICU `{count}` placeholder preserved verbatim).
- [ ] Step 3: Run `bun run check-types` (scoped to client). Do NOT run tests.
- [ ] Step 4: Self-review: both files have identical key sets; no raw hex/styling issues (n/a — strings only).

**Report back (mandatory):** end with `## Produces` — final literal key paths as written (e.g. `"ai.widget.form.submit"` or nested equivalent), count of keys added per file.

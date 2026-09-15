### Task 16: Settings-driven, PROVIDER-AGNOSTIC SMTP config (DB `appSetting` authoritative)

**User directive:** "I'm using Brevo here, and I might set different later. According to settings." → The app must use the **Settings configuration** for SMTP, and it must work for **any SMTP provider** without a code change. Brevo is just today's value.

**Known state (T12/T13/T14):**
- DB `appSetting` overrides env for SMTP: `smtp.host`, `smtp.port` (= **2525**, set by T12), `smtp.user`, `smtp.from`, `smtp.domain` (default `aetherglo.com`), `smtp.pass` (present).
- **Provider lock-in risk:** `apps/server/src/lib/email-smtp.ts` derives TLS mode from a **hardcoded port set** (`IMPLICIT_TLS_PORTS = {465}` → implicit TLS; everything else → STARTTLS + `requireTLS`). Another provider may use 465-but-no-TLS, 25-with-STARTTLS, 8025, or a TLS mode that doesn't match the port heuristic → silently wrong encryption on provider switch.
- `apps/server/src/prisma/seed.ts:722` **upserts** `smtp.port` from env on EVERY seed; `db:all` = `db push --force-reset && db seed` → a reseed **reverts the Settings-configured value**, re-breaking a working config.
- Settings cache TTL ~30s (confirm).

**Files:**
- Discover + Modify: settings resolution lib (DB-first reader), `apps/server/src/lib/email-smtp.ts`, `apps/server/src/prisma/seed.ts`
- Test: `apps/server/src/tests/` (settings resolution + transport)

**Interfaces:**
- Consumes: DB keys `smtp.host|port|user|pass|from|domain`; `createSmtpTransport()`; T13 fail-fast timeouts
- Produces: new setting key for encryption mode, precedence contract, durability fix, test names

**Frozen contract:**
- **DB `appSetting` is authoritative over env** for ALL SMTP connection values. Env = bootstrap default only.
- **Provider-agnostic:** no Brevo-specific branching, no hardcoded host/domain defaults that only suit Brevo. Any provider must be configurable purely from Settings.
- **Explicit encryption mode** beats port guessing: add a settings field (e.g. `smtp.secure` / `smtp.encryption`) accepting a clear enum — `none` (plain/25), `starttls` (587/25/2525 style), `ssl`/`tls` (implicit, 465 style). Infer a sensible default from the port ONLY when the setting is absent (backwards compat with today's 2525 config), and prefer the explicit setting whenever set.
- NEVER print secret values (`smtp.pass`, keys). Names + present/absent + non-secret values (port, host, login, from) are OK.
- Do NOT rename existing settings keys (other code reads them).

**Steps:**
- [ ] Step 1: **Report current Settings state (read-only):** each SMTP `appSetting` row — key + value, with `smtp.pass` as present/absent + length ONLY. Confirm `smtp.port`=2525. List any MISSING-but-required key.
- [ ] Step 2: **Precedence audit:** trace settings reader → `createSmtpTransport()` and the inbound handler. Confirm DB-first/env-fallback for host, port, user, pass, from, domain. Flag any field reading env only.
- [ ] Step 3: **De-Brevo / de-port-lock the TLS decision.** Introduce the explicit encryption-mode setting; keep port-based inference strictly as a fallback when unset. Guarantee these all work purely via Settings: implicit TLS on any port; STARTTLS on any port; plain/no-TLS. Remove any Brevo-only assumption.
- [ ] Step 4: **Fix the seed clobber.** `seed.ts` must INSERT defaults only — never overwrite an existing `smtp.*` row (applies to all SMTP keys, especially `port`, `pass`, and the new encryption key).
- [ ] Step 5: **Cache/TTL:** confirm a Settings save invalidates the ~30s cache so a provider switch applies without restart; fix if a save does not invalidate.
- [ ] Step 6: Failing tests first: (a) seed does not overwrite existing `smtp.port`; (b) DB wins over env; (c) env used only when setting absent; (d) explicit `smtp.secure=ssl` on a non-465 port yields implicit TLS; (e) explicit `starttls` on 465 yields STARTTLS (no port lock-in); (f) absent encryption setting falls back to port inference. Then implement.
- [ ] Step 7: `bun run check-types` from `apps/server`. Write tests; do NOT run the full suite.
- [ ] Step 8: Self-review — no scope creep, no renames.

**Report back (mandatory):**
End with `## Produces`:
- **Current Settings state:** each `smtp.*` key → value (pass = present/absent+length only) or MISSING
- **Precedence verdict:** DB-first confirmed for which fields; any field bypassing settings
- **New/updated settings key(s)** with exact name + accepted values (for the UI task)
- Exact files changed + the `seed.ts` change
- Cache TTL + whether a Settings save invalidates it
- Test file + names + exact run command (from `apps/server`)
- **Provider-switch verdict:** can the user move from Brevo to another provider using Settings only (no code change)? yes/no + what would need to change
- Required user actions (set missing keys, rotate the leaked key)
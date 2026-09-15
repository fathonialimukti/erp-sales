### Task 13: Fix SMTP port + CORS for cross-origin send (erp-sales → erp-sales-api)

**Evidence from user (live browser):**
```
Access to fetch at 'https://erp-sales-api.aetherglo.com/trpc/v1/emailCrm.sendMessage?batch=1'
from origin 'https://erp-sales.aetherglo.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Hypothesis to CONFIRM or REFUTE:** the CORS error is a *mask*. `sendMessage` → SMTP connect to port 587 (firewall-BLOCKED per T12) → ~130s `ETIMEDOUT` → reverse proxy times out → proxy/gateway returns 502/504 **without CORS headers** → browser shows a CORS error instead of the real timeout. If true, fixing the port alone fixes the visible CORS symptom. If false, CORS config is genuinely missing the client origin and must be fixed too. Prove which — both are cheap to check.

**Files:**
- Discover + Modify: SMTP transport lib (`apps/server/src/lib/email-smtp.ts`) — already fixed by T12; verify only
- Discover + Modify: CORS setup (resolve: `apps/server/src/index.ts` / `server.ts` / `app.ts` / express CORS middleware / allowed-origins env) — ONLY if genuinely misconfigured
- Test: `apps/server/src/tests/lib/email-smtp.test.ts` (extend) and/or a CORS test

**Interfaces:**
- Consumes: T12 — `createSmtpTransport()` derives `secure` from port (465 implicit TLS, 587/2525 STARTTLS + `requireTLS`), 30s connect/greeting + 60s socket timeouts, invalid-port guard. Effective `smtp.port` = 2525 in DB `appSetting`.
- Produces: confirmed CORS cause, config correction, test, end-to-end proof

**Reads (in your own context):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-13-cors-smtp-port.md`)
- `apps/server/src/lib/email-smtp.ts`, app entry/CORS setup, `apps/server/.env` (READ ONLY), recent `apps/server/logs/app-*.log`

**Frozen contract:**
- Resource `email-crm` unchanged, `.js` imports, `ctx.db`, no secret values printed anywhere
- Do NOT commit secrets; do NOT edit `.env` if it is read-only — report the needed values instead

**Steps:**
- [ ] Step 1: **Confirm/refute the mask hypothesis.** Make a real cross-origin-style request to the running API for `emailCrm.sendMessage` (or the failing path) and inspect the RAW HTTP response: status code, `Access-Control-Allow-Origin` header presence, `Vary: Origin`, OPTIONS preflight result. Distinguish: (a) proxy 502/504 with no CORS headers, (b) app-level rejection before CORS middleware runs, (c) genuinely missing origin in the allowlist.
- [ ] Step 2: Check the CORS allowlist config — exact env var name, whether `https://erp-sales.aetherglo.com` is included, whether `credentials: true` + wildcard `*` conflict (illegal combination → browser blocks, no header emitted), and whether preflight `OPTIONS` is handled before auth/permission middleware.
- [ ] Step 3: Confirm the SMTP port fix is durable. T12 set DB `appSetting` `smtp.port = 2525`, but `apps/server/.env` (read-only) still says `587` and `db:all`/seed upserts env over DB → the fix must survive a reseed. Report the exact durable change needed (env var name + value) and, if the repo has a settings UI/config path, note it.
- [ ] Step 4: Fix whatever Step 1/2 proved — CORS allowlist entry and/or ensure error responses from upstream timeouts still carry CORS headers (or fail fast enough to avoid the proxy timeout entirely).
- [ ] Step 5: **End-to-end proof:** real send on 2525 from the API process (one self-send, `SMTP_FROM` only) returning `accepted[]` + `250`, AND the browser-visible result: no CORS error, OUTBOUND row created, `sentAt`/`sendStatus: SENT` set, `lastOutboundAt` set, `FAILED`/`missing_finalize` cleared.
- [ ] Step 6: `bun run check-types` from `apps/server`. Write tests; do not run the full suite.

**Report back (mandatory):**
End with `## Produces`:
- **Mask hypothesis: CONFIRMED or REFUTED** + the raw HTTP evidence (status, ACAO header, preflight)
- exact file(s) changed + config changes (env var NAMES + non-secret values)
- CORS allowlist state: which origins allowed, whether `erp-sales.aetherglo.com` was missing
- root cause of the CORS error, 1 line
- durable SMTP port recommendation (survives reseed)
- test file+names + exact run command
- **user actions required** (rotate the leaked SMTP key, set env var, restart/redeploy)
- user-visible before/after
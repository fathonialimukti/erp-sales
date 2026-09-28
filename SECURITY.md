# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities privately to the maintainers — do not open a public issue with exploit details.

Include: affected endpoint/module, reproduction steps, and impact assessment. You can reference the current state of known findings in `docs/security-testing-report.md`.

## Security posture (summary)

- Auth: JWT (httpOnly, SameSite=Lax cookie; `Authorization: Bearer` fallback), bcrypt password hashing, DB-backed revocation (`revoked_tokens`, purged every 30 min), login rate limited to 5/min per IP
- Authorization: tRPC procedures are gated by `hasPermission('resource@action')` middleware; Express routes go through `withAuth({ permission })`. **Measured: 108 of 114 mutations carry `hasPermission`, and 113 of 114 are activity-logged.** The six permission-exempt mutations are deliberate and named in `README.md` → *Authorization, audit, and CSRF*: `login` / `demoLogin` (public — no session exists yet), `logout` (the caller's own session), `settings.updateUser` and `userSettings.update` (self-scoped), and `aiChat.submitFormResponse` (audited; the enforced safety core is the `ai@query` SQL gate). The one un-logged mutation is `knowledgeBase.reembed`, a fire-and-forget re-embed trigger.
- CSRF: signed, expiring double-submit token (HMAC keyed on `JWT_SECRET`, 1h TTL) enforced centrally by `csrfOnMutation` on `protectedProcedure`, covering 112 of 114 **tRPC** mutations; `login` / `demoLogin` are public by necessity. The client echoes the token in `x-csrf-token` on mutations only. **That count is tRPC-only and does not cover the API as a whole:** 15 cookie-authenticated Express `POST` routes (`POST /api/ai/*` and `POST /api/backups/upload`) sit outside the tRPC envelope and carry no token. They are protected by an `Origin`/`Referer` allow-list in the shared `withAuth`, and browsers are additionally stopped by the CORS layer, which aborts a disallowed origin before the handler runs. **This is a known, deliberately documented gap** — a client that omits both headers is trusted, and an allow-listed same-site sibling is not stopped at all. See `docs/security-testing-report.md` §9.4 for the full route list, the measured CORS reproduction, the exact blast radius, and the two options that would actually close it.
- Rate limiting: login (5/min/IP), AI endpoints (single global cap `AI_GLOBAL_RPM` shared by all users — mirrors the API key's per-minute quota; unset = unlimited)
- AI guardrails: read-only SQL validation for AI DB queries behind the `ai@query` permission, with row (max 500) and byte (max 512 KiB) caps on returned result sets; the AI admin's SQL gate (`ai-admin@access`) runs under the same row and byte caps, is DDL- and multi-statement-blocked, and is caller-scoped so one admin cannot confirm or execute another admin's pending card; email webhook endpoints require a timing-safe shared secret
- Uploads: data-URL based, mime allow-list, path-traversal-safe serving, 5 MB size cap, served from a sandboxed CSP origin
- Secrets: `.env` files are gitignored; AI/SMTP secrets stored in DB are write-only/masked over the API; no hardcoded JWT or AI-key fallback (both fail fast at startup instead)
- Dependencies: `bun audit --audit-level=low` reports 0 vulnerabilities across 1198 packages and is a required CI job


## Known open findings

Tracked in `docs/security-testing-report.md` with a prioritized remediation plan.
That report was written on 2026-07-30 and has been re-verified against the
current tree since; individual findings now carry a **Status** line. Do not
assume the report is fully remediated — read the status, then check the diff.
Findings still open as of this writing: **the 15 cookie-authenticated Express `POST`
routes have no CSRF token** (only an origin allow-list — see §9.4, the most
significant one), the customer-facing AI chat endpoint
(`routes/customer-ai.ts`) is unauthenticated by design, SVG is still an allowed
upload type (mitigated by the sandboxed upload origin, not removed), the SMTP
`Message-ID` domain is still hardcoded to `aetherglo.com`, and
`exactOptionalPropertyTypes` is documented but not enabled.


## Handling

1. Acknowledge and triage within 48h
2. Fix on a private branch, review with a security lens
3. Release a patch and update the security report + `CHANGELOG.md`

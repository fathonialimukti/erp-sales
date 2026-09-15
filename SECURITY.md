# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities privately to the maintainers — do not open a public issue with exploit details.

Include: affected endpoint/module, reproduction steps, and impact assessment. You can reference the current state of known findings in `docs/security-testing-report.md`.

## Security posture (summary)

- Auth: JWT (httpOnly, SameSite=Lax cookie; `Authorization: Bearer` fallback), bcrypt password hashing
- Authorization: every tRPC procedure and mutation is gated by `hasPermission('resource@action')` middleware; every mutation is activity-logged
- Rate limiting: login (5/min/IP), AI endpoints (single global cap `AI_GLOBAL_RPM` shared by all users — mirrors the API key's per-minute quota; unset = unlimited)
- AI guardrails: read-only SQL validation for AI DB queries; email webhook endpoints require a timing-safe shared secret
- Uploads: data-URL based, mime allow-list, path-traversal-safe serving
- Secrets: `.env` files are gitignored; AI/SMTP secrets stored in DB are write-only/masked over the API

## Known open findings

Tracked in `docs/security-testing-report.md` with a prioritized remediation plan. Do not assume the report is fully remediated — check the current diff.

## Handling

1. Acknowledge and triage within 48h
2. Fix on a private branch, review with a security lens
3. Release a patch and update the security report + `CHANGELOG.md`

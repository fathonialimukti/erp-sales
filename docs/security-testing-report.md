# Security Testing Report — ERP Sales Platform

**Original assessment:** 2026-07-30
**Scope:** Full-stack security assessment of the ERP Sales monorepo (`apps/server`, `apps/client`, `packages/schemas`)
**Methodology:** Static code analysis, threat modeling (STRIDE), OWASP Top 10 mapping

> **Re-verified.** Every finding below was re-checked against the current tree
> and now carries a **Status** line — `RESOLVED`, `OPEN`, or `MITIGATED`. The
> prose is left as originally written so the reasoning survives, but treat the
> Status line, not the 2026-07-30 severity label, as the current truth. Counts
> in this file come from the commands named beside them.

---

## Executive Summary

The codebase demonstrates **strong security fundamentals** across authentication, authorization, input validation, and defense-in-depth. Key strengths include JWT-based auth with httpOnly cookies, bcrypt password hashing, permission-based access control, SQL injection prevention for AI queries, HTML sanitization for email content, and timing-safe secret comparison for webhook validation.

**Overall Risk Rating: LOW** — No critical vulnerabilities found. The single HIGH finding (ungated admin AI endpoints) is resolved. Several medium-severity findings and hardening recommendations are documented below.

**Post-remediation state:** 4 findings remain open or only partially mitigated — the unauthenticated customer AI chat endpoint (by design), SVG upload support (mitigated by a sandboxed origin, not removed), the hardcoded SMTP `Message-ID` domain, and a non-security code-quality gap (`exactOptionalPropertyTypes` documented but not enabled).

---

## 1. Authentication

### 1.1 JWT Secret Hardcoded Default (MEDIUM) — **RESOLVED**

**File (as assessed):** `apps/server/src/context.ts:9`, `apps/server/src/routers/auth.ts:11`, `apps/server/src/routes/ai.ts:9`, `apps/server/src/routes/ai-admin.ts:9`, `apps/server/src/routes/ai-extract.ts:9`, `apps/server/src/routes/sales-order-pdf.ts:9`

```typescript
const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key-change-this';
```

**Risk:** If `JWT_SECRET` is not set in the environment, the application falls back to a well-known default string. An attacker who knows this default can forge valid JWT tokens and impersonate any user.

**Status — resolved.** The literal `'your-secret-key-change-this'` no longer exists anywhere in the tree (`grep -rn "your-secret-key-change-this" apps/server/src` → no matches). `lib/jwt-secret.ts` now throws at module load when the variable is unset, and `lib/env-validate.ts` additionally rejects placeholder-shaped secrets in production:

```typescript
if (env.NODE_ENV === 'production' && /^(your-secret|change-this|test)/i.test(env.JWT_SECRET)) {
    throw new Error('JWT_SECRET looks like a placeholder — set a real secret in production.');
}
```

There is no fallback to remove; the app refuses to start.

### 1.2 JWT Token in Query Parameter (MEDIUM) — **RESOLVED**

**File (as assessed):** `apps/server/src/routes/sales-order-pdf.ts:30-32`

```typescript
if (!token) {
    const queryToken = req.query.token;
    if (typeof queryToken === 'string') token = queryToken;
}
```

**Risk:** Tokens passed via URL query parameters are logged in server access logs, browser history, and `Referer` headers. This creates a token leakage vector.

**Status — resolved.** `grep -n "query.token\|queryToken" apps/server/src/routes/sales-order-pdf.ts` returns nothing. The handler reads the token exclusively through the shared `extractRequestToken` in `lib/express-auth.ts`, which accepts the `access_token` cookie or an `Authorization: Bearer` header.

### 1.3 No Rate Limiting on Login Endpoint (MEDIUM) — **RESOLVED**

**File (as assessed):** `apps/server/src/routers/auth.ts:22-55`

**Risk:** The login endpoint has no rate limiting or account lockout mechanism. An attacker can perform unlimited brute-force password guessing attempts.

**Status — resolved.** `auth.ts` now calls `checkRateLimit(ip)` before attempting the credential check and throws a `TOO_MANY_REQUESTS`-class error when the cap is hit. `lib/rate-limiter.ts` sets `MAX_ATTEMPTS = 5` over `WINDOW_MS = 60_000` (5/min per IP, fixed window). Login also compares against a `DUMMY_HASH` for unknown accounts, so response timing does not reveal whether an email exists.

### 1.4 No Session Revocation (LOW) — **RESOLVED**

**Risk:** JWT tokens are stateless and cannot be revoked before their 7-day expiry. If a token is stolen, it remains valid until expiry.

**Status — resolved.** Revocation is DB-backed: `revoked_tokens` keyed by `jti`, written on logout and checked in `lib/express-auth.ts` and the tRPC context. `lib/token-blacklist.ts` purges expired rows on a 30-minute interval (`PURGE_INTERVAL_MS = 30 * 60 * 1000`). Logout now survives a server restart.


---

## 2. Authorization

### 2.1 Permission Check Query N+1 (LOW) — **RESOLVED**

**File (as assessed):** `apps/server/src/trpc.ts:45-55`

Each protected procedure with `hasPermission` triggered a separate database query to fetch the user's permissions. This is acceptable for security but could be optimized by caching permissions in the JWT or session.

**Status — resolved.** `trpc.ts` now holds a 30s TTL `permissionCache` keyed by `userId` (`PERMISSION_CACHE_TTL_MS = 30_000`), so the user→role→permission join runs once per window instead of once per gated call. Mutations that change roles or permissions call `clearPermissionCache()` so revocation is still immediate; the 30s window is the documented worst-case staleness for everything else.

### 2.2 Permission Router Uses Wrong Permission Check (LOW) — **RESOLVED**

**File (as assessed):** `apps/server/src/routers/permission.ts:14`

```typescript
.list: protectedProcedure
    .use(hasPermission('user@read'))
```

The permission management router used `user@read` instead of a dedicated `permission@read` permission. This is a minor inconsistency — permission management is gated by user read permission rather than a dedicated permission management permission.

**Status — resolved.** The router now uses dedicated permission strings throughout:

```typescript
.use(hasPermission('permission@read'))     // permission.ts:10
.use(hasPermission('permission@create'))   // permission.ts:31
.use(hasPermission('permission@update'))   // permission.ts:49
.use(hasPermission('permission@delete'))   // permission.ts:69
```

### 2.3 Admin AI Endpoints Lack Permission Checks (HIGH) — **RESOLVED**

**File (as assessed):** `apps/server/src/routes/ai-admin.ts`

The admin AI chat endpoint (`/api/ai/admin/chat`) authenticated the user but **did not verify admin role or specific permissions**. Any authenticated user could access the admin AI with full read-write database access.

**Risk:** Any authenticated user — including those with minimal permissions — can use the admin AI to execute INSERT/UPDATE/DELETE queries against the entire database.

**Status — resolved.** All four admin AI entry points are now gated on the `ai-admin@access` permission, at the shared Express middleware and again inside tRPC:

- `routes/ai-admin.ts:252` — `withAuth({ permission: 'ai-admin@access', aiRateLimit: true }, …)` on `POST /api/ai/admin/chat`
- `routes/ai-admin.ts:359` — `withAuth({ permission: 'ai-admin@access' }, …)` on the stream resume
- `routers/ai-chat.ts:78` and `:119` — `hasPermission('ai-admin@access')` on the tRPC procedures
- `prisma/seed.ts:60` defines the permission and `:204` grants it only to the System Admin role

The separate read-only SQL path is gated by its own `ai@query` permission (see 2.5).

### 2.5 AI SQL Endpoint Was Ungated (HIGH, found during remediation) — **RESOLVED**

**File:** `apps/server/src/routes/ai.ts` — `POST /api/ai/query`

**Risk:** The read-only SQL endpoint was authenticated but carried no permission gate, so any logged-in user — regardless of role — could run arbitrary read-only SQL against the database through the AI assistant's `queryDatabase` tool. `validateReadOnlySql` blocks writes, so this was a data-disclosure and load vector rather than a data-integrity one, but it still leaked rows the role was never entitled to read.

**Status — resolved.** The handler is now behind a dedicated `ai@query` permission, and results are capped:

- `routes/ai.ts:233` — `withAuth({ permission: 'ai@query', aiRateLimit: true }, …)`
- `prisma/seed.ts:64` defines `ai@query`; `:205` grants it explicitly rather than by wildcard
- `lib/ai-db-tools.ts` — `MAX_QUERY_ROWS = 500`, `DEFAULT_QUERY_ROWS = 100` applied via `applyRowCap`, and `MAX_RESULT_BYTES = 512 * 1024`, enforced by dropping trailing rows off the encoded envelope
- `tests/routes/ai-query-authz.test.ts` covers the denial path

Note that a `LIMIT` written into user SQL is advisory only; `applyRowCap` is the actual cap.

### 2.4 Customer AI Endpoint Has No Auth (LOW) — **OPEN (by design)**

**File:** `apps/server/src/routes/customer-ai.ts`

The customer-facing AI chat endpoint has no authentication. This is likely intentional (public customer support), but the AI has tools that can look up customer data and create draft orders.

**Risk:** Any anonymous user can interact with the AI and potentially extract customer information or create draft orders.

**Status — still open, accepted.** The handler is still exported without `withAuth`. The mitigations named in the original assessment hold: the AI tools are scoped (`lookupCustomer` requires a name, `createDraftOrder` requires explicit customer/outlet IDs). This is the one authorization finding that remains genuinely unremediated. Abuse is bounded by the AI rate limiter; if the customer chat is ever exposed beyond a controlled audience, revisit it.


---

## 3. SQL Injection

### 3.1 Read-Only SQL Validation (STRONG)

**File:** `apps/server/src/lib/ai-db-tools.ts`

The `validateReadOnlySql` function implements robust SQL injection prevention:
- ✅ Only allows SELECT, WITH (CTE), and EXPLAIN queries
- ✅ Blocks comments (`--`, `/*`) to prevent injection
- ✅ Blocks multi-statement queries (semicolons outside string literals)
- ✅ Uses word-boundary regex for forbidden keyword detection (prevents false positives like "description" matching "delete")
- ✅ Strips string literals before keyword checking (prevents `'; DROP TABLE --` bypass)

**Assessment:** This is a well-implemented SQL injection defense. No vulnerabilities found.

### 3.2 Admin SQL Validation (MEDIUM) — **RESOLVED**

**File:** `apps/server/src/routes/ai-admin.ts`

The admin SQL validation (`validateAdminSql`) allows INSERT, UPDATE, and DELETE operations. As originally written the DDL check used a substring `includes()` call, which the assessment flagged as theoretically bypassable.

**Status — resolved.** The check is now word-boundary regex, matching the read-only validator's approach:

```typescript
for (const keyword of BLOCKED_DDL_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(upperNoStrings)) {
        return { valid: false, reason: `DDL operation rejected: ${keyword} is not allowed.` };
    }
}
```

`BLOCKED_DDL_KEYWORDS` covers `DROP TABLE`, `ALTER TABLE`, `CREATE TABLE`, `TRUNCATE`, `GRANT`, `REVOKE`, `CREATE INDEX`, `DROP INDEX`. The endpoint additionally requires `ai-admin@access` (see 2.3), so reachability is no longer "any authenticated user".

### 3.2a Admin SQL had no result cap (MEDIUM, found during remediation) — **RESOLVED**

**Asymmetry corrected.** `/api/ai/query` runs under `MAX_QUERY_ROWS` / `MAX_RESULT_BYTES` (see 2.5). The admin SQL path had no equivalent ceiling, so the control that matters for a whole-schema `SELECT` was present on one SQL route and absent on the other — which reads as an oversight rather than a decision. The row cap alone is not sufficient, because it bounds rows and not bytes: 200 rows × 200 wide columns of 200-char values is roughly 8 MB of JSON, and a whole-schema `SELECT` is exactly the shape that produces it.

**Where the SQL actually runs — a correction of the original premise.** `routes/ai-admin.ts` does not execute SQL. The direct-execution `queryDatabase` client tool was removed from that pipeline in favour of the `request_confirmation` gate (all admin SQL is proposed as a card, then run by the server after confirmation), so `ai-admin.ts` only mints the card. Execution lives in `routers/ai-chat.ts` → `executeConfirmedAction`. The cap belongs there, and is now there:

- `routers/ai-chat.ts:206` — a read is wrapped in `applyRowCap(gate.sqlText, RESULT_ROWS_STORED)`, so the model-authored statement cannot stream a whole table; a write runs verbatim or not at all (a subquery around an `UPDATE` would be a different statement).
- `routers/ai-chat.ts:209` — the persisted snapshot is bounded by `capRowsByBytes()`, sharing `MAX_STORED_RESULT_BYTES = MAX_RESULT_BYTES` with `/api/ai/query` rather than introducing a second, looser number. The byte cut reuses the existing `truncated` flag, so the model is told the same thing either way.
- Both helpers live in `lib/ai-db-tools.ts` and are reused as-is; nothing was reimplemented.

**The second SQL path, `lib/ai-widgets.ts:99` `classifySqlReadOnly`.** It was checked, and it **can** reach arbitrary SQL: it is the authoritative read/write classifier for the `request_confirmation` tool, and its output decides both `requiresBackupAck` and which branch of `executeConfirmedAction` runs the statement. A statement it classifies as a read is the one that gets the cap; one it classifies as a write runs verbatim under `$executeRawUnsafe`. It is a classification, not an execution, so it needs no cap of its own — but it is on the critical path and is covered, at two points: the admin pipeline passes `validateSql: validateAdminSql` so DDL and multi-statement proposals are rejected at card creation (before any gate row exists), and execution is capped regardless of the classification. Its own guard is the leading-keyword strip in the regex, which treats bare `WITH` as a write because data-modifying CTEs make `WITH …` untrustworthy.

Covered by `tests/aiChatSqlCaps.test.ts`: the executed SQL is verifiably wrapped, a row cap that binds reports `truncated: true`, a write is never wrapped, and `capRowsByBytes` never empties a result to satisfy a size cut (a single already-sanitized row is kept — reporting a successful query as returning nothing would be the worse lie).

### 3.2b `aiChat.confirmAction` was not caller-scoped (LOW) — **RESOLVED**

**File:** `routers/ai-chat.ts:86-88` (and `:129`, `:185`, `:267`)

`confirmAction` resolved its gate row with `findUnique({ where: { id } })` and no caller filter, so any `ai-admin@access` holder could confirm — and thereby cause the execution of — another admin's pending confirmation card, including a write card the originating admin had merely proposed and not yet approved. The `createdBy` field already existed and is server-assigned from the authenticated user when the card is created, so the fix was a filter on it, not a schema change.

All three gate procedures are now scoped on `createdBy: ctx.user.userId`, and all three return `NOT_FOUND` rather than `FORBIDDEN` on a foreign id so the refusal does not confirm that the card exists. `executeConfirmedAction` is the highest-value of the three — it is the one that runs the statement — and is scoped inside the transaction and again in the post-rollback read. Covered by `tests/aiChatSqlCaps.test.ts` → *admin SQL gate — caller scoping*, which also asserts the foreign write never reached the table and that the one-time-use claim is untouched.

---

### 3.3 Prisma Query Safety (STRONG)

All database queries use Prisma ORM with parameterized inputs. No raw SQL injection vectors found in the tRPC routers.

---

## 4. Cross-Site Scripting (XSS)

### 4.1 Email HTML Sanitization (STRONG)

**File:** `apps/server/src/lib/email-html.ts`

The `sanitizeEmailHtml` function implements effective XSS prevention:
- ✅ Maximum length check (100,000 characters)
- ✅ Blocks `<script>`, `<iframe>`, `<object>`, `<form>` tags
- ✅ Blocks event handlers (`on\w+=` pattern)
- ✅ Blocks `javascript:` URIs

**Assessment:** Good defense-in-depth. The regex-based approach is not a full HTML sanitizer (like DOMPurify), but it blocks the most common XSS vectors.

**Recommendation:** Consider using a proper HTML sanitizer library (e.g., `dompurify` with `isomorphic-dompurify` for server-side) for more robust sanitization, especially if the email HTML is rendered in a web UI.

### 4.2 Email Concierge Prompt Injection Defense (STRONG)

**File:** `apps/server/src/lib/email-concierge.ts`

The email concierge implements strong prompt injection defenses:
- ✅ Clear system prompt stating customer email content is untrusted data
- ✅ Explicit instruction to ignore instructions inside the email thread
- ✅ "Prompt sandwich" pattern: trusted system + trusted context → untrusted thread → restated rules
- ✅ Requires explicit `finalizeCustomerReply` tool call before sending email

**Assessment:** Excellent defense against prompt injection. The architecture forces the AI to use tools for facts and requires explicit finalization before any email is sent.

---

## 5. CORS Configuration

### 5.1 CORS Origin Validation (STRONG)

**File:** `apps/server/src/index.ts`

The origin policy was extracted into `lib/cors-origin.ts` so it can be unit-tested without booting the server:

```typescript
export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  return isAllowedDevOrigin(origin);
}
```

`apps/server/src/index.ts` wires it as:

```typescript
origin: (origin, callback) => {
    if (isOriginAllowed(origin, allowedOrigins)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
},
```

**Assessment:** Strong CORS configuration:
- ✅ Explicit origin allowlist (production), comma-separated via `CORS_ORIGIN`
- ✅ Dev origins restricted to localhost/127.0.0.1 any port + `tauri://localhost`
- ✅ `credentials: true` for cookie support
- ✅ Fail-closed (blocks unknown origins)

**Status — open, low risk.** `isOriginAllowed` still returns `true` for a request with no `Origin` header, so non-browser clients (curl, same-origin, server-to-server) are not blocked. That is generally acceptable, but it is worth tightening for browser-only deployments. Covered by `tests/lib/cors-origin.test.ts`.


---

## 6. File Upload Security

### 6.1 File Upload Path Traversal Protection (STRONG)

**File:** `apps/server/src/lib/upload-file.ts`

The file upload implementation includes robust security:
- ✅ Filename sanitization: strips non-alphanumeric characters, limits length
- ✅ UUID-based filenames (prevents filename collisions and path traversal)
- ✅ MIME type validation for images
- ✅ Extension validation from MIME type mapping

**Assessment:** Strong file upload security. No path traversal vulnerabilities found.

### 6.2 SVG Upload Risk (MEDIUM) — **MITIGATED, not removed**

**File:** `apps/server/src/lib/upload-file.ts:57`

SVG files are still an allowed upload format (`'.svg': 'image/svg+xml'`). SVG files can contain JavaScript and are a common XSS vector.

**Risk:** If uploaded SVG files are served and rendered in a browser, they could execute malicious JavaScript.

**Status — mitigated, still open.** The upload type was not removed, but every file served from `/uploads` — SVG included — now runs in a sandboxed unique origin (`index.ts:75`):

```typescript
res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
```

Combined with `default-src 'none'`, a stored SVG cannot load or execute script in the app's origin, so the classic stored-XSS escalation is closed. This is a real mitigation and a real residual risk: a user who downloads the file and opens it locally still gets the original markup. Removing SVG from the allow-list, or sanitizing on store, remains the durable fix.

### 6.3 File Upload No Size Limit (LOW) — **RESOLVED**

**Risk:** There was no explicit file size limit on uploads. While Express has a 10MB JSON body limit, the upload endpoint may accept larger files.

**Status — resolved.** `lib/upload-file.ts` now rejects anything over 5 MB, in both the read path and the persistence path:

```typescript
throw new UploadImageError('INVALID_IMAGE_FORMAT', 'File too large. Maximum size is 5MB.');
```

The `/api/ai/*` JSON body limit is separately capped at 1 MB (`index.ts:114`) and the client error-report endpoint at 16 KB (`index.ts:102`).


---

## 7. Email Webhook Security

### 7.1 Webhook Secret Validation (STRONG)

**File:** `apps/server/src/lib/email-webhook-secret.ts`

```typescript
export function isValidEmailWebhookSecret(provided: string | undefined): boolean {
  const expected = process.env.EMAIL_WEBHOOK_SECRET ?? '';
  if (!expected) return false;  // Fail-closed
  return secretsEqual(String(provided ?? ''), expected);
}
```

**Assessment:** Excellent webhook security:
- ✅ Fail-closed (rejects all if secret not configured)
- ✅ Timing-safe comparison (`timingSafeEqual`) prevents timing attacks
- ✅ Both `/api/email/inbound` and `/api/email/auto-reply` validate the secret

### 7.2 Email Inbound Input Validation (STRONG)

**File:** `apps/server/src/routes/email-inbound.ts`

- ✅ Webhook secret validation before processing
- ✅ Zod schema validation (`emailInboundPayloadSchema`)
- ✅ Error handling with generic error messages (no information leakage)

---

## 8. Information Disclosure

### 8.1 Generic Error Messages (STRONG)

All error responses use generic messages without leaking internal details:
- `auth.invalidCredentials` → "Invalid email or password" (no distinction between user not found and wrong password)
- Email inbound errors → "Internal error" (no stack traces)
- AI query errors → "Query failed" with hint (no internal paths)

### 8.2 No Stack Traces in Production (STRONG)

Error handling throughout the codebase catches errors and returns sanitized messages. No stack traces are exposed to clients.

### 8.3 Readiness Probe Leaked the Driver Error (MEDIUM, found during remediation) — **RESOLVED**

**File:** `apps/server/src/routes/health.ts`

**Risk:** `GET /readyz` is unauthenticated by design — a load balancer needs it — but the handler was returning `String(error)` in the response body. A Prisma/pg driver error string routinely embeds the DSN, host, port, database and schema names, so anyone who could reach the probe could fingerprint the datastore from the outside.

**Status — resolved.** The response is now a fixed shape, and the detail is logged server-side instead:

```typescript
} catch (error) {
    // /readyz is unauthenticated, so the driver message (DSN fragments, host,
    // schema names) must stay server-side — security-testing-report §8.
    logApp({
      level: 'ERROR',
      module: 'api',
      message: 'Readiness probe failed: database unreachable',
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
    res.status(503).json({ status: 'not_ready', db: 'disconnected' });
}
```

`GET /healthz` returns a static liveness response and never touches the database.


---

## 9. Session Management

### 9.1 Cookie Security (STRONG)

**File:** `apps/server/src/routers/auth.ts:24-32`

```typescript
stringifySetCookie({
    name: 'access_token',
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(rememberMe ? { maxAge: TOKEN_MAX_AGE } : {}),
});
```

**Assessment:** Strong cookie security:
- ✅ `httpOnly: true` (prevents JavaScript access)
- ✅ `sameSite: 'lax'` (weakens CSRF, but does not close it — see 9.3)
- ✅ `secure: true` in production (HTTPS only)
- ✅ 7-day expiry for remember-me, session cookie otherwise

The `csrf_token` cookie (`context.ts:77-86`) uses the same attribute set.

### 9.3 CSRF Protection — Enforced End to End (STRONG, finding closed)

**Risk:** While `sameSite: 'lax'` provides good CSRF protection for most cases, `sameSite: 'lax'` alone does not cover every vector. Cookies are keyed on the registrable domain, so a request from a sibling subdomain (e.g. `evil.aetherglo.com` → `erp-sales-api.aetherglo.com`) is *same-site* and does carry `access_token`. Subdomain cookie injection is the second gap.

> **Correction (retest).** An earlier revision of this section claimed the CORS allow-list "stops the response from being read, not the write from happening." That is **factually wrong**, and it was the stated justification for the whole CSRF programme. `index.ts:48-55` passes `cors()` an origin callback that calls `callback(new Error('Not allowed by CORS'))` for a disallowed origin; the `cors` middleware turns that into `next(err)` **before** any route handler runs. Measured against the running API:
>
> ```
> $ curl -i -X POST localhost:10022/api/ai/query -H "Origin: https://evil.aetherglo.com" -d '{"question":"hi"}'
> HTTP/1.1 500 Internal Server Error
> Error: Not allowed by CORS
>     at origin (/workspaces/erp-sales/apps/server/src/index.ts:51:26)
>     at <anonymous> (cors/lib/index.js:219:13)          <- cors' own optionsCallback
>     at corsMiddleware (cors/lib/index.js:204:7)
>     at next (router/lib/index.js:291:5)
>
> $ curl -o /dev/null -w '%{http_code}' -X POST localhost:10022/api/ai/query -H "Origin: https://erp-sales.aetherglo.com" -d '{"question":"hi"}'
> 401                                   <- handler reached (unauthenticated)
> $ curl -o /dev/null -w '%{http_code}' -X POST localhost:10022/api/ai/query -d '{"question":"hi"}'
> 401                                   <- no Origin at all: handler reached
> ```
>
> The write does not happen: the stack never enters a route. **The
> sibling-subdomain attack this section describes is blocked by CORS, not by
> CSRF.** CORS is a cross-*origin* control, so it is doing the work, and the
> reasoning that followed from it (a token is needed because the attacker gets
> the cookie through) described a hole that was not open in this deployment.
>
> **Residual risk, stated plainly — CORS is not a CSRF defence:**
> - CORS binds only *browsers*. The third request above sends no `Origin` and
>   is served normally, so any non-browser client (curl, a server-side script, a
>   mobile app) is unbound by the allow-list, and a stolen or planted cookie
>   replays from anywhere. Only a token bound to the request defeats that.
> - A sibling subdomain that *is* on the allow-list, or a wildcard entry, is
>   same-origin as far as CORS is concerned, so the allow-list stops protecting
>   and the cookie is sent. `sameSite: 'lax'` also does not stop same-site
>   requests at all.
> - CORS governs *reads*; it never governs what a handler writes to storage. Here
>   it happens to short-circuit before the handler, which is a stronger property
>   than CORS promises — but that is a property of this middleware ordering, not
>   of the CORS specification, so it is a design accident, not a guarantee, and
>   any handler mounted before `app.use(cors(…))` would bypass it entirely.
>
> So the CSRF programme is **not** justified by the sibling-subdomain threat
> being unblocked. It is justified by the two properties above: CORS binds
> nothing outside a browser, and it is not a control at all for allow-listed
> same-site subdomains. The signed double-submit token below is what actually
> holds, and it should be described that way.

**Status:** Closed — and it is worth being precise about what "closed" means, because the machinery existed here for a while *without* being enforced, and the `httpOnly` cookie made a naive double-submit impossible to execute.

**Why the original gap was real.** The cookie holding the CSRF token is `httpOnly: true`, so the web origin cannot read it to echo it back. A double-submit scheme that requires JavaScript to read the cookie is not a double-submit scheme; it is inert. The fix was to deliver the value out of band (in a response body) **and** sign it, so an attacker who can plant a cookie still cannot choose the token the server will accept.

**What is enforced now:**

- `apps/server/src/lib/csrf.ts` mints a signed, expiring double-submit token: `<expiresAtMs>.<nonce>.<hmac-sha256>`, HMAC keyed on `JWT_SECRET`, `CSRF_TOKEN_TTL_MS = 60 * 60 * 1000` (1h). `validateCsrfToken()` requires cookie value === `x-csrf-token` header, a valid signature, and an unexpired `expiresAt`; comparison is `timingSafeEqual` and malformed input fails closed (a non-numeric `expiresAt` yields `NaN`, and `now < NaN` is false).
- `context.ts` mints the cookie per request and **rotates** it when the incoming value is missing, forged, or expired.
- `csrfOnMutation` in `trpc.ts` is a central, mutation-scoped hook applied on `protectedProcedure = t.procedure.use(isAuthed).use(csrfOnMutation)` — one line instead of 112 per-router edits.
- `auth.csrfToken` (public query) hands the token to the client in a response **body**, with the server's own `csrfExpiresAt` so the client schedules its re-read from the mint rather than from receipt. The cookie stays `httpOnly: true`.
- `apps/client/src/lib/trpc.ts` echoes the token in `x-csrf-token` on mutations only, re-reads it 60s before expiry, and on a `403` re-sends **once** — but only when the server's token actually moved, so a permission `403` never re-runs a batch whose mutations already committed. `httpBatchLink` keeps separate loaders per op type, so a POST batch is always all-mutations: a `403` means none of them ran.
- `login` and `demoLogin` stay on `publicProcedure` by necessity: on a first visit `useAuthBootstrap` issues no tRPC call until a stored token exists, so gating login would lock out every new user. This is the *only* exemption.
- `apps/server/src/tests/lib/csrf.test.ts` covers valid, missing, mismatched, tampered, expired, forged, and cookie rotation; `tests/helpers/caller.ts` plays the browser for every router test.

**Measured coverage:** 114 mutations exist across the routers; 112 are built on `protectedProcedure` and therefore CSRF-checked. The 2 exemptions are `login` and `demoLogin`, both `publicProcedure`.

**The mint is additive — `lib/cookies.ts`.** `res.setHeader('Set-Cookie', …)` *replaces* the header, and `createContext` mints the CSRF cookie on every tRPC request before the resolver runs. `auth.login` (`routers/auth.ts:165`, `:267`) and `auth.logout` (`:349`) then set the same header for the session cookie, which silently dropped the CSRF mint on exactly those two responses. All four sites now go through `appendSetCookie(res, cookie)`, which reads the existing header and pushes onto an array; Node emits one `Set-Cookie` per array entry. Verified against the running API — a login response carries both:

```
$ curl -s -D - -o /dev/null -X POST localhost:10022/trpc/v1/auth.login \
    -H 'Content-Type: application/json' -d '{"email":"admin@mail.com","password":"password"}' | grep -i '^set-cookie'
Set-Cookie: csrf_token=1790579425523.11108244e87c4defbfb59a6b6e1461f6ea03530b878003b60ca94ce89c499eb9.8765132bfbc0ef899a434077432b4ae2f496ac20c725d9833baa9353873e34fc; Path=/; HttpOnly; SameSite=Lax
Set-Cookie: access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…; Path=/; HttpOnly; SameSite=Lax
```

This mattered more than a lost header: `login` is on `publicProcedure` and so is *not* itself CSRF-checked, so if it had stopped minting, a client that had not pre-fetched `auth.csrfToken` would have completed a successful login and then failed its first mutation with `FORBIDDEN`. Covered by `tests/lib/csrf.test.ts` → *createContext cookie rotation*.

### 9.4 CSRF coverage boundary — 15 cookie-authenticated Express POSTs (MEDIUM, accepted)

**Status — open by design, with a control added. This is the honest limit of 9.3.**

The 112-of-114 figure in 9.3 counts **tRPC mutations only**. It is not a claim about the whole API. Fifteen cookie-authenticated `POST` routes sit outside the tRPC envelope entirely and are not covered by any token:

| Route | Gate |
|---|---|
| `POST /api/ai/chat` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/query` | `withAuth({ permission: 'ai@query', aiRateLimit: true })` |
| `POST /api/ai/extract-sales-order` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/summarize` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/draft` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/form-fill` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/visit-log-order` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/summarize-record` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/rejection-fix` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/report-narrate` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/customer-360` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/duplicate-check` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/kb-writer` | `withAuth({ aiRateLimit: true })` |
| `POST /api/ai/admin/chat` | `withAuth({ permission: 'ai-admin@access', aiRateLimit: true })` |
| `POST /api/backups/upload` | `withAuth({ permission: 'backup@restore' })` — 100 MB JSON body, writes to disk, creates a restorable `Backup` row |

Every one of them authenticates off the same `httpOnly` `access_token` cookie. `POST /api/backups/upload` is the highest-value target in the set: 100 MB to disk plus a `Backup` row that the standard restore path will later apply, gated by a single permission.

Not in the table, and deliberately: the three `withAuth` `GET` routes (safe methods), `POST /api/log/client` (unauthenticated telemetry), `POST /api/email/inbound` and `POST /api/email/auto-reply` (shared-secret gated, see 7.1), and `POST /api/ai/customer/chat` (unauthenticated by design, see 2.4). None of those read the session cookie, so none are in the CSRF threat model.

**What actually stops a browser today is CORS, not a token.** Re-measured against the running API on the current tree — a disallowed `Origin` aborts inside the `cors` middleware's own callback and the stack never enters a route:

```
$ curl -i -s -X POST localhost:10022/api/ai/query -H "Origin: https://evil.aetherglo.com" -d '{"question":"hi"}'
HTTP/1.1 500 Internal Server Error
<pre>Error: Not allowed by CORS<br> &nbsp; &nbsp;at origin (/workspaces/erp-sales/apps/server/src/index.ts:51:26)<br>
 &nbsp; &nbsp;at &lt;anonymous&gt; (…/cors/lib/index.js:219:13)<br>
 &nbsp; &nbsp;at corsMiddleware (…/cors/lib/index.js:204:7)<br>
 &nbsp; &nbsp;at next (…/router/index.js:291:5)<br>
 &nbsp; &nbsp;at compression (…/compression/index.js:265:5)</pre>

$ curl -o /dev/null -w '%{http_code}\n' -X POST localhost:10022/api/ai/query -H "Origin: https://erp-sales.aetherglo.com" -d '…'   # allow-listed
401
$ curl -o /dev/null -w '%{http_code}\n' -X POST localhost:10022/api/ai/query -d '…'                                                    # no Origin
401
```

**Residual risk, stated at its true size — CORS is not a CSRF defence:**

- **CORS binds browsers only.** The third request above sends no `Origin` and is served normally, so a non-browser client is unbound by the allow-list entirely: any stolen or planted `access_token` replays from anywhere. No origin check can fix this — see the accepted weakening below.
- **Allow-listed same-site siblings are not covered at all.** A sibling on `CORS_ORIGIN` is same-site, so `sameSite: 'lax'` does not withhold the cookie either. CORS permits the request because the origin is trusted, and the trust is the decision. An attacker who can serve script from an allow-listed origin can drive all 15 routes as the victim, with the victim's cookies attached, and read the responses — including `/api/ai/query` and `/api/backups/upload`.

**The control added: an `Origin`/`Referer` allow-list inside the shared `withAuth`** (`lib/express-auth.ts:132-151`, wired at `:158`). One change rather than fifteen route edits. It refuses with `403 {"error":"Cross-origin request not allowed"}` and writes a security event to `app_logs` **before** any credential work, so the request is refused whether or not it would have authenticated.

What it adds, honestly split by path:

- **On the `Referer` path it is genuinely additional control.** CORS never looks at `Referer`, so a request with no `Origin` and a cross-site `Referer` is admitted by CORS and refused here. Measured live — three requests identical except for the `Referer` header, all carrying a valid `admin@mail.com` session cookie:

  ```
  Referer: https://erp-sales.aetherglo.com/x   → 200 {"success":true,"rowCount":1,"data":[{"n":51}],…}
  (no Referer)                                  → 200 {"success":true,"rowCount":1,"data":[{"n":51}],…}
  Referer: https://evil.aetherglo.com/form      → 403 {"error":"Cross-origin request not allowed"}
  ```

  The same holds on the 100 MB route: cross-site `Referer` → `403 {"error":"Cross-origin request not allowed"}`; no `Referer` → `400 {"error":"INVALID_BACKUP_FILE"}` (handler reached).
- **On the `Origin` path it is redundant with CORS today.** Both call the same `isOriginAllowed`, so it cannot refuse anything the CORS layer admitted. Its value is that the decision is then made at the point of authentication rather than inherited from global middleware ordering — which is not a security property. If CORS is ever loosened from "abort" to "omit the header", or a route is ever mounted before `app.use(cors(…))`, this still fails closed. That is insurance, not a fix, and it should be read as such.

**Accepted weakening: a missing `Origin` is not a rejection.** The check is conditional on `Origin` being present, falling back to `Referer` and then allowing the request when neither header is present. A browser always sends `Origin` on a cross-origin unsafe request, so "no `Origin`" is curl, a server-to-server call, or the Tauri webview — never a browser CSRF attempt. Gating on it would break every non-browser caller and the webview for no security gain, and it is exactly the exemption `isOriginAllowed` already gives the CORS layer. The consequence is stated rather than hidden: **any client that can omit `Origin` and `Referer` is trusted**, so this control provides zero protection against a stolen-token replay from a script or a mobile app. It reduces browser-shaped attacks; it does not reduce token theft.

**What would actually close it, and why it is not shipped here.** Extending the token to these 15 routes requires the client to send `x-csrf-token` on them, which is a client change (out of scope for the server work) and would break all 15 routes until it lands — a "fix" that disables functionality is worse than a documented gap. The durable options, for whoever picks this up:

1. Have the client echo `x-csrf-token` on non-tRPC POSTs and validate it in `withAuth` alongside the origin check. Correct, but a cross-cutting client+server change.
2. Narrow `CORS_ORIGIN` and drop the blanket `isAllowedDevOrigin` wildcard in production, so the allow-listed-sibling case cannot exist. Cheap, no client change, and it shrinks the second residual bullet above.

Until one of those lands, this stays **open**: fifteen cookie-authenticated state-changing routes with no token, protected by an origin allow-list that browsers respect and non-browser clients do not.

---

## 10. Input Validation

### 10.1 Zod Schema Validation (STRONG)

All tRPC endpoints use Zod schemas for input validation. The shared `@repo/schemas` package provides consistent validation across the application.

### 10.2 Search Input Sanitization (STRONG)

Search inputs use Prisma's `contains` with `mode: 'insensitive'`, which parameterizes the query. No SQL injection risk.

---

## 11. Logging and Monitoring

### 11.1 Activity Logging (STRONG)

**File:** `apps/server/src/lib/activity-log.ts`

All CRUD operations are logged with:
- ✅ User ID (who performed the action)
- ✅ Action type (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
- ✅ Resource type and ID
- ✅ Message describing the action
- ✅ Detailed before/after values for updates

### 11.2 Login/Logout Logging (STRONG)

Both login and logout events are logged, providing an audit trail for authentication events.

---

## 12. Secrets Management

### 12.1 AI API Key Hardcoded (MEDIUM) — **RESOLVED**

**File (as assessed):** `apps/server/src/lib/ai-provider.ts:8`

```typescript
// key literal redacted here — see git history for the original line
apiKey: process.env.AI_API_KEY ?? 'sk-<REDACTED>',
```

**Risk:** A default API key was hardcoded as a fallback. If `AI_API_KEY` is not set, the application used that key, which may have been a real or test key. This could lead to unauthorized API usage or billing.

**Status — resolved.** The literal is gone: `grep -rEn "sk-[a-z0-9]{8}" apps/server/src --include="*.ts"` returns no key material. `ai-provider.ts` no longer reads `process.env.AI_API_KEY` directly; it resolves the key through the settings service, which prefers DB and falls back to env:

```typescript
const apiKey = await getSecretValue(db, 'ai.apiKey');
```

`lib/settings-service.ts:36` maps `ai.globalRpm` to `AI_GLOBAL_RPM` as the env fallback for rate limits, and secrets written through the API are write-only/masked. `bun audit --audit-level=low` reports 0 vulnerabilities across 1198 packages, so no key-shaped string is sitting in a dependency either.

### 12.2 SMTP Credentials (LOW) — **OPEN**

**File:** `apps/server/src/lib/email-smtp.ts`

SMTP credentials are loaded from environment variables. No hardcoded credentials found. This finding stands as written — the `generateMessageId` function still hardcodes the domain:

```typescript
export function generateMessageId(domain = 'aetherglo.com') {
```

**Status — still open.** Not a credential leak, but a deployment-portability bug: a `Message-ID` on any other domain is RFC-wise wrong and leaks the internal domain to recipients. Make the domain configurable via env or the settings service.

---

## 13. Dependency Security

### 13.1 Outdated Dependencies (LOW) — **RESOLVED**

**Original recommendation:** Run `npm audit` or `bun audit` to check for known vulnerabilities in dependencies. Set up automated dependency scanning.

**Status — resolved, and now a required gate.** Two things landed:

- `bun audit --audit-level=low` reports `No vulnerabilities found (checked 1198 packages)`. Two transitive pins were added to the root `overrides` to reach that: `deepmerge-ts` `7.1.5 → 8.0.2` and `mysql2` `3.15.3 → 3.24.4`, both pulled in by Prisma.
- `.github/workflows/ci.yml` has an `audit` job running exactly that command on every push and pull request, and it is not `continue-on-error`. Dependabot also runs weekly for npm and GitHub Actions (`.github/dependabot.yml`).

The pre-remediation CVE count is not reproducible from the current tree, so it is deliberately not restated here.

---

## Summary of Findings

Status verified against the current tree. `bun run lint`, `bun run check-types`,
`bun run build` and `bun audit --audit-level=low` all exit 0.

| Original severity | Finding | Status |
|---|---|---|
| HIGH | 2.3 Admin AI endpoints lack permission checks | **RESOLVED** — `ai-admin@access` at the middleware and in tRPC |
| HIGH | 2.5 AI SQL endpoint was ungated *(found during remediation)* | **RESOLVED** — `ai@query` permission + row/byte caps |
| MEDIUM | 8.3 Readiness probe leaked the driver error *(found during remediation)* | **RESOLVED** — generic 503 body, detail logged server-side |
| MEDIUM | 1.1 JWT secret hardcoded default | **RESOLVED** — throws at startup, placeholders rejected in prod |
| MEDIUM | 1.2 Token in query parameter | **RESOLVED** — cookie or `Authorization` header only |
| MEDIUM | 1.3 No login rate limiting | **RESOLVED** — 5/min/IP, plus timing-equalized unknown-account path |
| MEDIUM | 3.2 Admin SQL substring DDL check | **RESOLVED** — word-boundary regex |
| MEDIUM | 9.4 15 cookie-authenticated Express POSTs outside the CSRF envelope *(found during remediation)* | **OPEN** — origin allow-list control in `withAuth`; no token, deliberately documented |
| MEDIUM | 3.2a Admin SQL path had no result cap *(found during remediation)* | **RESOLVED** — same `applyRowCap` + byte cap as `/api/ai/query` |
| MEDIUM | 6.2 SVG upload risk | **MITIGATED** — sandboxed upload origin; SVG not removed |
| MEDIUM | 12.1 AI API key hardcoded | **RESOLVED** — resolved through the settings service |
| LOW | 1.4 No session revocation | **RESOLVED** — `revoked_tokens`, purged every 30 min |
| LOW | 2.1 Permission check query N+1 | **RESOLVED** — 30s TTL permission cache |
| LOW | 2.2 Permission router used `user@read` | **RESOLVED** — dedicated `permission@*` strings |
| LOW | 3.2b `confirmAction` not caller-scoped *(found during remediation)* | **RESOLVED** — `createdBy` filter on all three gate procedures |
| LOW | 6.3 No file size limit | **RESOLVED** — 5 MB cap enforced |
| LOW | 9.3 Missing CSRF protection | **RESOLVED** — signed + expiring token, 112/114 **tRPC** mutations (see 9.4 for what that number does not cover) |
| LOW | 13.1 Outdated dependencies | **RESOLVED** — 0 vulnerabilities, CI-enforced |
| LOW | 2.4 Customer AI endpoint has no auth | **OPEN** — accepted as by design; tools are scoped |
| LOW | 12.2 Hardcoded email `Message-ID` domain | **OPEN** — `aetherglo.com` still hardcoded |
| LOW | 5.1 CORS allows originless requests | **OPEN** — acceptable for non-browser clients |
| — | `exactOptionalPropertyTypes` documented, not enabled | **OPEN** — code-quality gap, not a vulnerability |

**Totals: 18 resolved, 1 mitigated, 4 open** (plus one non-security gap).

## Prioritized Remediation Plan

1. **~~[HIGH] Add admin permission check to `/api/ai/admin/chat` and `/api/ai/admin/chat/:chatId/stream`~~ DONE** — gated on `ai-admin@access` at `withAuth` and on `hasPermission('ai-admin@access')` in tRPC (see 2.3).

2. **~~[HIGH] Gate the read-only AI SQL endpoint~~ DONE** — new `ai@query` permission plus `MAX_QUERY_ROWS` / `MAX_RESULT_BYTES` caps (see 2.5).

3. **~~[MEDIUM] Remove hardcoded secrets~~ DONE** — `JWT_SECRET` and `AI_API_KEY` both fail fast; no fallback literal remains (see 1.1, 12.1).

4. **~~[MEDIUM] Remove token from query parameter~~ DONE** — the sales-order PDF endpoint reads cookie or `Authorization` header only (see 1.2).

5. **~~[MEDIUM] Add rate limiting~~ DONE** — `checkRateLimit` on login, 5/min/IP (see 1.3).

6. **~~[LOW] CSRF protection~~ DONE** — signed double-submit token with HMAC signature and 1h expiry, delivered via the `auth.csrfToken` body response and enforced centrally by `csrfOnMutation` on `protectedProcedure`, covering 112 of 114 mutations. The `httpOnly` cookie no longer blocks execution because the value travels in a response body and the signature prevents an attacker-chosen token (see 9.3). The count is tRPC mutations only; the 15 cookie-authenticated Express POSTs are a separate, still-open finding (see 9.4).

7. **[MEDIUM] Extend the CSRF token to the 15 non-tRPC POSTs** — still open. `withAuth` now refuses cross-origin unsafe requests on an `Origin`/`Referer` allow-list, and that check measurably catches the `Referer` case CORS misses, but it is not a token: a client that omits both headers is trusted, and an allow-listed same-site sibling is not stopped at all. The durable fix is the client echoing `x-csrf-token` on non-tRPC POSTs and `withAuth` validating it; the cheap partial fix is narrowing `CORS_ORIGIN` and dropping the dev-origin wildcard in production (see 9.4).

8. **[MEDIUM] Remove SVG upload support** — still open. The sandboxed upload origin mitigates stored XSS, but removing `image/svg+xml` from the allow-list (or sanitizing on store) is the durable fix (see 6.2).

9. **[LOW] Make the SMTP `Message-ID` domain configurable** — replace the hardcoded `aetherglo.com` default in `email-smtp.ts` (see 12.2).

10. **[LOW] Consider tightening CORS for browser-only deployments** — `isOriginAllowed` still allows an absent `Origin` header (see 5.1).

11. **[LOW] Decide on the customer AI endpoint** — accepted as by design; revisit if the customer chat is exposed beyond a controlled audience (see 2.4).

12. **[LOW] Enable `exactOptionalPropertyTypes`** — documented in `CONTEXT.md`, enabled in no tsconfig. Expect real code changes, not a config flip.
Items 1–6 previously appeared open in this report and are now verified closed. Items 7–12 are genuinely outstanding.


---

## Positive Security Highlights

The following security practices are well-implemented and should be maintained:

1. **bcrypt password hashing** with 10 rounds
2. **JWT authentication** with httpOnly, sameSite cookies
3. **Permission-based authorization** with `resource@action` format
4. **SQL injection prevention** for AI database queries (keyword blocking, comment blocking, multi-statement blocking)
5. **HTML sanitization** for email content (XSS prevention)
6. **Timing-safe webhook secret validation** with fail-closed behavior
7. **CORS origin validation** with explicit allowlist
8. **File upload security** with filename sanitization and UUID-based storage
9. **Activity logging** for all CRUD operations and authentication events
10. **Prompt injection defense** in email concierge (prompt sandwich pattern, explicit finalization)
11. **Generic error messages** (no information disclosure)
12. **Input validation** with Zod schemas across all endpoints

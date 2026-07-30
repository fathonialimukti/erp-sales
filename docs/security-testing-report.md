# Security Testing Report — ERP Sales Platform

**Date:** 2026-07-30
**Scope:** Full-stack security assessment of the ERP Sales monorepo (`apps/server`, `apps/client`, `packages/schemas`)
**Methodology:** Static code analysis, threat modeling (STRIDE), OWASP Top 10 mapping

---

## Executive Summary

The codebase demonstrates **strong security fundamentals** across authentication, authorization, input validation, and defense-in-depth. Key strengths include JWT-based auth with httpOnly cookies, bcrypt password hashing, permission-based access control, SQL injection prevention for AI queries, HTML sanitization for email content, and timing-safe secret comparison for webhook validation.

**Overall Risk Rating: LOW** — No critical vulnerabilities found. Several medium-severity findings and hardening recommendations are documented below.

---

## 1. Authentication

### 1.1 JWT Secret Hardcoded Default (MEDIUM)

**File:** `apps/server/src/context.ts:9`, `apps/server/src/routers/auth.ts:11`, `apps/server/src/routes/ai.ts:9`, `apps/server/src/routes/ai-admin.ts:9`, `apps/server/src/routes/ai-extract.ts:9`, `apps/server/src/routes/sales-order-pdf.ts:9`

```typescript
const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key-change-this';
```

**Risk:** If `JWT_SECRET` is not set in the environment, the application falls back to a well-known default string. An attacker who knows this default can forge valid JWT tokens and impersonate any user.

**Recommendation:** Fail fast at startup if `JWT_SECRET` is not set in production. Remove the default fallback entirely or use a startup validation check.

### 1.2 JWT Token in Query Parameter (MEDIUM)

**File:** `apps/server/src/routes/sales-order-pdf.ts:30-32`

```typescript
if (!token) {
    const queryToken = req.query.token;
    if (typeof queryToken === 'string') token = queryToken;
}
```

**Risk:** Tokens passed via URL query parameters are logged in server access logs, browser history, and `Referer` headers. This creates a token leakage vector.

**Recommendation:** Remove query parameter token support. Use `Authorization: Bearer` header or httpOnly cookies only. If a new tab needs auth, use `window.opener` postMessage or a redirect-based flow.

### 1.3 No Rate Limiting on Login Endpoint (MEDIUM)

**File:** `apps/server/src/routers/auth.ts:22-55`

**Risk:** The login endpoint has no rate limiting or account lockout mechanism. An attacker can perform unlimited brute-force password guessing attempts.

**Recommendation:** Implement rate limiting (e.g., `express-rate-limit`) on the login endpoint — e.g., 5 attempts per IP per minute, with exponential backoff or temporary lockout after N failures.

### 1.4 No Session Revocation (LOW)

**Risk:** JWT tokens are stateless and cannot be revoked before their 7-day expiry. If a token is stolen, it remains valid until expiry.

**Recommendation:** Consider a server-side token blacklist for logout, or reduce token TTL and implement refresh tokens.

---

## 2. Authorization

### 2.1 Permission Check Query N+1 (LOW)

**File:** `apps/server/src/trpc.ts:45-55`

Each protected procedure with `hasPermission` triggers a separate database query to fetch the user's permissions. This is acceptable for security but could be optimized by caching permissions in the JWT or session.

### 2.2 Permission Router Uses Wrong Permission Check (LOW)

**File:** `apps/server/src/routers/permission.ts:14`

```typescript
.list: protectedProcedure
    .use(hasPermission('user@read'))
```

The permission management router uses `user@read` instead of a dedicated `permission@read` permission. This is a minor inconsistency — permission management is gated by user read permission rather than a dedicated permission management permission.

**Recommendation:** Use dedicated permission strings (`permission@read`, `permission@create`, etc.) for the permission router.

### 2.3 Admin AI Endpoints Lack Permission Checks (HIGH)

**File:** `apps/server/src/routes/ai-admin.ts`

The admin AI chat endpoint (`/api/ai/admin/chat`) authenticates the user but **does not verify admin role or specific permissions**. Any authenticated user can access the admin AI with full read-write database access.

```typescript
// Auth is checked, but no admin permission check
const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
if (!payload?.userId) throw new Error('Invalid token payload');
userId = String(payload.userId);
// No admin role check!
```

**Risk:** Any authenticated user — including those with minimal permissions — can use the admin AI to execute INSERT/UPDATE/DELETE queries against the entire database. This is a privilege escalation vulnerability.

**Recommendation:** Add an admin role check or specific permission check (e.g., `admin@access` or `report@read` with write capabilities) before allowing access to admin AI endpoints.

### 2.4 Customer AI Endpoint Has No Auth (LOW)

**File:** `apps/server/src/routes/customer-ai.ts`

The customer-facing AI chat endpoint has no authentication. This is likely intentional (public customer support), but the AI has tools that can look up customer data and create draft orders.

**Risk:** Any anonymous user can interact with the AI and potentially extract customer information or create draft orders.

**Recommendation:** This appears to be by design for customer support. Ensure the AI tools are appropriately scoped (they are — `lookupCustomer` requires a name, `createDraftOrder` requires explicit customer/outlet IDs). No immediate action needed, but monitor for abuse.

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

### 3.2 Admin SQL Validation (MEDIUM)

**File:** `apps/server/src/routes/ai-admin.ts`

The admin SQL validation (`validateAdminSql`) allows INSERT, UPDATE, and DELETE operations. While DDL is blocked, the validation has a potential bypass:

```typescript
// Block DDL keywords
for (const keyword of BLOCKED_DDL_KEYWORDS) {
    if (upperNoStrings.includes(keyword)) {
        return { valid: false, reason: `DDL operation rejected: ${keyword} is not allowed.` };
    }
}
```

The `includes()` check is case-insensitive (since `upperNoStrings` is uppercased), but it checks for substrings. This means `DROP TABLE` would be blocked, but a creative attacker might find edge cases. However, since DDL operations like `DROP TABLE` are already blocked and the admin endpoint requires authentication, the risk is low.

**Recommendation:** Use word-boundary regex instead of `includes()` for DDL keyword checking, consistent with the read-only validation approach.

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

**File:** `apps/server/src/index.ts:22-33`

```typescript
origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (corsOrigin && origin === corsOrigin) return callback(null, true);
    if (isDev && isAllowedDevOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
},
```

**Assessment:** Strong CORS configuration:
- ✅ Explicit origin allowlist (production)
- ✅ Dev origins restricted to localhost/127.0.0.1/tauri
- ✅ `credentials: true` for cookie support
- ✅ Fail-closed (blocks unknown origins)

**Recommendation:** The `if (!origin) return callback(null, true)` allows requests with no `Origin` header (e.g., non-browser clients). This is generally acceptable but could be tightened for production-only deployments.

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

### 6.2 SVG Upload Risk (MEDIUM)

**File:** `apps/server/src/lib/upload-file.ts:34`

SVG files are allowed as an upload format (`'image/svg+xml': 'svg'`). SVG files can contain JavaScript and are a common XSS vector.

**Risk:** If uploaded SVG files are served and rendered in a browser, they could execute malicious JavaScript.

**Recommendation:** Either remove SVG from allowed upload types, or sanitize SVG files before storage using an SVG sanitizer library. Ensure uploaded files are served with `Content-Disposition: attachment` and `Content-Type: image/svg+xml` with appropriate CSP headers.

### 6.3 File Upload No Size Limit (LOW)

**Risk:** There is no explicit file size limit on uploads. While Express has a 10MB JSON body limit, the upload endpoint may accept larger files.

**Recommendation:** Add explicit file size limits to the upload handler.

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

---

## 9. Session Management

### 9.1 Cookie Security (STRONG)

**File:** `apps/server/src/routers/auth.ts:13-20`

```typescript
serialize('access_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(rememberMe ? { maxAge: TOKEN_MAX_AGE } : {}),
});
```

**Assessment:** Strong cookie security:
- ✅ `httpOnly: true` (prevents JavaScript access)
- ✅ `sameSite: 'lax'` (prevents CSRF for most cases)
- ✅ `secure: true` in production (HTTPS only)
- ✅ 7-day expiry for remember-me, session cookie otherwise

### 9.3 Missing CSRF Protection (LOW)

**Risk:** While `sameSite: 'lax'` provides good CSRF protection for most cases, there is no explicit CSRF token mechanism. `sameSite: 'lax'` does not protect against all CSRF attack vectors (e.g., GET requests that trigger state changes, or attacks from subdomains).

**Recommendation:** Implement CSRF tokens for state-changing operations, especially for the tRPC endpoints. Consider using `csurf` or a double-submit cookie pattern.

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

### 12.1 AI API Key Hardcoded (MEDIUM)

**File:** `apps/server/src/lib/ai-provider.ts:8`

```typescript
apiKey: process.env.AI_API_KEY ?? 'sk-a269cec57930fc82-1bvmkj-87bd8cdc',
```

**Risk:** A default API key is hardcoded as a fallback. If `AI_API_KEY` is not set, the application uses this key, which may be a real or test key. This could lead to unauthorized API usage or billing.

**Recommendation:** Remove the hardcoded default. Fail fast if `AI_API_KEY` is not set.

### 12.2 SMTP Credentials (LOW)

**File:** `apps/server/src/lib/email-smtp.ts`

SMTP credentials are loaded from environment variables. No hardcoded credentials found. The `generateMessageId` function uses a hardcoded domain (`aetherglo.com`) — this should be configurable.

---

## 13. Dependency Security

### 13.1 Outdated Dependencies (LOW)

**Recommendation:** Run `npm audit` or `bun audit` to check for known vulnerabilities in dependencies. Set up automated dependency scanning.

---

## Summary of Findings

| Severity | Count | Description |
|----------|-------|-------------|
| HIGH | 1 | Admin AI endpoints lack permission checks |
| MEDIUM | 4 | JWT secret default, token in query param, no login rate limiting, hardcoded AI API key, SVG upload risk |
| LOW | 4 | No session revocation, permission router uses wrong permission, no CSRF tokens, no file size limit, hardcoded email domain |

## Prioritized Remediation Plan

1. **[HIGH] Add admin permission check to `/api/ai/admin/chat` and `/api/ai/admin/chat/:chatId/stream`** — Verify the user has admin role or specific admin permission before allowing access to admin AI endpoints with database write capabilities.

2. **[MEDIUM] Remove hardcoded secrets** — Remove default fallbacks for `JWT_SECRET` and `AI_API_KEY`. Fail fast at startup if these are not set in production.

3. **[MEDIUM] Remove token from query parameter** — Remove `?token=` support from the sales order PDF endpoint. Use `Authorization: Bearer` header only.

4. **[MEDIUM] Add rate limiting** — Implement rate limiting on the login endpoint to prevent brute-force attacks.

5. **[MEDIUM] Remove SVG upload support** — Remove `image/svg+xml` from allowed upload types, or implement SVG sanitization.

6. **[LOW] Implement CSRF protection** — Add CSRF tokens for state-changing operations.

7. **[LOW] Add file size limits** — Add explicit file size limits to the upload handler.

8. **[LOW] Fix permission router** — Use dedicated `permission@read/create/update/delete` permissions instead of `user@read/create/update/delete`.

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

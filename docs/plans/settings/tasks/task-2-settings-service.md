# Task 2: Settings service (DB read + env fallback + cache)

**Files:**
- Create: `apps/server/src/lib/settings-service.ts`

**Interfaces:**
- Consumes: `AppSetting`/`UserSetting` Prisma models (T1), `prisma` from `./prisma.js`.
- Produces: `getAppSettings(db)`, `getUserSettings(db, userId)`, `setAppSettings(db, patch, updatedBy)`, `setUserSettings(db, userId, patch)`, `getSettingValue(db, key)` — consumed by T3 router, T4 env-consumer refactors, T10 tests.

## Frozen contract

### Behavior
- **App settings** stored as rows in `app_settings` keyed by dotted key, e.g. `ai.baseUrl`, `smtp.pass`, `company.name`. `value` is JSON.
- **Read path**: `getAppSettings(db)` returns a fully-typed `AppSettings` object. For each field: DB value wins if present; otherwise fall back to `process.env` (mapping below); otherwise default.
- **Secrets**: `ai.apiKey` and `smtp.pass` are NEVER returned in plaintext. `getAppSettings` returns them as `{ hasValue: boolean }` — the router masks them. The service keeps the real value internally for consumers (see `getSettingValue`).
- **Write path**: `setAppSettings(db, patch, updatedBy)` upserts each provided key. For secret keys, empty string `''` or `undefined` = keep existing (skip write). Non-empty = write new value.
- **Cache**: module-level `Map<string, { value: unknown; at: number }>` with 30s TTL for app settings reads (avoid DB hit per AI call). `setAppSettings` invalidates the cache. `getSettingValue` bypasses cache for secrets? No — cache is fine, TTL 30s.
- **Env fallback mapping** (DB key → env var → default):
  - `ai.baseUrl` → `AI_BASE_URL` → `http://localhost:20128/v1`
  - `ai.apiKey` → `AI_API_KEY` → `''`
  - `ai.model` → `AI_MODEL` → `chatbot`
  - `embedding.baseUrl` → `EMBEDDING_BASE_URL` → `''`
  - `embedding.apiKey` → `EMBEDDING_API_KEY` → `''`
  - `embedding.model` → `EMBEDDING_MODEL` → `''`
  - `embedding.dimensions` → `EMBEDDING_DIMENSIONS` → `1536`
  - `embedding.similarityThreshold` → `EMBEDDING_SIMILARITY_THRESHOLD` → `0.5`
  - `smtp.host` → `SMTP_HOST` → `smtp-relay.brevo.com`
  - `smtp.port` → `SMTP_PORT` → `587`
  - `smtp.user` → `SMTP_USER` → `''`
  - `smtp.pass` → `SMTP_PASS` → `''`
  - `smtp.from` → `SMTP_FROM` → `AetherGlo Sales <info@aetherglo.com>`
  - `smtp.domain` → `SMTP_DOMAIN` → `aetherglo.com`
  - `emailAgent.name` → `EMAIL_AGENT_NAME` → `Andi`
  - `emailAgent.title` → `EMAIL_AGENT_TITLE` → `Sales Representative`
  - `emailAgent.company` → `EMAIL_AGENT_COMPANY` → `AetherGlo`
  - `emailAgent.maxThreadChars` → `EMAIL_CONCIERGE_MAX_THREAD_CHARS` → `12000`
  - `system.aiSystemEmail` → `AI_SYSTEM_EMAIL` → `ai-system@mail.com`
  - `system.systemUserId` → `SYSTEM_USER_ID` → `''`
  - `company.*` → no env → defaults `''` / `AetherGlo` / `ERP Sales`
  - `general.*` → no env → defaults (currencySymbol `$`, currencyCode `USD`, fiscalYearStartMonth `1`, defaultPageSize `10`, passwordMinLength `6`, auditLogRetentionDays `365`)

### Personal settings
- Stored as rows in `user_settings` keyed by `(userId, key)`.
- `getUserSettings(db, userId)` returns typed `UserSettings` with defaults (locale `en`, theme `light`, defaultPageSize `10`, notifications `{ inApp: true, emailDigest: false }`).
- `setUserSettings(db, userId, patch)` upserts provided keys.

### Key helpers
- `getSettingValue(db, key: string): Promise<unknown>` — returns the effective value (DB → env → default) for a single dotted key. Used by env-consumer refactors (T4) to fetch `ai.apiKey`, `smtp.pass`, etc. at call time.
- `getSecretValue(db, key: string): Promise<string>` — returns the real secret value (DB → env → default) for `ai.apiKey` / `smtp.pass`. Used ONLY server-side by consumers, never exposed via router.

**Steps:**
- [ ] Implement service with typed get/set + env fallback + 30s cache
- [ ] Implement secret write-only semantics
- [ ] Implement `getSettingValue` / `getSecretValue` helpers
- [ ] `bunx tsc --noEmit` in apps/server

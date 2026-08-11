# Task 4: Refactor env consumers to read from DB settings

**Files:**
- Modify: `apps/server/src/lib/ai-provider.ts`
- Modify: `apps/server/src/lib/ai-embedding.ts`
- Modify: `apps/server/src/lib/email-smtp.ts`
- Modify: `apps/server/src/lib/email-concierge.ts`
- Modify: `apps/server/src/lib/email-concierge-tools.ts`
- Modify: `apps/server/src/lib/customer-ai-tools.ts`

**Interfaces:**
- Consumes: `getSettingValue` / `getSecretValue` from `./settings-service.js` (T2).
- Produces: no new exports — behavior-preserving refactor so runtime config reads DB first, env fallback.

## Frozen contract

### Pattern
Each consumer becomes **async** where needed, fetching effective values at call time via `getSettingValue(db, key)` / `getSecretValue(db, key)`. Keep the existing exported function signatures where possible; where a function is currently sync and used in async contexts, convert to async and update call sites (grep for imports).

### ai-provider.ts
- `chatModel` is currently a module-level singleton built from env. Refactor to a lazy async getter:
  ```ts
  export async function getChatModel(db: DbClient) {
    const baseUrl = String(await getSettingValue(db, 'ai.baseUrl')).replace(/\/$/, '');
    const apiKey = await getSecretValue(db, 'ai.apiKey');
    const model = String(await getSettingValue(db, 'ai.model'));
    const devtoolsEnabled = process.env.NODE_ENV !== 'production' && (process.env.AI_DEVTOOLS_ENABLED ?? 'true') !== 'false';
    const provider = createOpenAICompatible({ name: '9router', baseURL: baseUrl, apiKey, supportsStructuredOutputs: true });
    const baseModel = provider(model);
    return devtoolsEnabled ? wrapLanguageModel({ model: baseModel, middleware: devToolsMiddleware() }) : baseModel;
  }
  ```
- Keep `chatModel` export as a deprecated sync alias reading env only (for any non-DB call sites) OR update all call sites to `await getChatModel(prisma)`. **Grep all `chatModel` imports** and update them. Prefer updating call sites to the async getter.

### ai-embedding.ts
- `isEmbeddingConfigured()`, `getEmbeddingModelId()`, `getEmbeddingDimensions()`, `getEmbeddingSimilarityThreshold()`, `requireEmbeddingConfig()`, `getEmbeddingModel()`, `generateEmbedding()`, `embedMany`-based functions → read via `getSettingValue(db, 'embedding.*')`. Convert to async where they currently read env synchronously. Update call sites (grep `isEmbeddingConfigured`, `generateEmbedding`, `getEmbeddingModelId`, etc.).
- Keep `EMBEDDING_COLUMN_DIMENSIONS = 1536` constant (pgvector column is fixed).

### email-smtp.ts
- `createSmtpTransport()` → async, reads `smtp.host/port/user/pass` via `getSettingValue`/`getSecretValue`.
- `sendSmtpEmail()` → async (already async), fetch `smtp.from` + `smtp.domain` via settings.
- `generateMessageId(domain?)` — keep sync, default domain from settings where caller passes it; update `sendSmtpEmail` to pass settings domain.
- Update call sites (grep `createSmtpTransport`, `sendSmtpEmail`, `generateMessageId`).

### email-concierge.ts
- `MAX_THREAD_CHARS`, `EMAIL_AGENT_NAME/TITLE/COMPANY` module constants → move into the concierge run path: fetch via `getSettingValue(db, 'emailAgent.*')` at run time. Keep constants as env-only fallbacks for tests (tests mock `sendSmtpEmail`; check `apps/server/src/tests/lib/email-concierge.test.ts` still passes — it may need the constants exported).

### email-concierge-tools.ts + customer-ai-tools.ts
- `resolveSystemUserId()` → fetch `system.aiSystemEmail` + `system.systemUserId` via `getSettingValue(db, 'system.*')` instead of `process.env.AI_SYSTEM_EMAIL` / `SYSTEM_USER_ID`.

### Critical
- **Do NOT break tests.** `apps/server/src/tests/lib/ai-embedding.test.ts` sets `process.env.EMBEDDING_*` directly and expects sync behavior. Keep env fallback working: when no DB row exists, `getSettingValue` returns the env value, so tests that set env still pass. If a function becomes async, update the test to `await` it.
- Run `bunx vitest run` for affected test files after refactor.

**Steps:**
- [ ] Refactor ai-provider.ts (async getter + update call sites)
- [ ] Refactor ai-embedding.ts (async + update call sites)
- [ ] Refactor email-smtp.ts (async + update call sites)
- [ ] Refactor email-concierge.ts + tools
- [ ] Refactor customer-ai-tools.ts
- [ ] `bunx tsc --noEmit` + run affected tests

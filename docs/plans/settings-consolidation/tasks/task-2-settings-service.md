### Task 2: Settings service — drop `embedding.*` + `emailAgent.name` from fallbacks and masked shape

**Files:**
- Modify: `apps/server/src/lib/settings-service.ts`
- Test: ownership of `apps/server/src/tests/routers/settings.test.ts` belongs to Task 5 — do NOT touch it.

**Interfaces:**
- Consumes: updated `AppSettings` type from Task 1
- Produces: `MaskedAppSettings` without `embedding` group and without `emailAgent.name`

**Frozen contract:**
- Remove the 5 `embedding.*` entries from `APP_SETTING_FALLBACKS` (`embedding.baseUrl`, `embedding.apiKey`, `embedding.model`, `embedding.dimensions`, `embedding.similarityThreshold`).
- Remove `'emailAgent.name'` from `APP_SETTING_FALLBACKS`.
- Remove `'embedding.apiKey'` from `SECRET_KEYS`.
- Remove the `embedding: {...}` block from `MaskedAppSettings` type and from `getAppSettings()` return.
- Remove `name: read('emailAgent.name') as string` from `getAppSettings()` return.
- Keep `emailAgent.title`, `emailAgent.company`, `emailAgent.maxThreadChars` intact.

**Steps:**
- [ ] Step 1: Edit `apps/server/src/lib/settings-service.ts` per contract.
- [ ] Step 2: Run `bun run check-types` at repo root.
- [ ] Step 3: Self-review — no remaining `embedding.` or `emailAgent.name` references in this file.

**Note:** Do NOT touch `ai-embedding.ts`, `rag.ts`, `email-concierge.ts`, `apps/server/src/tests/routers/settings.test.ts`, or client files — separate tasks. The test file is owned by Task 5.

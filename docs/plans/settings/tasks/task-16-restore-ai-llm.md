### Task 16: Restore AI LLM settings UI (api key, embedding, rate limit)

**Files:**
- Modify: `apps/client/src/pages/settings/AppSettingsPage.tsx` ONLY (restore AI sections, keep new taxonomy sections untouched)
- DO NOT touch: `packages/schemas/*`, `apps/server/**`, `apps/client/src/locales/*` (strings already present + `field_ai_global_rpm` already reworded for nullable), `apps/client/src/routes.tsx`, `apps/client/src/pages/settings/UserSettingsPage.tsx`

**Interfaces:**
- Consumes (verbatim audit T15):
  - Backend AI surface NOT deleted: `appSettingsSchema`, `settings.get/update/public`, `settings-service` fallbacks intact (only `ai.userRpm` intentionally removed with rate-limiter rewrite).
  - Deletion is UI-only: workdir `AppSettingsPage.tsx` dropped HEAD sections, rebound to `getApp/updateApp`. Old procedures have zero client callers.
  - Runtime-required AI LLM keys (frozen, 9): `ai.baseUrl` · `ai.apiKey` (secret) · `ai.model` · `ai.multimodalEnabled` · `ai.globalRpm` (nullable, null=unlimited) · `ai.embeddingBaseUrl` · `ai.embeddingApiKey` (secret) · `ai.embeddingModel` · `ai.embeddingDimensions`. Excluded: `ai.userRpm` (zero readers), `embedding.similarityThreshold` (orphan, out of scope).
  - `seed.ts` additions-only, no restore needed. Locales intact except deleted `field_ai_user_rpm` (do NOT restore).
- Produces: restored AI sections bound to legacy procedures, keys wired, gating preserved.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/settings/PLAN.md`
- `git show HEAD:apps/client/src/pages/settings/AppSettingsPage.tsx` (HEAD AI sections = restore source)
- current `apps/client/src/pages/settings/AppSettingsPage.tsx`
- `packages/schemas/src/settings.ts` (`appSettingsSchema.ai` key names — confirm, do NOT edit)
- `apps/server/src/lib/settings-service.ts` (fallback names — confirm only)
- consumers (confirm-only): `apps/server/src/lib/ai-provider.ts`, `ai-embedding.ts`, `rate-limiter.ts` (`readGlobalRpm` nullable)

**Frozen contract:**
- Resource: `settings` (`app.*` legacy store via `settings.get/update`, NOT `getApp/updateApp` — different table. Restored AI sections MUST bind to legacy `settings.get`/`settings.update` with `settings@read`/`settings@update` gating via existing `hasPermissionAtom` (sys-admin bypass from T14 kept). New General/Appearance/Notifications/Security sections stay on `getApp/updateApp` untouched.
- Keys: the 9 frozen keys above ONLY. Do NOT re-add `ai.userRpm`. Do NOT add Company section. `ai.embeddingDimensions`: expose as numeric field with hint pattern (it gates `vector(1536)` match) — read-mostly, default 1536. If HEAD had no UI/locale for it, reuse `secret_hint`-style hint wording, no new locale keys if possible; if a key is unavoidable, add `settings.app.*` key in BOTH en+id.
- `ai.globalRpm` semantics: NEW nullable (empty = unlimited, 1–600). Reuse already-updated locale `field_ai_global_rpm` + `hint_ai_rate_limits` as-is.
- Secrets (`ai.apiKey`, `ai.embeddingApiKey`): masked `{ hasValue }` + `secret_hint` pattern exactly as at HEAD — never render secret values.
- Design law (FROZEN): docs/design-system
- Tokens: apps/client/src/index.css
- Motion: apps/client/src/lib/motion.ts
- UI craft owner: frontend-engineer + ui-ux-pro-max
- Client rules: tRPC vanilla only, semantic tokens, functional components, `intl.formatMessage` only. No visual redesign — restore HEAD layout/sections.

**Steps:**
- [ ] Step 1: Re-add AI provider section (baseUrl/apiKey/model/multimodal toggle/globalRpm-nullable) + embedding subsection (baseUrl/apiKey/model/dimensions) sourced from HEAD version, bound to legacy `get/update`.
- [ ] Step 2: Keep sys-admin bypass working (use `hasPermissionAtom` for `settings@read/@update` — do NOT hardcode role checks in page).
- [ ] Step 3: `bun run check-types` client scope, self-review. DO NOT run vitest/playwright (QE owns tests).

**Report back (mandatory):**
End with `## Produces` listing restored sections + keys wired + procedure binding (`settings.get/update`) + gating per section + any locale keys added (or "none").

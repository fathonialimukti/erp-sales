# Settings Consolidation — Context Pack

## Goal
1. **Remove the Embeddings settings section** from the App Settings page. Embeddings should no longer be a separately-configurable provider — the app should use the **AI API provider** (`ai.*` settings) for everything, including embeddings.
2. **Remove the `Name` field** from the Email Agent card. The email agent's name should not be user-configurable.
3. **Rename the app settings URL** from `/settings/app` to `/settings/app-settings`.

## Stack
- Client: React 19 + Vite + Tauri, Tailwind v4 + shadcn Aurora, tRPC vanilla client, react-intl
- Server: Express + tRPC v11 + Prisma (PostgreSQL), Zod shared schemas in `@repo/schemas`
- Runtime: Bun + Turborepo

## Key files
| File | Role |
|------|------|
| `packages/schemas/src/settings.ts` | Zod `appSettingsSchema` — has `embedding` group + `emailAgent.name` |
| `apps/server/src/lib/settings-service.ts` | Env fallbacks, `MaskedAppSettings`, `getAppSettings` |
| `apps/server/src/lib/ai-embedding.ts` | Embedding provider (reads `embedding.*` settings) |
| `apps/server/src/lib/rag.ts` | Hybrid RAG — vector path uses `ai-embedding.ts` |
| `apps/server/src/lib/email-concierge.ts` | Email agent — reads `emailAgent.name` |
| `apps/server/src/routers/settings.ts` | Settings router (no change needed) |
| `apps/server/src/tests/routers/settings.test.ts` | Settings router tests |
| `apps/server/src/tests/lib/ai-embedding.test.ts` | Embedding lib tests |
| `apps/client/src/pages/settings/AppSettingsPage.tsx` | App settings page (Embeddings card + agent Name field) |
| `apps/client/src/locales/en.json` / `id.json` | i18n keys |
| `apps/client/src/routes.tsx` | Route `settings/app` → `settings/app-settings` |
| `apps/client/src/constants/nav-menu.ts` | Nav href `/settings/app` |
| `apps/client/src/components/Sidebar.tsx` | Sidebar admin section href list |

## Frozen contract
- **Embeddings removed from UI + schema.** Embedding config now derives from the AI provider (`ai.baseUrl` / `ai.apiKey` / `ai.model`). The `embedding.*` DB/env settings are **deprecated** — code must stop reading them and fall back to `ai.*`.
- **Email agent name removed from UI + schema.** `emailAgent.name` is no longer configurable. The concierge keeps a fixed default name (`EMAIL_AGENT_NAME` env, default `'Andi'`).
- **Route:** `/settings/app` → `/settings/app-settings` (routes.tsx, nav-menu.ts, Sidebar.tsx).
- **i18n:** remove `settings.app.section_embedding`, `settings.app.field_embedding_*`, `settings.app.field_agent_name` keys from `en.json` + `id.json`.
- **Design law (FROZEN):** `docs/design-system/` · Tokens: `apps/client/src/index.css` · Motion: `apps/client/src/lib/motion.ts` · UI craft owner: Frontend Engineer + ui-ux-pro-max.

## Reference
- Reference router: `apps/server/src/routers/region.ts`
- Reference pages: `apps/client/src/pages/Region*.tsx`

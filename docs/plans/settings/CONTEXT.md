# Settings Feature — Context Pack

## Goal
Two settings surfaces backed by a key-value store in PostgreSQL:
1. **Personal settings** (`/settings`) — self-scoped prefs for the logged-in user.
2. **App settings** (`/settings/app`) — org-wide config, admin-only (`settings@update`), including **secrets** (AI key, SMTP pass) migrated from `.env`.

## Stack facts (verified)
- Server: Express + tRPC v11 + Prisma 7 (PostgreSQL, ULID ids). Port 10022.
- Client: React 19 + Vite + Tauri, Tailwind v4 + shadcn Aurora (`@/components/ui/*`), tRPC vanilla client (`trpcClient`), react-intl, jotai atoms.
- Shared Zod: `packages/schemas` (`@repo/schemas`).
- Prisma: `apps/server/src/prisma/schema.prisma`, generated client at `apps/server/src/prisma/generated/client` (imported as `../prisma/generated/client`). **No migrations dir exists** — schema is applied via `bun prisma db push` (`db:all` script). Do NOT create migrations; use `db push`.
- Permission strings: `resource@action`. Seed in `apps/server/src/prisma/seed.ts` `PERMISSIONS` array + `ROLES` patterns. System Admin pattern `"*"` auto-grants everything.
- Router registration: `apps/server/src/router.ts` (import + `appRouter` entry).
- Server locale messages: `apps/server/src/lib/locale.ts` (en + id maps, `getMessage(ctx.locale, key)`).
- Client i18n: `apps/client/src/locales/en.json` + `id.json` (flat dotted keys).
- Client routes: `apps/client/src/routes.tsx` (kebab-case URLs).
- Nav: `apps/client/src/constants/nav-menu.ts` (`NAV_MENU`) + `apps/client/src/components/Sidebar.tsx` (TWO gates: permission filter AND hardcoded section href arrays — new hrefs MUST be added to a section array or they silently vanish).
- Avatar menu: `apps/client/src/components/UserAvatarMenu.tsx` — Settings item currently `navigate("/users")` (placeholder).
- Client auth: `apps/client/src/lib/useAuth.ts` (`useAuthBootstrap`), atoms in `apps/client/src/lib/atoms.ts` (`authUserAtom`, `hasPermissionAtom`, `themeModeAtom`, `localeAtom`).
- Client locale: `apps/client/src/lib/locale.ts` (localStorage `app-locale` + cookie `app-locale`), `persistLocale()`.
- Server env consumers to refactor (read from DB settings with env fallback):
  - `apps/server/src/lib/ai-provider.ts` — `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_DEVTOOLS_ENABLED`
  - `apps/server/src/lib/ai-embedding.ts` — `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY`, `EMBEDDING_DIMENSIONS`, `EMBEDDING_SIMILARITY_THRESHOLD`
  - `apps/server/src/lib/email-smtp.ts` — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_DOMAIN`
  - `apps/server/src/lib/email-concierge.ts` — `EMAIL_AGENT_NAME`, `EMAIL_AGENT_TITLE`, `EMAIL_AGENT_COMPANY`, `EMAIL_CONCIERGE_MAX_THREAD_CHARS`
  - `apps/server/src/lib/email-concierge-tools.ts` + `apps/server/src/lib/customer-ai-tools.ts` — `AI_SYSTEM_EMAIL`, `SYSTEM_USER_ID`
- Server boot: `apps/server/src/index.ts` (Express). `apps/server/src/lib/prisma.ts` (PrismaPg adapter, `DATABASE_URL` from env — stays env).

## Design law (FROZEN)
- `docs/design-system/` — Aurora Commerce. Tokens: `apps/client/src/index.css`. Motion: `apps/client/src/lib/motion.ts`.
- UI craft owner: Frontend Engineer + `ui-ux-pro-max`. No design essay in contracts.
- Settings module color: **`settings`** hue 300° (violet, distinct from ai 300°? — use **280° planning** is taken; use **`settings` 320° magenta**). Register in 4 places: `index.css` `:root` + `.dark` `--module-settings`, `@theme inline` `--color-module-settings`, `apps/client/src/types/module.ts` (`ModuleKey` + `KNOWN_MODULES`), `Sidebar.tsx` `HREF_MODULE`.

## Security rules
- Secrets (`ai.apiKey`, `smtp.pass`) are **write-only**: `get` returns `hasValue` boolean + masked `••••••` (never the real value). `update` accepts a real value; empty string = keep existing.
- App settings mutations require `settings@update`. Reads require `settings@read`.
- Personal settings are self-scoped: router forces `userId = ctx.user.userId`; no permission needed.

## Frozen contract
```
Resource: settings (app) + userSettings (personal)
Permission strings: settings@read | settings@update
Router namespace: trpcClient.settings.{get, update} + trpcClient.userSettings.{get, update}
Schema: packages/schemas/src/settings.ts → packages/schemas/src/index.ts
Router: apps/server/src/routers/settings.ts → apps/server/src/router.ts
Service: apps/server/src/lib/settings-service.ts (DB read + env fallback + cache)
Pages: apps/client/src/pages/settings/SettingsPage.tsx (personal) + AppSettingsPage.tsx (app)
i18n: settings.* in en.json + id.json
Routes: /settings (personal), /settings/app (app)
Reference router: apps/server/src/routers/region.ts
Reference pages: apps/client/src/pages/Region*.tsx
```

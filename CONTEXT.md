# CONTEXT.md — Project DNA (erp-sales)

Single source of truth for agents working in this repo. Companion law:
`AGENTS.md` (agent bottom line), `PRODUCT.md` (product law),
`docs/ARCHITECTURE.md` (system map), `docs/design-system/DESIGN.md` (UI law).
Copilot mirror: `.github/copilot-instructions.md`.

Provenance (consumes, verbatim):
- T1R T4: prose clean — 0 slop-vocab hits (robust/comprehensive/utilize/leverage/seamless/cutting-edge/delve/tapestry) across PRODUCT/ARCHITECTURE/DESIGN/README. 137 divider/banner comments + ponytail: markers to debt ledger (harvest, do not blind-delete). i18n key sets en/id in sync (count has since moved — see ALWAYS below).
- T2 done (server, do NOT touch): notification gated + scoped + logged, dashboard.sales gated report@read, user.update currentId alias, lib/ulid.ts generateUlid, landing.ts deleted, seed added notification@update + applicationLog@read, as-any typed.
- T3 done (client, do NOT touch): dead styles/* deleted, DomainIcon + useDetailForm created, SalesOrder.css 2900→530, toasts canonical (useToast/sonner, ToastContainer removed), AiAssistant logs removed, icon hex → vars, UserFormPage sends currentId, new key settings.app.field.accentColor_placeholder en+id.

## STACK (exact)

- Runtime/tooling: `bun@1.3.14` (packageManager), Turborepo `^2.10.7`, TypeScript `^6.0.0` root / `~7.0.2` client / `^7.0.2` server, Prettier `^3.9.6`.
- Client (`apps/client`, port 10021): React `^19.2.8`, Vite `^8.2.0`, Tailwind `^4.3.3` (+ `@tailwindcss/vite`), shadcn `^4.16.0`, `radix-ui ^1.6.7` / `@base-ui/react ^1.6.0`, `motion ^12.43.0` (`motion/react`), tRPC client `^11.18.0` (vanilla only), TanStack Query `^5.101.4` / Form `^1.33.2` / Table `^8.21.3`, jotai `^2.20.2`, `react-intl ^10.1.18` (en+id), `react-router ^8.3.0`, recharts `3.10.1`, Tauri api `^2.11.1`, sonner `^2.0.7`, Zod `^4.4.3`, `lucide-react ^1.28.0`, Inter Variable (`@fontsource-variable/inter`).
- Server (`apps/server`, port 10022, pm2 `ecosystem.config.js`): Express `^5.2.1`, tRPC server `^11.18.0`, Prisma `^7.9.1` (+ `@prisma/adapter-pg`, PostgreSQL + pgvector, pool 10), Zod `^4.4.3`, AI SDK `ai ^7.0.42` + `@ai-sdk/openai ^4.0.24` / `openai-compatible ^3.0.17`, bcrypt `^6.0.0`, jsonwebtoken `^9.0.3`, PDFKit `^0.19.1`, nodemailer `^9.0.3`.
- Shared: `@repo/schemas` (Zod 4, shared client/server validation), `@repo/eslint-config`, `@repo/typescript-config`.

## NAMING

- Route URLs kebab-case (`/sales-order`, `/sku-category`); a camelCase URL literal 404s.
- tRPC namespaces camelCase (`salesOrder.list`); component names PascalCase.
- Permission strings always `resource@action` (never `resource_action`); camelCase resources exist (`skuCategory@read`) alongside kebab (`sales-order@read`) — keep nav (`apps/client/src/constants/nav-menu.ts`) + server in sync.
- Imports use `.js` extensions; Prisma client from `../lib/prisma.js`; transactions via `ctx.db`.
- `update*Schema` requires `currentId` (UserFormPage sends `currentId`).

## ERRORS

- Log-then-rethrow, never silent. Server: structured JSON to stdout (`lib/logger.ts`) + errors/warnings/security events into `app_logs` (`lib/app-log.ts`, in-app System Logs via `log@read`, 30d retention).
- Client: friendly Prisma error translation (`lib/friendlyError.ts`); client error reports → `/api/log/client` → `app_logs`.
- Strict TypeScript: `strict` + `noUncheckedIndexedAccess` (`packages/typescript-config/base.json`). `exactOptionalPropertyTypes` is **not** enabled — see `CHANGELOG.md` → Known gaps. No bare `!` without a safety comment.

## NEVER

- Raw SQL (only exception: read-only guard `validateReadOnlySql` for AI DB access), magic strings (permission/i18n keys via constants), `any` (typed instead), `console.log` in prod (use logger).
- Gray text of any kind (`text-gray/slate/zinc/neutral/stone-*`, gray hex, gray `muted-foreground`); gray UI surfaces; raw hex in JSX (use semantic Tailwind tokens + CSS vars).
- Mint / module / chart color as primary CTA; module rainbow on table cells; gradient banners; backdrop-blur floaty surfaces; decorative form gradients; pie/donut/3D default charts; dark-by-default dense forms.
- Emoji icons (Lucide = chrome only; custom SVG = nav modules only), cookie-cutter README, emoji section headers, checkmark lists.

## ALWAYS

- i18n keys in **both** `en.json` and `id.json` (2133 keys, pruned to the ids the code actually references, key sets in sync; `bun scripts/check-i18n.mjs` + `bun scripts/sync-i18n.mjs --check`, both CI-enforced); all user-visible strings via `intl.formatMessage`. The count is a moving number — re-measure rather than trusting a doc; `check-i18n.mjs` also warns how many values still await Indonesian (209 of 2133 are byte-identical: 120 legitimately identical loanwords/brands/formats, 89 probably untranslated — the old "11" figure was a single-word heuristic that hid 198).
- ULID string ids everywhere (`@id` ULID; `generateUlid` in `apps/server/src/lib/ulid.ts`).
- Every mutation: `hasPermission('resource@action')` + `logActivity` (+ log-detail helpers); every multi-write: `prisma.$transaction` + conditional `updateMany` state guard; doc numbers via advisory lock in-tx + unique constraint.
- Lists via `createListInputSchema` / pagination helpers; every private module wrapped in `RequirePermission('resource@read')`.
- Client data via tRPC vanilla only (`trpcClient.*` in `queryFn`); functional components; `data-ai-context` on page roots.
- UI craft per `docs/design-system/DESIGN.md` + live tokens (`apps/client/src/index.css`) + motion presets (`apps/client/src/lib/motion.ts`); pre-delivery: contrast, focus, ≥44px targets, reduced-motion, empty/loading/error states.

## DOMAIN (per PRODUCT.md)

Field-sales / CRM ERP turning regional execution into a boardroom-trustworthy
decision surface: region → area → customer (+contacts) → outlet → SKU visits →
sales orders, plus SKU categories/SKUs, visit logs, action programs, event
proposals, users, roles/permissions, access control, activity log,
notifications, reporting (sales/field/collection/promo, read-only, xlsx+print),
email CRM (inbound + auto-reply), knowledge base (pgvector RAG).
Approval workflows (draft → proposed → approved / rejected) drive sales orders,
action programs, and event proposals; action programs / event proposals use
4-tier approval (area → region → finance → director). Money is right-aligned
`tabular-nums`; KPI deltas carry trend icons + `+/-` semantic color. Single-tenant
multi-role; working language EN + ID.

## BAN LIST (see NEVER; enforced in review)

Slop vocab (0 hits across PRODUCT/ARCHITECTURE/DESIGN/README — keep it so):
robust, comprehensive, utilize, leverage, seamless, cutting-edge, delve, tapestry.
Prose: em-dash density, narrating comments, divider/banner comments —
137 markers harvested to the T1 debt ledger, do NOT blind-delete.

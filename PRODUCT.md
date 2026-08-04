# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Bun + Turborepo monorepo. Client: React 19 + Vite + Tauri desktop wrapper, Tailwind v4 + shadcn Aurora (`@/components/ui/*`), tRPC v11 vanilla client, react-intl. Server: Express + tRPC v11 + Prisma v7 (PostgreSQL, ULID ids). Shared validation: `@repo/schemas` (Zod). Dev run: `bun run dev`. The codebase already answers stack; recorded for future work.

## Users

Primary day-to-day: **industrial / CPG field teams** — field sales reps who visit outlets, log orders and visits, and run action programs against SKUs; and the sales managers who approve sales orders, monitor regional performance, and own reporting. Secondary, evaluate-but-not-operate audience: hiring managers and B2B buyers who judge the product on **trust + scan speed** rather than consumer flash. Working language is English + Bahasa Indonesia (id).

## Product Purpose

A B2B field-sales / CRM ERP that turns regional sales execution (regions → areas → customers → outlets → SKU visits → sales orders) into a boardroom-trustworthy decision surface. Success means a manager can answer "are we ok?" in under two seconds and a rep can execute a visit and submit an order without leaving the workflow.

## Positioning

A **trust-first, boardroom-ready field-sales CRM** that wins on trust and scan speed rather than consumer flash. The differentiating claim a neighbouring product could not truthfully copy: corporate-grade trust cues — at-a-glance KPI strip, dense scannable tables, status-chip clarity, predictable module wayfinding, restrained confident color, and premium light-work-surfaces designed for long order/entry sessions — delivered as one designed system across every CRM domain. (Confirmed by user during init.)

## Operating Context

- Long sessions of order entry, visit logging, and approval triage — light surfaces by default; dark is a live app state, not a fatiguing default-form mode.
- Real work is lists + filters + bulk actions, not marketing pages: dashboard-dense spacing (`p-3` shell, `p-4 md:p-6` main, `gap-3`/`gap-4`).
- Money is right-aligned `tabular-nums`; KPI deltas carry trend icons and `+/-` semantic color.
- Approval workflows (draft → proposed → approved / rejected) drive sales orders, action programs, and event proposals.
- AI is woven into ops: SO extraction, customer-context chat, email concierge auto-reply, an admin AI assistant, and a knowledge base. AI is an ops accelerator, not the brand.
- Permission strings (`resource@action`) gate every menu item and action; the app is single-tenant multi-role.
- Deploy: server on port 10022 via `pm2` (`ecosystem.config.js`); client served by Vite dev / Tauri desktop build. Production DB requires Prisma migrations applied before `start`.

## Capabilities and Constraints

CRM domains (each a tRPC router + React module, with a dedicated wayfinding color):
regions, areas, customers (+ contacts), outlets, SKU categories, SKUs, sales orders (with approval workflow + PDF), visit logs, action programs, event proposals, users, roles/permissions, access control, activity log, notifications, reporting (sales / field / collection / promo, read-only, xlsx + print), email CRM (inbound + auto-reply), knowledge base.

Cross-cutting:
- tRPC v11 end-to-end typesafe; shared Zod schemas in `@repo/schemas`.
- Prisma v7 with driver adapter; client generates to `apps/server/src/prisma/generated` (gitignored) — `prisma generate` is required before `start`.
- ULID string ids; `@id` ULID in schema.
- AI via `ai` SDK v7 + `@ai-sdk/openai` / `openai-compatible`; `system` option renamed to `instructions` (behaviour-preserving).
- All user-visible strings go through react-intl in **both** `en.json` and `id.json`.
- Route URLs are **kebab-case** (`/sku-category`, `/sales-order`, …); tRPC namespaces, permission strings, and component names stay camelCase/PascalCase. A camelCase URL literal 404s.

Strict TypeScript with `exactOptionalPropertyTypes`. Permission strings always `resource@action` (never `resource_action`). No bare `!` without a safety comment.

Undecided / not yet established: any external compliance certification beyond WCAG AA self-target; any named anchor customer or case study; a specific data-residency or single-tenant-vs-multi-tenant deploy topology beyond the current single-tenant design.

## Brand Commitments

- **Name / voice:** "Trustworthy Corporate" — trust-first, boardroom-ready, confident. Confident restraint, not flash.
- **Primary brand color:** Aurora Azure (`oklch(0.5 0.13 242.749)`). Calm-confident chroma (~0.13). One primary action per view region.
- **Text law (frozen):** text is always black or white — never gray. Hierarchy comes from font weight + size + bold color, not gray washes. `--muted-foreground` must stay chromatic (deepened Azure, L=0.32 light / L=0.72 dark), never neutral gray.
- **Font:** Inter Variable only (no second display face in app).
- **Motion:** Motion library (`motion/react`) with canonical presets in `apps/client/src/lib/motion.ts`; opacity + `translateY(8px)` enters, ease-out cubic, no overshoot, `motion-reduce` honored.
- **Signature system:** structured operational hierarchy — flat toolbar headers, 3px module left-rails, opaque grounded surfaces (`bg-card` + 1px `border-border` + `shadow-sm`, no backdrop-blur, no opacity fills). Same recipe every domain.
- **Anti-signature (banned):** gray text of any kind, gray UI surfaces, saturated gradient page banners, backdrop-blur floaty surfaces, module color on table body cells / primary CTAs / long body text, mint or chart color as primary CTA, decorative form gradients, 3D/pie/donut/radial-gauge charts as defaults, dark-by-default dense forms.

Design law authority: `docs/design-system/DESIGN.md` (frozen do/don't law for shipping UI). Canonical tokens: `apps/client/src/index.css`. Canonical motion: `apps/client/src/lib/motion.ts`.

## Evidence on Hand

- Working monorepo: `apps/client`, `apps/server`, `packages/schemas`, `packages/eslint-config`, `packages/typescript-config`.
- 22 tRPC routers registered in `apps/server/src/router.ts` covering every capability above.
- `apps/client/src/constants/nav-menu.ts` — permission-gated sidebar map mirroring the routers.
- `apps/client/src/locales/{en,id}.json` — full bilingual string inventory.
- `docs/design-system/DESIGN.md` — approved, dated design law with token definitions + anti-signature.
- `apps/server/src/prisma/seed.ts` — seed users, roles, and `report@read` (`@permission` strings) — referenced in repo memory.
- `ecosystem.config.js` — pm2 production config for the server.

Absences future work must not fabricate: no named real customer logos, testimonials, case studies, benchmarks, or press; no open-source LICENSE file (the in-repo LICENSEs belong to bundled skills, not this product); no confirmed external compliance certification; no confirmed anchor account.

(mark: facts the user did not separately confirm during init are derivable from the repository, `DESIGN.md`, and repo memory — kept here so later design work does not rediscover them.)

## Product Principles

1. **Trust over flash.** Every surface must read as boardroom-credible: light, opaque, grounded, scannable, with restrained confident color. Trust cues outrank expression.
2. **Scan speed is the feature.** A manager answers "are we ok?" in under two seconds: KPI strip, status chips, dense tables, predictable wayfinding. Hierarchy is font weight + size + bold color, not gray.
3. **One designed system across domains.** Same chrome recipe, same motion, same module-color discipline everywhere — the product reads as a system, not stitched apps.
4. **Color is meaning, not decoration.** Brand Azure is the only global CTA. Module colors live on chrome plates and data status; semantic color encodes state; rainbow table cells and gradient banners are banned.
5. **Long sessions win.** Light work surfaces, premium-but-snappy 150–250ms motion, `tabular-nums` money, and approval visibility — the product is for people doing order/entry work for hours.

## Accessibility & Inclusion

Target: **WCAG AA** across all chrome. Concrete commitments already in design law: text is never gray; text color hard ban includes `text-gray-*`/`slate-*`/`zinc-*`/`neutral-*`/`stone-*` and gray `muted-foreground`; status chips carry **icon + label** (never color alone); focus uses `ring-ring` / focus-visible utilities; module-color solid headers hold white text at AA contrast (light L≈0.45–0.48 / chroma ~0.20); touch targets ≥44px on mobile chrome; `prefers-reduced-motion` is honored via `useReducedMotion()` + `getMotionProps()` in Motion. Bilingual EN + ID is product-grade from day one.

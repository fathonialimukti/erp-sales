# Professional Polish Sweep

Goal: close every blocker/gap from the two-part professional due-diligence audit, so the repo's
*claims* match its *implementation*.

**Root cause being fixed:** the design-system core is genuinely excellent; the verification
truthfulness layer (CHANGELOG, README, CI gates, i18n check) overstates reality. An investor's
engineer loses trust when "ESLint broken repo-wide" is contradicted by `bun run lint` exiting 0.

## Waves

```
Wave 1 (parallel, 5)   A1 backend-security      A2 backend-csrf
                       A3 infra-deps            A4 frontend-tokens-a11y
                       A5 frontend-ai-chrome
Wave 2 (parallel, 4)   B1 i18n-completion       C1 page-migration
                       C2 client-unit-tests     C3 e2e-credibility
                       C4 server-approval-tests
Wave 3 (serial, 1)     D1 docs-truth            (needs final real command output)
Wave 4 (serial, 1)     E1 final-review
```

C4 runs with Wave 2 but only creates NEW files under `apps/server/src/tests/` — never edits
existing test files (A1/A2 also write there).

## MANUAL — owner action required (agents cannot rotate secrets)

1. Rotate the `OPENCODE_SERVER_PASSWORD` from `ecosystem.config.js` (was committed at HEAD).
2. Rotate the `ghp_` PAT + AI API key in `.devcontainer/.env` (on disk, correctly untracked).

A1 removes the plaintext and wires `process_env_file`, but rotation is a human action.

## File ownership (no cross-task writes)

| Task | Owns |
|---|---|
| A1 | `apps/server/src/routes/ai.ts`, `routes/health.ts`, `routers/settings.ts`, `ecosystem.config.js`, new `src/tests/routes/ai-query-authz.test.ts` |
| A2 | `apps/server/src/trpc.ts`, `lib/csrf.ts`, `context.ts`, new `src/tests/lib/csrf.test.ts` |
| A3 | `turbo.json`, root `package.json`, `apps/*/package.json`, `bun.lock`, `.github/workflows/ci.yml`, `apps/server/src/index.ts`, `.devcontainer/devcontainer.json`, `apps/client/vite.config.ts` |
| A4 | `NotificationDrawer.tsx`, new `lib/status-color.ts`, `index.html`, `App.tsx`, `layouts/PrivateLayout.tsx` |
| A5 | `components/Ai*`, new `components/ai/*` (chrome only — NO locale writes) |
| B1 | `locales/en.json`, `locales/id.json`, `scripts/check-i18n.mjs`, `DataTable.tsx`, `ErrorBoundary.tsx`, `Dashboard.tsx`, `activity-logs/ActivityLogsIndexPage.tsx`, `AiAssistant/AiAssistant.tsx` (strings only), 13 form pages |
| C1 | `pages/{vendor,budget,budget-line,budget-period,action-type,event-type}/**`, sortability in 20 index pages |
| C2 | `apps/client/vitest.config.ts`, client unit test files, CI job step |
| C3 | `apps/client/src/tests/e2e/**`, `playwright.config.ts` |
| C4 | new files under `apps/server/src/tests/routers/` |
| D1 | `CHANGELOG.md`, `README.md`, `docs/ARCHITECTURE.md`, `CONTEXT.md` |

**Rule:** A4/A5 reference i18n ids but never write locale files — B1 fills them in Wave 2.

# Project bottom line (all agents)

Shared floor for every agent and chat. **Domain detail does not live here** — use the specialist agent + path instructions.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime / PM | **Bun** + Turborepo |
| Language | **TypeScript** strict (`exactOptionalPropertyTypes`) |
| Client | React 19 + Vite + Tauri · Tailwind v4 + **shadcn Aurora** (`@/components/ui/*`) |
| API | **tRPC v11+** end-to-end typesafe |
| Server | Express + Prisma (PostgreSQL, ULID ids) |
| Shared validation | `@repo/schemas` (Zod) |

## Who owns what

| Work | Agent | Path rules |
|------|--------|------------|
| UI / pages / client hooks | **Frontend Engineer** | `.github/instructions/client-frontend.instructions.md`, `i18n-locale.instructions.md` |
| Routers / Prisma / schemas | **Backend Engineer** | `prisma-server.instructions.md`, `schemas.instructions.md` |
| Schema + router + pages together | **Full-Stack Engineer** (orchestrates only) | delegates to specialists |
| Review / audit / ship rec | **Quality Engineer** | read-only git; recommend commit only |

Do **not** stuff frontend UI law or Prisma patterns into this file — specialists own those.

## Agent Rules (Model-Agnostic)

- The system will automatically pick the correct specialist agent when the user mentions a feature, page, router, or asks something like "fix this", "update the backend", "make this change", etc.
- You will see the agent name displayed (e.g. **Backend Engineer** or **Frontend Engineer**).
- **Never implement code yourself.** The main model must always dispatch the right agent first.
- If you see the main model directly writing code to the chat without an agent name, he is not following the agent guidelines.

## Code floor (everywhere)

- Match existing architecture; shortest **correct** wiring; no premature abstraction
- Prefer inference; avoid `any`; no bare `!` without a safety comment
- Arrow functions, early returns, self-documenting names; comments only when needed
- Respect recent edits; do not resurrect deleted code
- Permission strings: always `resource@action` (never `resource_action`)
- **File edits:** create/update source only via VS Code edit tools (`create_file`, `replace_string_in_file`, multi-edit). **Never** write or overwrite product source (`.ts`, `.tsx`, `.js`, `.jsx`, `.json` locales, CSS, Prisma, configs) via shell/Python (`cat`, heredoc, `Path().write_text()`, `echo >`, etc.). Shell is for running commands only (dev, build, test, typecheck, migrations, `ui-ux-pro-max` search).
- **Git:** manual only — no `add` / `commit` / `push` / merge / PR unless the user runs it

**UI work is not “shortest class list.”** If you touch client UI, Frontend Engineer + design law `docs/design-system/aurora-commerce-design-law.md` + `ui-ux-pro-max` apply — craft > flat minimal shells.

## Monorepo map

```
apps/client/                 React client (Tailwind + shadcn Aurora)
apps/server/                 Express + tRPC + Prisma (port 10022)
packages/schemas/            Shared Zod (@repo/schemas)
.agents/skills/              Canonical skills only
.github/agents/              Specialist agents
.github/instructions/        Path-scoped rules (applyTo)
.github/copilot-instructions.md  This bottom line
docs/design-system/    Aurora Commerce design law (UI authority)
```

When in doubt: **simplest solution that matches architecture**, and for UI, **do not ship unfinished gray shells**.

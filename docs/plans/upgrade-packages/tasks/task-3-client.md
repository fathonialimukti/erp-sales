### Task 3: Client Upgrade

**Files:**
- Modify: `apps/client/package.json`
- Modify (only if migration codemod requires): `apps/client/vite.config.*`, `apps/client/components.json`, Tailwind/shadcn config under `apps/client/**`, `apps/client/src-tauri/**` version pins
- Never touch: `apps/server/**`, `packages/schemas/**`, root `package.json`, `turbo.json`, `bun.lock` (leave lockfile regeneration to Task 4)

**Interfaces:**
- Consumes: Task 1 version matrix + breaking-change shortlist
- Produces: bumped client deps, applied codemods, `bun run check-types` clean for `apps/client` scope

**Reads (in your own context):**
- `apps/client/package.json`, Task 1 report, migration guides for React/Vite/Tauri/Tailwind majors you bump, `docs/design-system/DESIGN.md` (design law — preserve visuals)

**Frozen contract:**
- tRPC vanilla only (`trpcClient.*` in `queryFn`); router namespace `trpcClient.<domain>.{list, detail, create, update, delete}`
- i18n prefix `<domain>.*` unchanged; all user-visible strings stay via `intl.formatMessage`
- Semantic Tailwind tokens only (no raw hex, no gray text); functional components

**Steps:**
- [ ] Step 1: Bump `apps/client` deps per Task 1 matrix (deliberate range edits, no global update)
- [ ] Step 2: Apply only required migration codemods (React/Vite/Tailwind/Tauri); additive only, preserve routes and visual design
- [ ] Step 3: Run `bun run check-types` (scoped if possible); fix only breakage you introduced
- [ ] Step 4: Self-review diff for scope creep

**Report back (mandatory):** End with `## Produces` — exact bumped versions, codemods applied, i18n keys verified unchanged, check-types status.

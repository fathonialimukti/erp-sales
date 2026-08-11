### Task 1: Schema — remove `embedding` group + `emailAgent.name`

**Files:**
- Modify: `packages/schemas/src/settings.ts`
- Test: `apps/server/src/tests/routers/settings.test.ts` (adjust `fullAppPatch`)

**Interfaces:**
- Consumes: existing `appSettingsSchema`
- Produces: updated `AppSettings` type without `embedding` group and without `emailAgent.name`

**Frozen contract:**
- Remove the `embedding: z.object({...})` group from `appSettingsSchema`.
- Remove `name: z.string().optional()` from the `emailAgent` group.
- Keep all other groups (`ai`, `smtp`, `system`, `company`, `general`) unchanged.
- `AppSettings` type is inferred — downstream code must compile after removal.

**Steps:**
- [ ] Step 1: Edit `packages/schemas/src/settings.ts` — delete `embedding` group, delete `emailAgent.name`.
- [ ] Step 2: Run `bun run check-types` at repo root; confirm `packages/schemas` compiles.
- [ ] Step 3: Self-review — no other schema file references `embedding` or `emailAgent.name`.

**Note:** Do NOT touch `apps/server` or `apps/client` — those are separate tasks. This task only owns `packages/schemas/src/settings.ts`.

### Task 5: Settings tests — update `fullAppPatch` + masked-secrets test

**Files:**
- Modify: `apps/server/src/tests/routers/settings.test.ts`

**Interfaces:**
- Consumes: updated `AppSettings` type (Task 1) + updated `MaskedAppSettings` (Task 2)
- Produces: passing settings router tests

**Frozen contract:**
- `fullAppPatch` currently includes `embedding: {}` — remove it (the schema no longer has an `embedding` group).
- The masked-secrets test currently asserts `settings.embedding.apiKey` — remove that assertion. Keep `settings.ai.apiKey` and `settings.smtp.pass` assertions.
- The masked-secrets test sets `EMBEDDING_API_KEY` env — remove that `setEnv` call (no longer read).
- Keep all other tests unchanged.

**Steps:**
- [ ] Step 1: Edit `apps/server/src/tests/routers/settings.test.ts` per contract.
- [ ] Step 2: Run `bunx vitest run src/tests/routers/settings.test.ts` in `apps/server` — confirm pass.
- [ ] Step 3: Run `bun run check-types` at repo root.
- [ ] Step 4: Self-review.

**Note:** Do NOT touch client files or other server files.

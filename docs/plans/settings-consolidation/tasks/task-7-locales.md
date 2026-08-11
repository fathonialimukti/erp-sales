### Task 7: Locales — remove embedding + agent-name keys

**Files:**
- Modify: `apps/client/src/locales/en.json`
- Modify: `apps/client/src/locales/id.json`

**Interfaces:**
- Consumes: nothing (pure key removal)
- Produces: locale files without embedding/agent-name keys

**Frozen contract:**
Remove these keys from BOTH `en.json` and `id.json`:
- `settings.app.section_embedding`
- `settings.app.field_embedding_base_url`
- `settings.app.field_embedding_model`
- `settings.app.field_embedding_api_key`
- `settings.app.field_embedding_dimensions`
- `settings.app.field_embedding_threshold`
- `settings.app.field_agent_name`

Keep all other `settings.app.*` keys intact (including `field_agent_title`, `field_agent_company`, `field_agent_max_thread`).

**Steps:**
- [ ] Step 1: Edit `apps/client/src/locales/en.json` — remove the 7 keys.
- [ ] Step 2: Edit `apps/client/src/locales/id.json` — remove the 7 keys.
- [ ] Step 3: Run `bun run check-types` at repo root.
- [ ] Step 4: Self-review — confirm no other file references the removed keys (grep for `section_embedding`, `field_embedding`, `field_agent_name`).

**Note:** Do NOT touch the page component or routes — separate tasks.

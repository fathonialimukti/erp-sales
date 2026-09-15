### Task 15: Audit deleted settings — AI LLM settings recovery (READ-ONLY)

**Files:**
- READ-ONLY audit. DO NOT modify `apps/**` or `packages/**`.
- Compare `HEAD` vs workdir for settings surface only.

**Interfaces:**
- Consumes:
  - Prior split: `/settings` = App only, `/setting` = User standalone (T11)
  - Backend matrix T12/T13: `app.*` gated (`settings@read/@update/@app@read/@app@update` KEPT), `user.*` open
  - User report: "old code of settings deleted, several important settings like ai llm settings" missing from App Settings UI
- Produces: exact deleted sections/keys + file + restore plan for T16.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `docs/plans/settings/PLAN.md`
- `git diff HEAD -- apps/client/src/pages/settings/AppSettingsPage.tsx apps/server/src/routers/settings.ts packages/schemas/src/settings.ts apps/server/src/lib/settings-service.ts apps/server/src/prisma/seed.ts apps/client/src/locales/en.json`
- `apps/server/src/lib/ai-provider.ts`, `apps/server/src/lib/ai-embedding.ts` (consumers of AI LLM keys — to list required keys)
- Current `AppSettingsPage.tsx` sections vs `HEAD` version (`git show HEAD:path`)

**Frozen contract:**
- Resource: `settings`, namespaces `app.*` vs `user.<userId>.*`
- Do NOT invent new keys. AI LLM keys are FROZEN to whatever `HEAD` + AI consumers required (e.g. provider/model/embedding keys — subagent to list exact key names from diff + consumers).
- No permission-string changes in this task. No design changes.

**Steps:**
- [ ] Step 1: `git diff HEAD` for the 6 settings files above — list every removed `app.*` section/key (especially AI/LLM/embedding/provider) with exact key name + where it lived (schema key, router group, UI section, locale key, seed default).
- [ ] Step 2: Cross-check against `ai-provider.ts` / `ai-embedding.ts` / `rag.ts` / `ai.ts` routes — which deleted keys are still read at runtime (breaking) vs truly unused.
- [ ] Step 3: Classify: (A) must-restore (read at runtime or user-flagged AI LLM), (B) intentional removal (only if proven unused), (C) moved (e.g. to User page / ai-admin). Provide restore target (schema+router+page+locale+seed) per key.
- [ ] Step 4: Self-review. DO NOT edit implementation files.

**Report back (mandatory):**
End with `## Produces` listing: deleted sections table (section | keys | lived-in file@HEAD | still-read-by | class A/B/C), exact runtime-required AI LLM key list, and a file-by-file restore plan for T16 (schema keys, router groups, UI sections, locale keys, seed defaults). Later briefs copy this verbatim.

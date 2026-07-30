### Task 1: Rename AI SDK `system` → `instructions` (Backend)

**Files (modify only — all in `apps/server/src/`):**
- `routes/ai-extract.ts:57`
- `routes/ai.ts:179, 322, 356`
- `routes/ai-admin.ts:387`
- `routes/customer-ai.ts:46`
- `lib/ai-sales-order-validation.ts:153`
- `lib/email-concierge.ts` (around line 218 — `system,` is a local variable, not the option key; verify before touching)

**Problem:**
`ai@7.0.42` marks the `system` option on `generateObject`, `streamText`, and `generateText` as:
```ts
/** @deprecated Use `instructions` instead. */
system?: Instructions;
```
Source: `node_modules/ai/dist/index.d.ts:684, 3066`. All call sites pass `system: <prompt>` and render with editor strikethrough.

**Frozen contract:**
- **Behaviour-preserving rename.** `instructions` is the same field; the AI SDK just renamed it. No prompt text changes, no option reordering, no other signature changes.
- For each call site, change ONLY `system:` → `instructions:` on the option object passed to `generateObject` / `streamText` / `generateText`.
- Leave the surrounding call options (`model`, `prompt`, `tools`, `temperature`, `stopWhen`, `schema`, etc.) untouched.
- In `email-concierge.ts`, the call site at ~line 218 passes `system,` where `system` is a **local string variable** built above the call. Two valid approaches:
  1. Rename the option: `instructions: system,` (keep the local variable name `system` — minimal diff)
  2. Or rename the local var too. **Prefer (1)** — smallest diff, no risk to surrounding logic.
- Do NOT touch `apps/server/src/prisma/generated/**` — those `SYSTEM: 'SYSTEM'` matches are enum values in generated code, not AI SDK options.
- Do NOT touch `apps/server/src/routes/landing.ts` — that `DEPRECATED` comment is unrelated.
- Do NOT rename any variable named `SYSTEM_PROMPT`, `EXTRACT_SYSTEM`, `SUMMARIZE_SYSTEM`, `DRAFT_SYSTEM`, etc. — only the object key `system:` at the call site.

**Verification:**
- `bun run check-types` (root) must stay clean.
- `bunx vitest run apps/server/src/tests` — the AI routes have no unit tests, so only confirm you didn't break compilation of importers.
- Editor strikethrough should disappear on all 7 files.

**Reference grep to confirm coverage after edit:**
```
grep -rnE '^\s*system\s*:' apps/server/src --include='*.ts'
```
Expected remaining matches: NONE in `routes/` or `lib/` (excluding `prisma/generated/`).

### Task 6: App settings page — remove Embeddings card + Email agent Name field

**Files:**
- Modify: `apps/client/src/pages/settings/AppSettingsPage.tsx`

**Interfaces:**
- Consumes: updated `AppSettings` type (Task 1) + updated `MaskedSettings` from `settings.get`
- Produces: page without Embeddings section and without agent Name field

**Frozen contract:**
- Remove the `embedding` group from the `FormValues` interface.
- Remove `embedding` from `toFormValues` and from `buildPatch`.
- Remove `const embeddingKeySet = Boolean(data?.embedding?.apiKey?.hasValue);`.
- Remove the `Boxes` import from `lucide-react` (only used by the Embeddings card).
- Remove the entire `{/* Embeddings */}` `<SectionCard icon={Boxes} ...>` block (lines ~630–710).
- Remove the `{/* Email agent */}` card's `Name` `<TextField id="agent-name" ...>` block (the `form.emailAgent.name` field).
- Remove `name: string;` from the `emailAgent` group in `FormValues`, from `toFormValues`, and from `buildPatch`.
- Keep everything else (AI provider, SMTP, Email agent title/company/maxThreadChars, System identity) unchanged.
- Do NOT change i18n keys in this file beyond what's needed — locale cleanup is a separate task. You may leave the `intl.formatMessage` calls for removed fields out; the locale keys will be cleaned in Task 7.

**Steps:**
- [ ] Step 1: Edit `apps/client/src/pages/settings/AppSettingsPage.tsx` per contract.
- [ ] Step 2: Run `bun run check-types` at repo root.
- [ ] Step 3: Self-review — no `embedding` or `emailAgent.name` reference remains in this file.

**Note:** Do NOT touch `routes.tsx`, `nav-menu.ts`, `Sidebar.tsx`, or locale files — separate tasks.

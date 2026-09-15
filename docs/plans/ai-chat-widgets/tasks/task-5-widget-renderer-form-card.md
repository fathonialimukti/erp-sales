### Task 5: ChatWidgetRenderer + ChatFormRequestCard

**Files:**
- Create: `apps/client/src/components/ai/ChatWidgetRenderer.tsx`
- Create: `apps/client/src/components/ai/ChatFormRequestCard.tsx`
- Test: `apps/client/src/components/ai/ChatFormRequestCard.test.tsx` (write only — never run; QE runs them)

**Interfaces:**
- Consumes: from `@repo/schemas` — `ChatWidget`, `ChatFormRequestWidget`, `ChatWidgetField`, `ChatFormResponse`. From Task 3 `## Produces` (pasted below in Dispatch section of PLAN) — the exact AI-chat router namespace + `submitFormResponse` input/output. i18n keys (frozen, implemented by Task 7): `ai.widget.form.submit`, `ai.widget.form.submitting`, `ai.widget.form.submitted`, `ai.widget.form.cancel`, `ai.widget.status.pending`, `ai.widget.error.unsupported`, `ai.widget.error.expired`. (The locked-card label is `ai.widget.form.submitted` — there is deliberately no `status.submitted` key.)
- Produces (exact — Task 8 imports these):
  - `ChatWidgetRenderer` — props: `{ widget: ChatWidget; chatId: string; disabled?: boolean }` (adjust if Task 3's types force it; report final signature)
  - `ChatFormRequestCard` — props: `{ widget: ChatFormRequestWidget; chatId: string; disabled?: boolean }`
  - Behavior contract: renderer switches on `widget.type` → `form-request` renders `ChatFormRequestCard`, `confirm-action` renders nothing here (Task 6 owns it — renderer imports it via a slot or Task 8 composes; decide the cleanest seam and report it), unknown types → graceful fallback card with `ai.widget.error.unsupported`.

**Reads (in your own context):**
- `docs/plans/ai-chat-widgets/SPEC.md` §7, §9
- `docs/design-system/DESIGN.md` (design law), `apps/client/src/index.css` (tokens), `apps/client/src/lib/motion.ts`
- `apps/client/src/pages/Region*.tsx` (reference page patterns: tRPC vanilla usage, intl, shadcn forms)
- The existing chat page + message bubble components (locate via the chat pages' imports) — for visual integration seams
- `AGENTS.md`

**Frozen contract (behavior — SPEC §7 is law):**
- Render every field type: text → Input, textarea → Textarea, number → number Input, select → shadcn Select from `options`, date → date input, checkbox → Checkbox. Labels from `field.label` (AI-localized), placeholders via `field.placeholder`.
- Required-field validation client-side; submit button disabled until valid.
- Submit → `submitFormResponse` mutation (tRPC vanilla, `trpcClient.*` in `queryFn`/mutation per repo pattern) → card locks read-only showing the entered values; spinner + `ai.widget.form.submitting` while pending; error toast on failure; typed BAD_REQUEST (replay) shows `ai.widget.error.expired`.
- History persistence: render read-only from persisted `widget.status` (`submitted` → locked with values shown, `pending` → interactive). State lives server-side — a reload must not resurrect an editable submitted card.
- All strings via `intl.formatMessage`; semantic Tailwind tokens only; motion per `lib/motion.ts`; functional components.

**Steps:**
- [ ] Step 1: Write the test file first (no runs): renders all six field types; required validation blocks submit; submit calls the mutation with `{ widgetId, values }`; locked read-only render when status `submitted`; unknown type → fallback.
- [ ] Step 2: Implement both components per the frozen contract.
- [ ] Step 3: Run `bun run check-types` (scoped to client). Fix until clean. Do NOT run tests.
- [ ] Step 4: Self-review against SPEC §7 (tokens, i18n, states).

**Report back (mandatory):** end with `## Produces` — exact component names + prop signatures, the renderer→confirm-card seam decision, i18n keys consumed, files created.

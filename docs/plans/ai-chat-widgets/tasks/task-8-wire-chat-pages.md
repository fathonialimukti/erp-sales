### Task 8: Wire Widgets into Existing AI Chat Pages

**Files:**
- Modify: the existing chat page + message-bubble component files for **all AI chatboxes and the AI Admin chat** (locate exact files yourself from the chat pages' imports — these files are yours alone in this plan; do NOT touch `routes.tsx`, no new pages)
- Test: extend the client test you find nearest the chat bubble OR add `apps/client/src/components/ai/ChatWidgetWiring.test.tsx` (write only — never run)

**Interfaces:**
- Consumes (paste verbatim from earlier `## Produces` reports at dispatch time):
  - Task 5: `ChatWidgetRenderer` props + the renderer→confirm-card seam
  - Task 6: `ChatConfirmCard` / `ChatActionResultBlock` props (if not already imported by the renderer)
  - Task 3: exact router namespace + `submitFormResponse` / `confirmAction` / `rejectAction` / `executeConfirmedAction` signatures + the existing procedure that triggers an AI generation turn
  - Task 4: confirmation that structured turns (`form_response`, `confirmation`, `action_result`) are consumed by the pipeline once present in the thread
- Produces: wired chat UI — assistant messages with a `widget` payload render `ChatWidgetRenderer`; after widget mutations resolve, the next AI turn is triggered via the existing generation entry (per Task 3's report); history reload renders persisted read-only states.

**Reads (in your own context):**
- `docs/plans/ai-chat-widgets/SPEC.md` §5, §7
- The chat page + message bubble files (all chatboxes incl. AI Admin)
- The `## Produces` blocks from Tasks 3–6 (provided in your dispatch message)
- `docs/design-system/DESIGN.md`, `apps/client/src/index.css`, `apps/client/src/lib/motion.ts`
- `AGENTS.md`

**Frozen contract (behavior):**
1. In the message-bubble render path: if the assistant message carries a `widget` payload (parse defensively — invalid/unknown → `ChatWidgetRenderer` fallback), render `ChatWidgetRenderer` inside the bubble, below the text.
2. After `submitFormResponse` / `confirmAction`+`executeConfirmedAction` / `rejectAction` resolve successfully, trigger the next AI turn using the existing generation entry reported by Task 3 — the AI then re-analyzes (form values, confirmation decision, or action result).
3. No changes to routes/navigation; no new pages; existing chat send/composer behavior untouched.
4. Semantic tokens + i18n only; minimal diff — do not restyle the existing chat.

**Steps:**
- [ ] Step 1: Locate all AI chatbox surfaces (list them in your report).
- [ ] Step 2: Write the wiring test first (no runs): assistant message with a `form-request` payload renders the form card; with a `confirm-action` payload renders the confirm card; post-mutation success triggers the generation entry once.
- [ ] Step 3: Implement the wiring per the frozen contract.
- [ ] Step 4: Run `bun run check-types` (scoped to client). Fix until clean. Do NOT run tests.
- [ ] Step 5: Self-review: every chatbox covered; reload path renders persisted states.

**Report back (mandatory):** end with `## Produces` — list of chat surfaces wired, files modified, the turn-trigger call used, and any deviation from Task 3/4 reports.

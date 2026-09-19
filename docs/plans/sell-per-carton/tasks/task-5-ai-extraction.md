### Task 5: AI extraction reject/inform/confirm + agent prompt

**Files:**
- Modify: the AI sales-order extraction prompt builder (email-order path in `apps/server/src`)
- Modify: the email CRM agent instruction layer (system prompt assembly)

> Locate the exact files yourself — search for the extraction prompt and the email agent system-prompt builder in `apps/server/src` (routers: `email-crm.ts`, `sales-order.ts`, and any `ai-*`/prompt-builder module).

**Interfaces:**
- Consumes: T1 `## Produces` (`Sku.packSize`); T4 `## Produces` (server carton enforcement — the extraction output must satisfy it)
- Produces: prompt behavior for the locked 2.1 flow

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md` (§2.1 final), `AGENTS.md`, the extraction prompt builder, the email agent prompt builder

**Frozen contract:**
- Per SPEC §2.1 (final, locked), for an email order whose SKU quantity is **not** a carton multiple:
  1. **No sales order is created** — not even a draft. Invalid data never enters the order book.
  2. The AI replies to the buyer quoting SKU + pack size + the two nearest valid multiples, e.g. *"Product A is only sold per carton of 20 pcs. You asked for 50 — shall I make it 40 (2 carton) or 60 (3 carton)?"*
  3. The conversation stays **OPEN**, marked as awaiting buyer confirmation (existing `agentStatus` — no new mechanism, no new enum).
  4. Draft SO is created **only** once the buyer confirms a valid multiple.
  5. Reply in the buyer's language.
- **Pack sizes are injected from live `Sku` records** at prompt-build time — never hardcoded, never KB-looked-up.
- **Failure isolation:** if the agent cannot resolve a SKU's pack size (unknown SKU / lookup failure), it asks the buyer to clarify rather than guessing a multiple.
- The prompt carries the *behavior*; the KB article (T9) carries the *explanation* the agent may cite.

**Steps:**
- [ ] Inject pack sizes into extraction context from live SKU records
- [ ] Write the carton-only rule into the instruction layer
- [ ] Wire the confirm-then-create transition
- [ ] `bun run check-types`
- [ ] Self-review: is there any path where a non-multiple order still creates a draft?

**Report back (mandatory):** `## Produces` — the files modified, and the exact behavior contract.

**Preservation:** additive only — do not remove existing agent capabilities or prompt sections.

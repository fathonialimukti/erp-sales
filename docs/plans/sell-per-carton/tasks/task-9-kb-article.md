### Task 9: Knowledge base SOP article + re-embed

**Files:**
- Modify: KB content source used by the seed / KB ingestion path (locate it — `apps/server/src` KB content, `knowledge-base.ts` router, or the seed's KB section)

**Interfaces:**
- Consumes: SPEC §Knowledge base (K1 scope)
- Produces: one rep-facing SOP article, re-embedded

**Reads:**
- `docs/plans/sell-per-carton/SPEC.md`, `AGENTS.md`, `apps/server/src/routers/knowledge-base.ts`, `apps/server/src/prisma/seed.ts`

**Frozen contract:**
- **K1 only** — one article: **"Entering a sales order in cartons"**: how the carton field works, why a non-multiple is rejected with a pack-size message, what to tell a buyer who asks for a broken quantity.
- **No per-SKU pack sizes in the KB** — those are answered from the live SKU record (drift risk on repack). This is an explicit scope guard, not an oversight.
- Changed content must be **re-embedded** via the existing `ai-embedding` path (`KnowledgeChunk` + pgvector), or the assistant retrieves stale text.
- If KB content is seeded, land the article in the seed (T3 owns seed data — coordinate so the article is not written twice).

**Steps:**
- [ ] Write the article
- [ ] Land it in the KB content source / seed
- [ ] Re-embed the changed chunks
- [ ] Self-review: does the article describe carton entry (not piece entry)?

**Report back (mandatory):** `## Produces` — article title + where it landed + embed status.

**Preservation:** additive only — existing KB articles untouched.

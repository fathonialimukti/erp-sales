### Task 1: email-order-bench script

**Files:**
- Create: `apps/server/src/scripts/email-order-bench.ts`

**Interfaces:**
- Consumes: `shouldSkipInbound`, `extractBody`, `formatAttachmentNote` from `../lib/email-inbound.js`; `validateConciergeResult` from `../lib/email-concierge.js`; carton math (`nearestCartonMultiples`, `assertCartonMultiple`) from `@repo/schemas/sales-order`
- Produces: runnable `bun src/scripts/email-order-bench.ts [--json] [--live]` printing console table + JSON

**Reads (in your own context):**
- `apps/server/src/lib/email-inbound.ts`
- `apps/server/src/lib/email-concierge.ts` (`validateConciergeResult` only)
- `packages/schemas/src/sales-order.ts` (carton helpers)
- `apps/server/src/scripts/ingest-knowledge.ts` (script conventions)

**Frozen contract:**
- Resource: none (standalone bench script, no tRPC, no DB writes offline)
- CLI: `--json` dumps machine-readable `{ cases, summary }`; `--live` gated behind explicit flag + AI env/settings, exits cleanly with message when missing
- Offline default: zero network, zero DB, zero SMTP sends

**Steps:**
- [ ] Step 1: Implement 8 inline SAMPLES with `expected` (clean EN valid → draft; clean ID valid → draft; non-carton qty → blocked/no draft; unknown SKU → unknown_sku/no draft; missing customer → rejection; attachment-only → ask-for-details; empty → skipped; noreply → skipped). Stub pack-size map locally (`SKU-A: 20` etc). Tiny regex extractor (SKU code + qty + outlet keyword) as extraction stand-in. Time `parse` / `cartonGate` / `validate` stages with `performance.now()`. Score per-field accuracy (customer, outlet, sku, quantity, cartonValid, decision). Print `console.table` per-case + summary (field %, overall %, mean/p50/p95). `--json` dumps same.
- [ ] Step 2: `--live` path calls real `getChatModel` + `generateText` suggest flow only when flag + env present; times `aiLatencyMs` separately; never auto-sends.
- [ ] Step 3: Run `bun run check-types` from repo root scope (or `apps/server`) and fix typing; run `bun src/scripts/email-order-bench.ts` + `--json` once to verify output (this is the deliverable run, not the test suite).
- [ ] Step 4: Self-review (no `.js` extension misses, no DB/SMTP side effects offline, `exactOptionalPropertyTypes` clean)

**Report back (mandatory):** End with `## Produces` — exact file created, CLI flags, sample count, summary metric names.

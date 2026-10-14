### Task 2: email-order-bench vitest thresholds (Phase 2)

**Files:**
- Create: `apps/server/src/tests/scripts/email-order-bench.test.ts` (if `tests/scripts/` doesn't fit conventions, use `tests/lib/email-order-bench.test.ts` — pick one, don't create both)
- Modify (only if needed for reuse): `apps/server/src/scripts/email-order-bench.ts` — export pure helpers (`SAMPLES`, extractor, scorer, percentile) without changing CLI behavior

**Interfaces:**
- Consumes: exports from `apps/server/src/scripts/email-order-bench.ts` (or re-imports same pure fns: `shouldSkipInbound`, `extractBody`, `validateConciergeResult`, carton math). Prefer importing from the script over duplicating logic.
- Produces: vitest suite asserting baseline thresholds; no network/DB/SMTP in tests

**Reads (in your own context):**
- `apps/server/src/scripts/email-order-bench.ts`
- `apps/server/src/tests/lib/email-concierge.test.ts` (mock + real-DB conventions)
- `apps/server/src/tests/helpers/seed.ts` (only if DB needed — prefer no DB)

**Frozen contract:**
- Resource: none (test-only, no tRPC, no prod writes)
- Thresholds: overall accuracy >= 90%, every one of the 8 cases passes its expected decision (`draft` / `blocked` / `unknown_sku` / `rejection` / `ask-for-details` / `skipped`), `validateConciergeResult` ok on all draft cases
- Timing assertions: stage latencies are numbers >= 0 (no flaky wall-clock upper bounds in CI); p50/p95 computed and sane (p50 <= p95, finite)
- `--live` must NOT run in CI: gate behind env, test only the missing-config skip path if anything
- Speed: suite runs offline in < 10s

**Steps:**
- [ ] Step 1: Implement suite (import shared logic, no copy-paste of extractor/samples if avoidable; refactor script to export if that's cleaner)
- [ ] Step 2: Run `bun run check-types` (apps/server scope) and fix typing
- [ ] Step 3: Self-review (no `.js` extension misses, no network/DB/SMTP, deterministic — no LLM variance)
- [ ] Step 4: Do NOT run the full test suite yourself — report readiness for `quality-engineer`

**Report back (mandatory):** End with `## Produces` — exact test file path, thresholds asserted, any script exports added.

# Repo Hardening — Fix Plan (2026-09-28)

Source: quality-engineer professionalism audit (Professional, 88%).
Scope decision: P1 cheap wins + P2 ctx.db probe/fix. P3 (approval-chain dedup,
1000+ line page splits, PDF consolidation) **deliberately left** — refactor-on-pain.

Budget: 1 subagent at a time, strictly sequential.

## Task DAG

```
T0: ctx.db severity probe        → quality-engineer (read-only)   [resume audit session]
T1: Backend hardening pass       → backend-engineer               [after T0]
T2: Frontend/repo pass           → frontend-engineer              [after T1]
T3: ctx.db resolution (T3a code | T3b docs, chosen by T0)         [after T2]
T4: Verify branch                → quality-engineer               [after T3]
T5: Commits + tag v0.1.0         → orchestrator, only on explicit user ask; never push
```

## T0 — Probe RESULT (2026-09-28, quality-engineer)

**Verdict: CONTRACT-ROT, not a latent bug.** `ctx.db === prisma` always (`context.ts:92`);
`transactional` middleware + `transactionalProtectedProcedure` (`trpc.ts:103-112,:144`) have
zero consumers = dead code. All 33 real `prisma.$transaction(tx => …)` blocks thread `tx`
correctly (0 leaks). Reverse mixing in ctx.db users is inert.
**New genuine findings:** `visit-log.ts:170-192/:194-232/:234-267` non-atomic + unguarded
status updates (double-approve race, APPROVED-without-notification);
`settings-service.ts:250-259` untransacted N-upsert loop (half-applied config on mid-loop failure).

**Decision: T3a + T3b both.** T3a = wrap visit-log submit/approve/reject in `$transaction`
with guarded `updateMany` pattern (copy `sales-order.ts:493-504`), `db: tx` on notifications;
wrap `setAppSettings` loop in one `$transaction`. T3b = AGENTS.md:24-25 wording to match reality.
Dead trpc.ts middleware deletion → awaiting explicit user approval (removal boundary).

## T1 — Backend hardening (files disjoint from T2)

- [ ] Replace `where: any` / `orderBy: any` with `Prisma.*WhereInput` / `Prisma.*OrderByWithRelationInput`:
      `routers/area.ts:17`, `routers/customer.ts:21`, `routers/sales-order.ts:59`,
      `lib/email-concierge-tools.ts:122`, `lib/customer-ai-tools.ts:67` (+ any others found via grep).
- [ ] `apps/server/package.json`: move `@ai-sdk/devtools` (+ `tsx` if prod-listed) → `devDependencies`.
- [ ] `apps/server/src/lib/ulid.ts` → `ulid` package, KEEP existing export names.
      **Precondition:** grep for id-ordered queries / same-ms monotonic reliance first;
      if monotonic ordering is relied upon, keep custom impl and add a comment — do not swap.
- [ ] `bun run check-types` green. No behavior change, no i18n/permission/route churn.

## T2 — Frontend/repo pass

- [x] `apps/client/src/components/MermaidDiagram.tsx`: dynamic `import('mermaid')` on mount
      — **already implemented in HEAD (commit `ddede94`)**: type-import + memoized lazy `loadMermaid()`.
      No change needed; component is live (LandingPage → RAG_MERMAID_CHART).
- [x] `skills-lock.json`: pruned 26 orphaned entries (8 task-named + 18 same-rule orphans + `css-first`),
      36 keys ↔ 36 skill dirs verified.
- [ ] `bun run check-types` green.

## T3 — ctx.db resolution (branch chosen by T0)

- T3a: convert BUG-flagged handlers to `ctx.db` throughout each handler (backend-engineer).
- T3b: amend `AGENTS.md` / `docs/ARCHITECTURE.md` contract wording to match reality,
      note `transactionalProtectedProcedure` as opt-in for multi-write handlers (orchestrator, docs only).

## T4 — Verify

`bun run check-types` + `bun run lint` + scoped `vitest run` (touched routers + client lib tests).
Green gate required before any commit recommendation.

## Explicitly left alone

- action-program ↔ event-proposal approval duplication (dedup when a chain changes)
- Six 1000+ line client pages (split when a feature touches each)
- Dual PDF stacks (product decision; rule meanwhile: no third PDF path)
- `0.1.0` versions / single `main` branch (tag only)
- Dirty `M opencode.json` (resolve separately, never mixed into these commits)

## T5 — User-approved follow-ups (executed 2026-09-29, backend-engineer)

Two things T1/T3 surfaced were explicitly approved by the user, so they are done
here rather than left as gaps. No commit, no push (the DAG's T5 = orchestrator's
commits/tag, still pending a separate order).

- [x] **`VisitLog.approvalHistory` added** (`20260929072540_add_visit_log_approval_history`).
      The column was referenced by `visit-log.ts` under `as any` and asserted by the
      schema comment at `VisitLog.approvedBy`, but never existed: submit/approve/reject
      threw `PrismaClientValidationError` on every call (untested path, so T4's suite
      stayed green). Now `Json? @map("approval_history")` like the 4-tier models, and
      the six `as any` casts in `visit-log.ts` are gone.
- [x] **`transactional` / `transactionalProtectedProcedure` deleted** from `trpc.ts`
      (re-verified zero consumers repo-wide before deleting; `prisma` import dropped
      with it; `routers/backup.ts` comment reworded; `docs/ARCHITECTURE.md` reworded).

**Migration gotcha for whoever runs this next:** `prisma migrate dev` cannot work in
this environment — the `DATABASE_URL` role lacks `CREATEDB`, so the shadow database
fails with `P3014` (same for `--create-only`). The working path was
`prisma migrate diff --from-config-datasource --to-schema src/prisma/schema.prisma --script`
→ new migration folder → `prisma migrate deploy`. That diff also emits
`DROP INDEX "knowledge_chunks_embedding_hnsw_idx"` because the HNSW index is created
out-of-band by `src/scripts/ensure-knowledge-vector-columns.ts` and is absent from
`schema.prisma`. **Never apply that line** — it is permanent drift to preserve, and it
is also why `db:all` uses `db push`, not `migrate`.

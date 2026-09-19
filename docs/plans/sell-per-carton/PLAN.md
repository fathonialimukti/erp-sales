# Sell Per Carton — Implementation Plan

Spec: `docs/plans/sell-per-carton/SPEC.md` (user-approved 2026-09-18)

## Task DAG

```
Layer 1 (sequential, backend foundation):
  T1 Schema + migration ──┐
  T2 Zod schemas ─────────┴──► T3 Seed rewrite
                              │
Layer 2 (after T1+T2):        ├──► T4 SO router carton enforcement
                              │
                              └──► T5 AI extraction + agent prompt (after T4)

Layer 3 (after T1+T2; parallel, disjoint files):
  T6  SKU form + display          (client, depends T1+T2)
  T7  SO form carton entry        (client, depends T2+T4)
  T8  SO detail + PDF rendering   (client, depends T4)
  T9  KB SOP article + re-embed   (server, depends T2)
  T10 i18n keys en + id           (client, no code dep)

Layer 4 (after all):
  QE review + test execution
```

## Notes

- **Reseed approved** — T3 may rewrite the seed wholesale; no data migration.
- **Wire payload stays pieces** — no tRPC input shape change; only validation + snapshot added server-side.
- T7/T8 consume T4's producer report for the derived-carton helper signature.

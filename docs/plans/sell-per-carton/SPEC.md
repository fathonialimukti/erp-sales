# Sell Per Carton — Design (Spec)

Date: 2026-09-18
Status: Approved (user-approved in brainstorming session)

## Overview

Rework the app's selling model so every SKU is sold **per carton** by default, not per piece. Each SKU declares its own pack size (e.g. product A = 1 carton of 20 pcs). Sales order lines are entered, displayed, and printed in cartons, with the piece equivalent always shown. Internally, quantity stays stored in pieces — the only unit summable across SKUs.

1. **Pack size on SKU** — each SKU carries `packSize` (pcs per carton); default 1 = piece-only escape hatch.
2. **Carton entry** — the SO form takes a carton count per line; pieces and line total recompute live; non-multiples are rejected inline.
3. **Server-enforced whole-carton rule** — every create/update path validates `quantity % packSize === 0`; no path can write a non-carton line.
4. **Snapshot on the line** — `SalesOrderItem.packSize` freezes the SKU's pack size at order time so repackaging never rewrites history.
5. **Dual rendering** — SO form, SO detail, and PDF show `3 carton (60 pcs)`; price stays per piece.
6. **AI extraction gated** — email orders with a non-carton-multiple quantity are **rejected, not drafted**; the AI replies quoting the pack size and asks the buyer to confirm a valid multiple; the draft is created only after confirmation.
7. **Email CRM agent prompt updated** — the carton-only rule is written into the agent's instruction layer, with per-SKU pack sizes injected from live SKU records, so the agent executes reject → inform → confirm rather than freestyling.
8. **Knowledge base updated** — a rep-facing SOP article on carton-based ordering, so assistant answers stop describing piece-based entry.
9. **Clean reseed** — no data migration; seed rewritten with realistic pack sizes and carton-multiple order lines.

## Decisions (user-approved)

| Decision | Choice |
|---|---|
| Scope of "batch" | **A — pack/carton conversion**, no lot identity (no batch no., no expiry/FEFO) |
| Pack levels | **A1 — single level**: carton only; no inner box / pallet |
| Partial cartons | **B1 — whole cartons only**; quantity must be a multiple of `packSize`; no loose pcs |
| Storage model | **S1 — store pieces** + snapshot `packSize` on the line; carton count derived (`quantity / packSize`) |
| Pricing unit | **C1 — price per piece**; carton total computed; `unitPrice` semantics unchanged |
| Historical data | **No migration** — reseed; old SOs would read as piece-only (packSize 1) |
| AI non-carton email | **Reject the order**; AI informs the buyer of the pack size and asks for a valid multiple; **draft created only after buyer confirmation** |
| Email CRM agent prompt | **Updated** — carton-only rule in the instruction layer; per-SKU pack sizes **injected from live SKU records** (never hardcoded) |
| Knowledge base | **K1 — rep SOP article** on carton-based ordering only; pack-size facts left to live SKU data (the trusted source) |
| Action programs / event proposals | **Out of scope** — their `quantity` fields stay in pieces (planning targets, not customer sales) |
| Reporting | **Out of scope** — reports sum `quantity` (pieces), as today |

## Data model

Two additive columns, both with `@default(1)` so the migration is safe by construction and existing rows backfill to piece-only:

```prisma
model Sku {
  ...
  packSize  Int  @default(1) @map("pack_size")   // pcs per carton; min 1; 1 = piece-only SKU
}

model SalesOrderItem {
  ...
  packSize  Int  @default(1) @map("pack_size")   // snapshot of Sku.packSize at line creation
}
```

- `Sku.packSize` — required, integer, min 1. The existing `Sku.baseUnit` (`"pcs"`) is unchanged: pieces remain the base unit of measure; the carton is the *order unit* and stays **implicit** — no unit-of-measure table, no per-line unit picker.
- `SalesOrderItem.packSize` — the **snapshot**. Copied from the SKU when the line is created. If product A is later repacked 20→24, historical lines stay 20 (yesterday's invoice still says 60 pcs) and new lines get 24.
- One Prisma migration.

### Line semantics

| Concept | Value |
|---|---|
| Stored quantity | pieces — `SalesOrderItem.quantity` (type unchanged: `Decimal`) |
| Carton count | derived: `quantity / packSize` |
| Unit price | per piece — `unitPrice`, unchanged |
| Money math | unchanged — `lineTotal` = qty × price × disc/tax, computed from pieces |
| Validation | `quantity > 0` **and** `quantity % packSize === 0` |

### Editing a line

Keep the line's own `packSize` (the snapshot) unless the SKU is swapped — then re-snapshot from the new SKU. This prevents an edit-after-repack from silently changing what the rep entered.

## Validation — where it lives

The tRPC wire payload stays **in pieces**; the input schema shape does not change. Enforcement is layered:

1. **Server (source of truth)** — the sales-order `create`/`update` procedures validate and snapshot deterministically:
   - **Create:** look up each line's `Sku.packSize`; reject if `quantity` is not a positive multiple (message names the pack size: *"Product A is only sold per carton of 20 pcs"*); otherwise write that `packSize` onto the line.
   - **Update, SKU unchanged:** validate against the line's existing snapshot.
   - **Update, SKU swapped:** validate against the new SKU's `packSize` and re-snapshot it onto the line.
   This single gate covers manual entry, AI extraction, and any future import path.
2. **Client (UX)** — the form fetches the SKU and pre-validates divisibility before submit so the rep sees the error inline, on the field, instead of after a round trip.

## Client

### SKU master (`apps/client/src/pages/sku/*`)

- SKU form gains a **pack size** field: integer, min 1, default 1, with a hint `"pcs per carton"`.
- SKU list/detail surfaces the pack size (e.g. `20 pcs/carton`, or `per piece` when 1).

### Sales order form (`apps/client/src/pages/sales-order/*`)

- The quantity input is labelled in **cartons**; the rep types `3`.
- Live computed columns: pcs (`3 × 20 = 60`) and line total (`60 × unitPrice`), both `tabular-nums`.
- Non-multiple values flag immediately on the field: `"must be a multiple of 20"` (pack size named).
- On SKU swap, the line re-snapshots `packSize` and re-validates the entered carton count.

### Sales order detail + PDF

- Line table renders both columns: **Qty (carton)** and **Qty (pcs)**, plus the existing per-piece price and totals.
- PDF prints `3 carton (60 pcs) @ 1,500 → 90,000` so buyer and warehouse read the same number.

### AI extraction

For an email order whose SKU quantity is not a carton multiple:

1. **No sales order is created** — invalid data never enters the order book, not even as a held draft.
2. The AI replies to the buyer, in the email's language: *"Product A is only sold per carton of 20 pcs. You asked for 50 — shall I make it 40 (2 carton) or 60 (3 carton)?"*
3. The conversation stays OPEN, marked as awaiting buyer confirmation (existing `agentStatus`; no new mechanism).
4. Buyer replies with a valid multiple → **only then** is the draft SO created with the corrected quantity, entering the normal DRAFT → PROPOSED → APPROVED workflow.
5. Every `crm_sales_order_items` row in the DB is carton-valid by construction.

### Email CRM agent prompt

The agent's instruction layer (system prompt + injected context) is updated with the carton rule so 2.1 is executed deliberately rather than emerging:

- **Rule in the system instruction:** SKUs are sold per carton only; every SKU has a pack size; a non-multiple quantity means **no order is created**; reply naming the SKU + pack size + the two nearest valid multiples; create the draft only on a confirmed valid multiple; reply in the buyer's language.
- **Pack sizes injected from live SKU records** at prompt-build time — the same `Sku.packSize` the server validates against. Never a hardcoded list, never a KB lookup: a repack must not leave the agent quoting a stale pack size.
- **Failure isolation:** if the agent cannot resolve a SKU's pack size (unknown SKU, lookup failure), it asks the buyer to clarify rather than guessing a multiple.

This pairs with the KB article below: the prompt carries the *behavior*, the KB carries the *explanation* the agent can cite.

### Knowledge base

One rep-facing SOP article, authored/updated as KB content and re-embedded (the existing `ai-embedding` path — changed content must be re-indexed or the assistant retrieves stale text):

- **"Entering a sales order in cartons"** — how the carton field works, why a non-multiple is rejected with a pack-size message, and what to tell a buyer who asks for a broken quantity.
- Scope is deliberately **prose-only knowledge that has no other source of truth**. Per-SKU pack sizes are *not* duplicated into the KB — they are answered from the live SKU record, so the answer survives the next repack.

## Migration & seed

- Migration is additive (`@default(1)`); existing rows backfill to piece-only.
- The seeder is rewritten: realistic `packSize` per SKU (product A = 20, etc.), SO lines generated as carton multiples (qty = N × packSize), and piece-only SKUs (`packSize = 1`) covered as the degenerate path.
- ⚠️ **Known limitation (stated, not fixed):** this is **not safe to run against a production DB holding real orders** — historical SOs would all read as `packSize 1` and their carton display would be wrong. If this ever ships to real data, a backfill that snapshots `SalesOrderItem.packSize` from each line's SKU must be written first. Acceptable now because the user has approved dropping the seeder and reseeding.

## Testing

Server (implemented by backend, executed by quality-engineer):

- Create SO with carton-multiple lines → succeeds; line `packSize` snapshot equals SKU's.
- Create SO with a non-multiple line → rejected with pack-size message.
- Update SO: editing a line preserves its snapshot; swapping a SKU re-snapshots.
- Carton-multiple enforcement cannot be bypassed by passing a raw piece count that isn't a multiple.
- SKU `packSize = 1` path: any quantity valid.
- Seed produces carton-multiple SO lines only.
- Email CRM agent: non-multiple inbound order produces **no** SO; a valid multiple on the buyer's reply produces the draft.

Client: carton input live-computation and inline non-multiple flagging (unit-testable in isolation); e2e deferred per the existing convention (client suite covers auth + crm-smoke only).

## Out of scope (v1)

- Inner box / pallet levels (A2/A3) — the model generalizes if needed later.
- Partial cartons / loose pcs (B2/B3) — storage is unit-safe if this is ever needed; it becomes a UI change, not a migration.
- Price per carton / carton discount pricing (C2/C3).
- Lot / batch identity: batch numbers, manufacture/expiry date, FEFO (option B from brainstorming).
- Action program & event proposal SKU quantities — remain in pieces (planning targets).
- Reporting changes — reports continue to sum pieces.
- KB product-reference / pack-size articles (K2) — SKU record is the trusted source; KB duplication would drift on repack.
- Production-data backfill of `SalesOrderItem.packSize`.

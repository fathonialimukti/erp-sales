# Entering a Sales Order in Cartons

Every SKU is sold **per carton**, not per piece. Each SKU carries a pack size — the number of pieces in one carton — and sales order lines are entered, displayed, and printed as carton counts, with the piece equivalent always shown alongside.

Pack sizes live on the **SKU record**, not in this article. A SKU's list and detail page render the value as `20 pcs/carton` (or `per piece` when the pack size is 1). Products get repacked, so always read the pack size from the SKU being ordered — never from memory, a note, or this document. This article explains the mechanic only; the SKU record is the single trusted source for any pack-size fact.

## How the Carton Field Works

On the sales order form the line quantity is labelled **Qty (carton)**. Type the number of cartons the buyer wants — `3`, not the piece count. As you type, the form shows the piece conversion (`3 × 20 = 60`) and the line total recomputes live.

Prices stay **per piece**; the carton total is derived from them. The order form, the order detail page, and the printed PDF all render the line as `3 carton (60 pcs)`, so the buyer, the rep, and the warehouse all read the same quantity.

## Why a Broken Quantity Is Rejected

Only **whole cartons** are sold — no partial cartons, no loose pieces. The server rejects any line whose piece count is not a positive multiple of the SKU's pack size, and the rejection message names the pack size so it is actionable. For a SKU packed 20 to a carton it reads:

> Product A is only sold per carton of 20 pcs

The form flags the same problem inline, on the field, before submit: **Must be a multiple of 20**. There is no override, no rounding, and no back-door path — every order line anywhere in the system is a whole number of cartons by construction, including lines drafted from emailed orders.

A SKU with a pack size of 1 is the piece-only exception: any quantity is valid, and cartons equal pieces.

## What to Tell a Buyer Who Asks for a Broken Quantity

Buyers routinely ask for a piece count that is not a whole carton — say 50 pcs of a product packed 20 to a carton. Do not enter the order and do not promise loose pieces. Look up the SKU's pack size, then reply with the two nearest valid multiples and let the buyer pick:

> Product A is only sold per carton of 20 pcs. You asked for 50 — shall I make it 40 (2 carton) or 60 (3 carton)?

Always quote the carton count **and** the piece equivalent together, so the buyer can compare like for like. Pricing is per piece, so the line total follows the confirmed quantity directly. Create the order only after the buyer confirms a valid multiple.

The same rule applies automatically to emailed orders: a broken quantity is never drafted into the order book — the buyer is asked to confirm a valid multiple first, and the draft is created only on their reply.

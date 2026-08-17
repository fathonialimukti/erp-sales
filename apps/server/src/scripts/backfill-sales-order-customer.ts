/**
 * Backfill `customerId` on sales orders that were created without it.
 *
 * Background: the PH seeder (src/prisma/seed/sales-orders.ts) originally
 * created sales orders with only `outletId` + `areaId`, leaving
 * `customerId` NULL. The SalesOrder schema marks `customerId` as
 * `String?` (nullable, onDelete: SetNull), so the rows are valid but
 * the frontend crashes at `row.original.customer.name`.
 *
 * This script looks up each affected order's outlet and copies its
 * `customerId` onto the order. Idempotent: skips rows that already
 * have a `customerId`, and skips orders whose outlet has no customer.
 *
 * Usage: bun src/scripts/backfill-sales-order-customer.ts
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

async function main() {
  const affected = await prisma.salesOrder.findMany({
    where: { customerId: null },
    select: { id: true, outletId: true },
  });

  if (affected.length === 0) {
    console.log('✓ No sales orders with NULL customerId. Nothing to backfill.');
    return;
  }

  console.log(`↻ Found ${affected.length} sales order(s) with NULL customerId.`);

  // Fetch the customer for each distinct outlet in one pass
  const outletIds = [...new Set(affected.map((o) => o.outletId))];
  const outlets = await prisma.outlet.findMany({
    where: { id: { in: outletIds } },
    select: { id: true, customerId: true },
  });
  const customerByOutlet = new Map(outlets.map((o) => [o.id, o.customerId]));

  let fixed = 0;
  let skipped = 0;
  for (const order of affected) {
    const customerId = customerByOutlet.get(order.outletId);
    if (!customerId) {
      // Outlet itself has no customer — leave the order null
      skipped += 1;
      continue;
    }
    await prisma.salesOrder.update({
      where: { id: order.id },
      data: { customerId },
    });
    fixed += 1;
  }

  console.log(`✓ Backfilled ${fixed} order(s). Skipped ${skipped} (outlet has no customer).`);
}

main()
  .catch((err) => {
    console.error('✗ Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

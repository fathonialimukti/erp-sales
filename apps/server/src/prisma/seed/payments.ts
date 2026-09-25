// =============================================
// PAYMENTS — COLLECTION REALITY (COD/NET7/NET14)
// =============================================
// ~75% of approved orders get paid. Sari-sari pays COD or NET7 (GCash/Maya/cash),
// chains pay NET14/NET30 via bank transfer. Deterministic.

import { prisma } from "../../lib/prisma.js";
import { PAYMENT_METHODS } from "./constants.js";
import { type ApprovedOrderSeed } from "./sales-orders.js";

export async function seedPayments(
  approvedOrders: ApprovedOrderSeed[],
  customerIdsByOutlet: Record<string, string>,
  rand: () => number,
): Promise<number> {
  console.log("💳 Seeding payments...");

  let count = 0;
  const batch: Array<{
    salesOrderId: string;
    customerId: string;
    date: Date;
    amount: number;
    method: string;
    reference: string;
  }> = [];

  for (const order of approvedOrders) {
    if (rand() > 0.75) continue; // ~75% of approved orders get paid

    const customerId = customerIdsByOutlet[order.outletId];
    if (!customerId) continue;

    // Payment lands 0–14 days after order (COD same-day, NET7/NET14 later)
    const daysAfter = Math.floor(rand() * 15);
    const paymentDate = new Date(order.date);
    paymentDate.setDate(paymentDate.getDate() + daysAfter);

    batch.push({
      salesOrderId: order.id,
      customerId,
      date: paymentDate,
      amount: order.grandTotal,
      method: PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)]!,
      reference: `PAY-${String(count + 1).padStart(6, "0")}`,
    });
    count += 1;

    if (batch.length >= 500) {
      await prisma.payment.createMany({ data: batch });
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await prisma.payment.createMany({ data: batch });
  }

  console.log(`✓ ${count} payments`);
  return count;
}
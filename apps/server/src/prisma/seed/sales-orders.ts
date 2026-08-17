// =============================================
// SALES ORDERS — 12 MONTHS OF DSD HISTORY
// =============================================
// ~9,400 orders, 2–4 lines each (~28k items), 12% VAT, channel-tiered
// discounts, seasonality (Christmas peak, school season, typhoon dip).
// Deterministic: seeded PRNG (mulberry32) — no faker.

import { prisma } from "../../lib/prisma.js";
import {
  CHANNEL_DISCOUNT_PCT,
  CHANNEL_ORDER_CONVERSION,
  CHANNEL_VISITS_PER_MONTH,
  HISTORY_MONTHS,
  MONTH_SEASONALITY,
  nextSalesOrderNumber,
  PH_VAT_PERCENT,
  type ChannelTier,
} from "./constants.js";
import { SKUS } from "./catalog.js";

// Deterministic PRNG (mulberry32) — same seed → same data every run
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type OrderLineSeed = {
  skuCode: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
};

export type OrderSeed = {
  documentNumber: string;
  date: Date;
  outletCode: string;
  channel: ChannelTier;
  paymentTerms: string;
  lines: OrderLineSeed[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  approvalStatus: "APPROVED" | "PROPOSED" | "DRAFT" | "REJECTED";
};

export type OutletSeedForOrders = {
  code: string;
  channel: ChannelTier;
  paymentTerms: string;
  areaId: string;
  customerId: string;
};

export type ApprovedOrderSeed = {
  id: string;
  grandTotal: number;
  date: Date;
  outletId: string;
};

/** SKU velocity weights — cola sachet & noodles fly, 1.5L & 90g slower. */
const SKU_VELOCITY: Record<string, number> = {
  "LF-BEV-COL-250": 5,
  "LF-BEV-COL-1500": 2,
  "LF-BEV-TEA-500": 3,
  "LF-BEV-COF-25": 4,
  "LF-SNK-CHP-45": 3,
  "LF-SNK-CHP-90": 1.5,
  "LF-NDL-CHK-60": 4,
  "LF-NDL-BEF-60": 4,
  "LF-HSH-SOP-100": 2,
  "LF-HSH-SHM-8": 3,
};

function pickWeightedSku(rand: () => number): string {
  const total = Object.values(SKU_VELOCITY).reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (const [code, weight] of Object.entries(SKU_VELOCITY)) {
    roll -= weight;
    if (roll <= 0) return code;
  }
  return "LF-BEV-COL-250";
}

function buildOrderLines(
  rand: () => number,
  channel: ChannelTier,
  skuPrices: Record<string, number>,
): OrderLineSeed[] {
  const lineCount = 2 + Math.floor(rand() * 3); // 2–4 lines
  const used = new Set<string>();
  const lines: OrderLineSeed[] = [];

  for (let i = 0; i < lineCount; i++) {
    let skuCode = pickWeightedSku(rand);
    let guard = 0;
    while (used.has(skuCode) && guard < 10) {
      skuCode = pickWeightedSku(rand);
      guard += 1;
    }
    used.add(skuCode);

    const basePrice = skuPrices[skuCode]!;
    const discountPercent = CHANNEL_DISCOUNT_PCT[channel];
    const quantity = 1 + Math.floor(rand() * 24); // 1–24 units
    const unitPrice = basePrice;
    const lineSubtotal = unitPrice * quantity;
    const lineDiscount = lineSubtotal * (discountPercent / 100);
    const lineTax = (lineSubtotal - lineDiscount) * (PH_VAT_PERCENT / 100);
    const lineTotal = lineSubtotal - lineDiscount + lineTax;

    lines.push({
      skuCode,
      quantity,
      unitPrice,
      discountPercent,
      taxPercent: PH_VAT_PERCENT,
      lineTotal: Math.round(lineTotal),
    });
  }
  return lines;
}

export function buildOrdersForMonth(
  monthOffset: number,
  outlets: OutletSeedForOrders[],
  skuPrices: Record<string, number>,
  rand: () => number,
): OrderSeed[] {
  const orders: OrderSeed[] = [];
  const now = new Date();
  const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const seasonality = MONTH_SEASONALITY[month + 1] ?? 1;

  // Per-outlet visit schedule for this month
  for (const outlet of outlets) {
    const visitsPerMonth = CHANNEL_VISITS_PER_MONTH[outlet.channel];
    const conversion = CHANNEL_ORDER_CONVERSION[outlet.channel];
    const expectedOrders = visitsPerMonth * conversion * seasonality;
    const orderCount = Math.max(1, Math.round(expectedOrders));

    for (let i = 0; i < orderCount; i++) {
      const day = 1 + Math.floor(rand() * daysInMonth);
      const date = new Date(year, month, day, 9 + Math.floor(rand() * 8), Math.floor(rand() * 60));
      const lines = buildOrderLines(rand, outlet.channel, skuPrices);

      const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
      const discountTotal = lines.reduce((sum, l) => sum + (l.unitPrice * l.quantity * l.discountPercent) / 100, 0);
      const taxTotal = lines.reduce((sum, l) => sum + (l.lineTotal - (l.unitPrice * l.quantity - (l.unitPrice * l.quantity * l.discountPercent) / 100)), 0);
      const grandTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

      // Approval mix: ~70% APPROVED, ~20% PROPOSED, ~10% DRAFT/REJECTED
      const roll = rand();
      const approvalStatus =
        roll < 0.7 ? "APPROVED" : roll < 0.9 ? "PROPOSED" : roll < 0.95 ? "DRAFT" : "REJECTED";

      orders.push({
        documentNumber: nextSalesOrderNumber(date),
        date,
        outletCode: outlet.code,
        channel: outlet.channel,
        paymentTerms: outlet.paymentTerms,
        lines,
        subtotal: Math.round(subtotal),
        discountTotal: Math.round(discountTotal),
        taxTotal: Math.round(taxTotal),
        grandTotal: Math.round(grandTotal),
        approvalStatus,
      });
    }
  }

  return orders;
}

export async function seedSalesOrders(
  outlets: OutletSeedForOrders[],
  outletIds: Record<string, string>,
  skuIds: Record<string, string>,
  repIds: string[],
  light = false,
): Promise<{ orderIds: string[]; approvedOrders: ApprovedOrderSeed[] }> {
  console.log("🧾 Seeding sales orders (12-month history)...");

  const skuPrices: Record<string, number> = {};
  for (const sku of SKUS) skuPrices[sku.code] = sku.basePrice;

  const rand = mulberry32(20260519);
  const months = light ? 3 : HISTORY_MONTHS;
  const orderIds: string[] = [];
  const approvedOrders: ApprovedOrderSeed[] = [];

  // Precompute areaId and customerId per outlet code (avoids N+1 lookups)
  const areaByOutlet = new Map(outlets.map((o) => [o.code, o.areaId]));
  const customerByOutlet = new Map(outlets.map((o) => [o.code, o.customerId]));

  for (let m = months - 1; m >= 0; m--) {
    const orders = buildOrdersForMonth(m, outlets, skuPrices, rand);
    const monthLabel = new Date(new Date().getFullYear(), new Date().getMonth() - m, 1).toLocaleDateString("en-PH", { month: "short", year: "numeric" });
    console.log(`  ${monthLabel}: ${orders.length} orders`);

    // Batch insert orders (createMany applies the ulid() default)
    const orderRows = orders.map((order) => ({
      documentNumber: order.documentNumber,
      date: order.date,
      outletId: outletIds[order.outletCode]!,
      areaId: areaByOutlet.get(order.outletCode)!,
      customerId: customerByOutlet.get(order.outletCode)!,
      currency: "PHP",
      paymentTerms: order.paymentTerms,
      source: "MANUAL",
      approvalStatus: order.approvalStatus,
      createdById: repIds[Math.floor(rand() * repIds.length)]!,
      proposedAt: order.approvalStatus === "APPROVED" || order.approvalStatus === "PROPOSED" ? order.date : null,
      approvedById: order.approvalStatus === "APPROVED" ? repIds[Math.floor(rand() * repIds.length)]! : null,
      approvedAt: order.approvalStatus === "APPROVED" ? order.date : null,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      grandTotal: order.grandTotal,
    }));

    // Insert in batches of 500
    for (let i = 0; i < orderRows.length; i += 500) {
      await prisma.salesOrder.createMany({ data: orderRows.slice(i, i + 500) });
    }

    // Fetch the created orders to get their ULIDs (needed for items + payments)
    const createdOrders = await prisma.salesOrder.findMany({
      where: { documentNumber: { in: orders.map((o) => o.documentNumber) } },
      select: { id: true, documentNumber: true, grandTotal: true, date: true, outletId: true, approvalStatus: true },
    });
    const byDoc = new Map(createdOrders.map((o) => [o.documentNumber, o]));

    // Batch insert items
    const itemRows: Array<{
      sortOrder: number;
      salesOrderId: string;
      skuId: string;
      quantity: number;
      unitPrice: number;
      discountPercent: number;
      taxPercent: number;
      lineTotal: number;
    }> = [];
    for (const order of orders) {
      const created = byDoc.get(order.documentNumber);
      if (!created) continue;
      orderIds.push(created.id);
      if (order.approvalStatus === "APPROVED") {
        approvedOrders.push({ id: created.id, grandTotal: order.grandTotal, date: order.date, outletId: created.outletId });
      }
      order.lines.forEach((line, idx) => {
        itemRows.push({
          sortOrder: idx,
          salesOrderId: created.id,
          skuId: skuIds[line.skuCode]!,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent,
          taxPercent: line.taxPercent,
          lineTotal: line.lineTotal,
        });
      });
    }
    for (let i = 0; i < itemRows.length; i += 500) {
      await prisma.salesOrderItem.createMany({ data: itemRows.slice(i, i + 500) });
    }
  }

  console.log(`✓ ${orderIds.length} sales orders (${approvedOrders.length} approved)`);
  return { orderIds, approvedOrders };
}
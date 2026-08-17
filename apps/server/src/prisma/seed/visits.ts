// =============================================
// VISIT LOGS — ROUTE-BASED FIELD ACTIVITY
// =============================================
// ~14,400 visits: sari-sari weekly (4/mo), chains bi-weekly (2/mo),
// convenience 3/mo, × 12 months. Tied to route reps. Deterministic.

import { prisma } from "../../lib/prisma.js";
import { CHANNEL_VISITS_PER_MONTH, HISTORY_MONTHS, MONTH_SEASONALITY, type ChannelTier } from "./constants.js";
import { mulberry32, type OutletSeedForOrders } from "./sales-orders.js";

const VISIT_PURPOSES = [
  "Regular route visit — stock check and order taking",
  "New product introduction — shelf placement",
  "Display check and restocking",
  "Collection and order taking",
  "Promotional activity support",
];

export async function seedVisits(
  outlets: OutletSeedForOrders[],
  outletIds: Record<string, string>,
  repIds: string[],
  light = false,
): Promise<number> {
  console.log("📋 Seeding visit logs...");

  const rand = mulberry32(20260519 + 7);
  const months = light ? 3 : HISTORY_MONTHS;
  let count = 0;
  const batch: Array<{
    salesmanId: string;
    outletId: string;
    date: Date;
    checkInAt: Date;
    checkOutAt: Date;
    purpose: string;
    notes: string;
    approvalStatus: "APPROVED" | "PROPOSED" | "DRAFT";
    submittedAt: Date;
    approvedById: string;
    approvedAt: Date;
  }> = [];

  const now = new Date();
  for (let m = months - 1; m >= 0; m--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const seasonality = MONTH_SEASONALITY[month + 1] ?? 1;

    for (const outlet of outlets) {
      const visitsPerMonth = Math.round(CHANNEL_VISITS_PER_MONTH[outlet.channel] * seasonality);
      for (let i = 0; i < visitsPerMonth; i++) {
        const day = 1 + Math.floor(rand() * daysInMonth);
        const hour = 8 + Math.floor(rand() * 9); // 8am–5pm
        const date = new Date(year, month, day, hour, Math.floor(rand() * 60));
        const checkIn = new Date(date);
        const checkOut = new Date(date);
        checkOut.setMinutes(checkOut.getMinutes() + 20 + Math.floor(rand() * 40)); // 20–60 min visit

        const roll = rand();
        const approvalStatus = roll < 0.85 ? "APPROVED" : roll < 0.95 ? "PROPOSED" : "DRAFT";

        batch.push({
          salesmanId: repIds[Math.floor(rand() * repIds.length)]!,
          outletId: outletIds[outlet.code]!,
          date,
          checkInAt: checkIn,
          checkOutAt: checkOut,
          purpose: VISIT_PURPOSES[Math.floor(rand() * VISIT_PURPOSES.length)]!,
          notes: "Route visit logged via mobile app.",
          approvalStatus,
          submittedAt: checkOut,
          approvedById: approvalStatus === "APPROVED" ? repIds[Math.floor(rand() * repIds.length)]! : null!,
          approvedAt: approvalStatus === "APPROVED" ? checkOut : null!,
        });
        count += 1;

        if (batch.length >= 500) {
          await prisma.visitLog.createMany({ data: batch });
          batch.length = 0;
        }
      }
    }
  }

  if (batch.length > 0) {
    await prisma.visitLog.createMany({ data: batch });
  }

  console.log(`✓ ${count} visit logs`);
  return count;
}
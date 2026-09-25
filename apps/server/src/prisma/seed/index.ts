// =============================================
// LUZON FOODS CORP. — PHILIPPINES SEEDER ORCHESTRATOR
// =============================================
// Usage (from apps/server):
//   bun run seed:ph --all          # everything (12 months)
//   bun run seed:ph --light        # everything, 3 months (dev speed)
//   bun run seed:ph --geo          # regions + areas only
//   bun run seed:ph --catalog      # categories + SKUs only
//   bun run seed:ph --customers    # customers + outlets + contacts
//   bun run seed:ph --users        # DSD sales force
//   bun run seed:ph --orders       # sales orders + payments + visits
//   bun run seed:ph --promos       # action programs + event proposals
//
// Deterministic — no faker. Same seed → same data every run.

import "dotenv/config";
import { prisma } from "../../lib/prisma.js";
import { seedRegionsAndAreas } from "./regions.js";
import { seedCatalog } from "./catalog.js";
import { seedCustomersAndOutlets } from "./customers.js";
import { seedUsers } from "./users.js";
import { seedSalesOrders, mulberry32 } from "./sales-orders.js";
import { seedPayments } from "./payments.js";
import { seedVisits } from "./visits.js";
import { seedActionPrograms } from "./action-programs.js";
import { seedEventProposals } from "./event-proposals.js";

const FLAGS = process.argv.slice(2);
const has = (flag: string) => FLAGS.includes(flag);
const ALL = has("--all") || has("--light");
const LIGHT = has("--light");

async function main() {
  console.log("🚀 Luzon Foods Corp. — Philippines seeder\n");

  // --- Geography ---
  if (ALL || has("--geo")) {
    await seedRegionsAndAreas();
  }

  // --- Catalog ---
  if (ALL || has("--catalog")) {
    await seedCatalog();
  }

  // --- Customers + outlets ---
  let outletIds: Record<string, string> = {};
  if (ALL || has("--customers")) {
    const result = await seedCustomersAndOutlets();
    outletIds = result.outletIds;
  }

  // --- Users ---
  let userIds: Record<string, string> = {};
  let repIds: string[] = [];
  if (ALL || has("--users")) {
    const result = await seedUsers();
    userIds = result.userIds;
    repIds = result.repIds;
  }

  // --- Transactions (orders + payments + visits) ---
  if (ALL || has("--orders")) {
    // Load existing outlets if not seeded this run
    if (Object.keys(outletIds).length === 0) {
      const outlets = await prisma.outlet.findMany({ select: { code: true, id: true } });
      for (const outlet of outlets) {
        if (outlet.code) outletIds[outlet.code] = outlet.id;
      }
    }
    if (repIds.length === 0) {
      const reps = await prisma.user.findMany({ where: { email: { startsWith: "rep." } }, select: { id: true } });
      repIds = reps.map((r) => r.id);
    }

    const skuIds: Record<string, string> = {};
    const skus = await prisma.sku.findMany({ select: { code: true, id: true } });
    for (const sku of skus) {
      if (sku.code) skuIds[sku.code] = sku.id;
    }

    const outlets = await prisma.outlet.findMany({
      select: { code: true, id: true, areaId: true, customerId: true },
    });
    const outletChannel = new Map<string, string>();
    for (const outlet of outlets) {
      if (!outlet.code) continue;
      // Infer channel from code prefix
      const channel = outlet.code.startsWith("OUT-MT")
        ? "MODERN"
        : outlet.code.startsWith("OUT-CV")
          ? "CONVENIENCE"
          : "SARI_SARI";
      outletChannel.set(outlet.code, channel);
    }

    const outletSeeds = outlets
      .filter((o): o is { code: string; id: string; areaId: string; customerId: string } => o.code !== null)
      .map((o) => ({
        code: o.code,
        channel: outletChannel.get(o.code) as "SARI_SARI" | "MODERN" | "CONVENIENCE",
        paymentTerms: "COD",
        areaId: o.areaId,
        customerId: o.customerId,
      }));

    const rand = mulberry32(20260519);
    const { approvedOrders } = await seedSalesOrders(outletSeeds, outletIds, skuIds, repIds, LIGHT);

    // Customer lookup for payments
    const customerIdsByOutlet: Record<string, string> = {};
    const outletCustomers = await prisma.outlet.findMany({ select: { id: true, customerId: true } });
    for (const oc of outletCustomers) customerIdsByOutlet[oc.id] = oc.customerId;

    await seedPayments(approvedOrders, customerIdsByOutlet, rand);
    await seedVisits(outletSeeds, outletIds, repIds, LIGHT);
  }

  // --- Promos (action programs + event proposals) ---
  if (ALL || has("--promos")) {
    if (Object.keys(outletIds).length === 0) {
      const outlets = await prisma.outlet.findMany({ select: { code: true, id: true } });
      for (const outlet of outlets) {
        if (outlet.code) outletIds[outlet.code] = outlet.id;
      }
    }
    if (Object.keys(userIds).length === 0) {
      const users = await prisma.user.findMany({ select: { email: true, id: true } });
      for (const user of users) userIds[user.email] = user.id;
    }

    const skuIds: Record<string, string> = {};
    const skus = await prisma.sku.findMany({ select: { code: true, id: true } });
    for (const sku of skus) {
      if (sku.code) skuIds[sku.code] = sku.id;
    }

    const areaIds: Record<string, string> = {};
    const areas = await prisma.area.findMany({ select: { code: true, id: true } });
    for (const area of areas) {
      if (area.code) areaIds[area.code] = area.id;
    }

    await seedActionPrograms(outletIds, skuIds, userIds, areaIds);
    await seedEventProposals(skuIds, userIds, areaIds);
  }

  console.log("\n🎉 Philippines seeder completed successfully!");
}

main()
  .catch((e) => {
    console.error("\n❌ Seeding failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
/**
 * Standalone script: creates 9 guaranteed receiving transactions (3 per warehouse × 3 warehouses)
 * with completed putaway so pallets ARE on storage locations.
 *
 * Run: bun run src/prisma/seed-available-pallets.ts
 *
 * Pre-requisites:
 *   1. Database must already be seeded (permissions, roles, admin, warehouses, skus, storage locations)
 *   2. `bun run db:seed` first, then run this.
 */

import { faker } from "@faker-js/faker";
import {
  ApprovalStatus,
  MovementDirection,
  PalletStatus,
  PutawayLineStatus,
  PutawayStatus,
  WarehouseTransactionType,
} from "./generated/client.js";
import { prisma } from "../lib/prisma.js";
import { TX_CODE } from "../lib/document-number.js";

const RECEIVING_PER_WAREHOUSE = 3;
const PALLETS_PER_SKU = 2;
const SKUS_PER_TRANSACTION = 2;
const FAKER_SEED = Number(process.env.SEED_SEED) || 20260608;

function pick<T>(arr: T[]): T {
  return arr[faker.number.int({ min: 0, max: arr.length - 1 })]!;
}

function sample<T>(arr: T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const idx = faker.number.int({ min: 0, max: pool.length - 1 });
    const item = pool[idx];
    if (item) { out.push(item); pool.splice(idx, 1); }
  }
  return out;
}

function makeDocNumber(type: WarehouseTransactionType, code: string, date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const rand = faker.string.alphanumeric({ length: 6, casing: "upper" });
  return `${TX_CODE[type]}/${code}/${m}/${y}/${rand}`;
}

async function main() {
  faker.seed(FAKER_SEED);
  console.log(`🌱 Creating guaranteed available pallets (seed=${FAKER_SEED})...\n`);

  const warehouses = await prisma.warehouse.findMany({ select: { id: true, objectId: true, code: true } });
  const skus = await prisma.sku.findMany({ select: { id: true, code: true, packagesPerPallet: true, quantityPerPackage: true } });
  const suppliers = await prisma.supplier.findMany({ select: { id: true } });
  const operator = await prisma.user.findFirstOrThrow({ where: { email: "seed.operator@factory.local" }, select: { id: true } });
  const approver = await prisma.user.findFirstOrThrow({ where: { email: "seed.approver@factory.local" }, select: { id: true } });
  const creator = await prisma.user.findFirstOrThrow({ where: { email: "seed.creator@factory.local" }, select: { id: true } });

  const allLocations = await prisma.storageLocation.findMany({ select: { id: true, warehouseId: true } });
  const usedIds = new Set(
    (await prisma.pallet.findMany({ where: { storageLocationId: { not: null } }, select: { storageLocationId: true } }))
      .map(p => p.storageLocationId!)
  );

  const freeByWh = new Map<string, string[]>();
  for (const loc of allLocations) {
    if (usedIds.has(loc.id)) continue;
    if (!freeByWh.has(loc.warehouseId)) freeByWh.set(loc.warehouseId, []);
    freeByWh.get(loc.warehouseId)!.push(loc.id);
  }

  const takeFree = (wid: string): string => {
    const pool = freeByWh.get(wid);
    if (!pool?.length) throw new Error(`No free location for warehouse ${wid}`);
    return pool.pop()!;
  };

  let totalPallets = 0;
  let totalTxns = 0;

  const now = new Date();
  const txDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(now.getUTCDate(), 26)));
  const approvedAt = new Date(txDate.getTime() + 90 * 60 * 1000);

  for (const wh of warehouses) {
    const whCode = wh.code ?? wh.objectId ?? wh.id.slice(0, 4);

    for (let t = 0; t < RECEIVING_PER_WAREHOUSE; t++) {
      const docNum = makeDocNumber(WarehouseTransactionType.RECEIVING, whCode, txDate);
      const selected = sample(skus, SKUS_PER_TRANSACTION);

      const header = await prisma.receivingTransaction.create({
        data: {
          documentNumber: docNum,
          date: txDate,
          supplierId: pick(suppliers).id,
          purchaseOrderRef: docNum,
          deliveryNoteRef: `DN/${whCode}/${faker.number.int({ min: 1000, max: 9999 })}`,
          carrier: faker.company.name(),
          driverName: faker.person.fullName(),
          notes: "Guaranteed available pallet seed",
          warehouseId: wh.id,
          createdById: creator.id,
          approvedById: approver.id,
          approvedAt,
          approvalStatus: ApprovalStatus.APPROVED,
          putawayStatus: PutawayStatus.COMPLETED,
          approvalHistory: [{ action: "APPROVED", by: approver.id, at: approvedAt.toISOString() }],
        },
      });

      const movement: Array<{ skuId: string; quantity: number }> = [];

      for (const sku of selected) {
        const qty = PALLETS_PER_SKU * (Number(sku.packagesPerPallet) * Number(sku.quantityPerPackage));
        const item = await prisma.receivingTransactionItem.create({
          data: {
            receivingTransactionId: header.id,
            skuId: sku.id,
            quantity: qty,
            details: `Available pallet seed (${PALLETS_PER_SKU} pallets)`,
          },
        });
        movement.push({ skuId: sku.id, quantity: qty });

        for (let p = 0; p < PALLETS_PER_SKU; p++) {
          const locId = takeFree(wh.id);

          const pallet = await prisma.pallet.create({
            data: {
              skuId: sku.id,
              storageLocationId: null,
              status: PalletStatus.AVAILABLE,
              sourceType: WarehouseTransactionType.RECEIVING,
              sourceItemId: item.id,
            },
            select: { id: true },
          });

          await prisma.putawayLine.create({
            data: {
              transactionType: WarehouseTransactionType.RECEIVING,
              documentId: header.id,
              palletId: pallet.id,
              storageLocationId: locId,
              status: PutawayLineStatus.COMPLETED,
              completedAt: approvedAt,
              completedById: operator.id,
            },
          });

          await prisma.pallet.update({ where: { id: pallet.id }, data: { storageLocationId: locId } });
          totalPallets++;
        }
      }

      await prisma.stockMovement.createMany({
        data: movement.map(row => ({
          transactionType: WarehouseTransactionType.RECEIVING,
          direction: MovementDirection.IN,
          documentId: header.id,
          documentNumber: docNum,
          skuId: row.skuId,
          warehouseId: wh.id,
          quantity: row.quantity,
          signedQty: row.quantity,
          transactionDate: txDate,
          postedById: approver.id,
        })),
      });

      totalTxns++;
    }
  }

  console.log(`✅ Done! ${totalTxns} txns, ${totalPallets} pallets across ${warehouses.length} warehouses.`);
  const avail = await prisma.pallet.count({ where: { status: 'AVAILABLE', storageLocationId: { not: null } } });
  console.log(`   Available pallets on locations: ${avail}`);
}

main().catch(e => { console.error("❌", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());

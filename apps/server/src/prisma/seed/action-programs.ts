// =============================================
// ACTION PROGRAMS — TRADE PROMOTIONS + DISPLAY RENTAL
// =============================================
// 8 programs: 4× DISPLAY_RENTAL (cooler, endcap, FSDU, CDU — the core
// manufacturer→outlet mechanic), 1× each DISCOUNT, REBATE, FREE_ITEM, BUNDLE.
// Budgets in PHP. Approval flow Area → Region → Finance → Director.

import { prisma } from "../../lib/prisma.js";
import type { Prisma } from "../../prisma/generated/client";
import {
  CURRENCY,
  DISPLAY_RENTAL_PER_MONTH,
  nextActionProgramNumber,
  type DisplayType,
} from "./constants.js";
import { SKUS } from "./catalog.js";

const SKU_PRICES: Record<string, number> = Object.fromEntries(SKUS.map((s) => [s.code, s.basePrice]));

type ProgramSeed = {
  name: string;
  actionTypeCode: "DISCOUNT" | "BUNDLE" | "FREE_ITEM" | "REBATE" | "LOYALTY" | "DISPLAY_RENTAL";
  description: string;
  startDate: Date;
  endDate: Date;
  plannedCost: number;
  rules: Prisma.InputJsonValue;
  areaCode: string;
  outletCodes: string[];
  skuCodes: string[];
  items: Array<{ name: string; quantity: number; price: number; cost: number; notes?: string }>;
  approvalStatus: "APPROVED" | "PROPOSED" | "DRAFT";
};

function displayRules(displayType: DisplayType, durationMonths: number): Prisma.InputJsonValue {
  return {
    displayType,
    durationMonths,
    rentalPerMonth: DISPLAY_RENTAL_PER_MONTH[displayType],
    totalRental: DISPLAY_RENTAL_PER_MONTH[displayType] * durationMonths,
    placement: "In-store, high-traffic area",
    restocking: "Manufacturer sales rep restocks weekly",
  };
}

export function buildActionPrograms(): ProgramSeed[] {
  const now = new Date();
  const year = now.getFullYear();

  return [
    // --- DISPLAY RENTAL (the core mechanic) ---
    {
      name: "Luzon Cola Cooler Placement — Aling Nena's Store",
      actionTypeCode: "DISPLAY_RENTAL",
      description:
        "12-month branded 2-door cooler rental at high-volume sari-sari stores. Manufacturer supplies cooler, store provides floor space and electricity. Weekly restocking by route rep.",
      startDate: new Date(year, 0, 15),
      endDate: new Date(year, 11, 31),
      plannedCost: DISPLAY_RENTAL_PER_MONTH.COOLER * 12 * 8,
      rules: displayRules("COOLER", 12),
      areaCode: "QCR-QC",
      outletCodes: [], // filled at seed time from sari-sari outlets
      skuCodes: ["LF-BEV-COL-250", "LF-BEV-COL-1500", "LF-BEV-TEA-500"],
      items: [
        { name: "2-door branded cooler", quantity: 8, price: 18000, cost: 12000, notes: "Unit cost amortized over 12 months" },
        { name: "Cooler branding decals", quantity: 8, price: 1500, cost: 800 },
      ],
      approvalStatus: "APPROVED",
    },
    {
      name: "SM Hypermarket North EDSA — Endcap Display (2 weeks)",
      actionTypeCode: "DISPLAY_RENTAL",
      description:
        "End-of-aisle endcap display at SM Hypermarket North EDSA for the new Cola 1.5L family pack. 2-week placement, manufacturer-funded.",
      startDate: new Date(year, 10, 1),
      endDate: new Date(year, 10, 14),
      plannedCost: DISPLAY_RENTAL_PER_MONTH.ENDCAP,
      rules: displayRules("ENDCAP", 1),
      areaCode: "QCR-QC",
      outletCodes: [],
      skuCodes: ["LF-BEV-COL-1500"],
      items: [
        { name: "Endcap display unit", quantity: 1, price: 25000, cost: 15000 },
        { name: "POS banner set", quantity: 1, price: 3000, cost: 1200 },
      ],
      approvalStatus: "APPROVED",
    },
    {
      name: "Puregold Sucat — FSDU Placement (1 month)",
      actionTypeCode: "DISPLAY_RENTAL",
      description:
        "Free-standing display unit at Puregold Sucat for snack and noodle impulse buys. 1-month placement with weekly restocking.",
      startDate: new Date(year, 4, 1),
      endDate: new Date(year, 4, 31),
      plannedCost: DISPLAY_RENTAL_PER_MONTH.FSDU,
      rules: displayRules("FSDU", 1),
      areaCode: "SMD-PRQ",
      outletCodes: [],
      skuCodes: ["LF-SNK-CHP-45", "LF-SNK-CHP-90", "LF-NDL-CHK-60", "LF-NDL-BEF-60"],
      items: [
        { name: "Free-standing display unit", quantity: 1, price: 18000, cost: 10000 },
        { name: "Shelf edging + strut cards", quantity: 1, price: 2500, cost: 900 },
      ],
      approvalStatus: "APPROVED",
    },
    {
      name: "7-Eleven BGC — Counter Display Unit (CDU)",
      actionTypeCode: "DISPLAY_RENTAL",
      description:
        "Counter display unit at 7-Eleven BGC checkout for sachet items (cola sachet, shampoo sachet, coffee sachet). 3-month placement.",
      startDate: new Date(year, 6, 1),
      endDate: new Date(year, 8, 30),
      plannedCost: DISPLAY_RENTAL_PER_MONTH.CDU * 3,
      rules: displayRules("CDU", 3),
      areaCode: "SMD-TGG",
      outletCodes: [],
      skuCodes: ["LF-BEV-COL-250", "LF-BEV-COF-25", "LF-HSH-SHM-8"],
      items: [
        { name: "Counter display unit", quantity: 1, price: 8000, cost: 4500 },
        { name: "Dummy packs", quantity: 12, price: 150, cost: 60 },
      ],
      approvalStatus: "PROPOSED",
    },

    // --- DISCOUNT (off-invoice) ---
    {
      name: "Summer Cola Blast — 12% Off-Invoice Discount",
      actionTypeCode: "DISCOUNT",
      description:
        "Off-invoice 12% discount on Cola 1.5L and Iced Tea 500ml for all sari-sari stores, April–June. Drives summer beverage volume.",
      startDate: new Date(year, 3, 1),
      endDate: new Date(year, 5, 30),
      plannedCost: 450000,
      rules: {
        discountPercent: 12,
        mechanism: "OFF_INVOICE",
        appliesTo: "SARI_SARI",
        minOrderQty: 12,
      },
      areaCode: "MNL-MLA",
      outletCodes: [],
      skuCodes: ["LF-BEV-COL-1500", "LF-BEV-TEA-500"],
      items: [],
      approvalStatus: "APPROVED",
    },

    // --- REBATE (bill-back) ---
    {
      name: "Noodle Volume Rebate — ₱50/Case Bill-Back",
      actionTypeCode: "REBATE",
      description:
        "Bill-back rebate of ₱50 per case (24 pcs) on Instant Noodles for stores purchasing 100+ cases per month. Paid via GCash after month-end reconciliation.",
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31),
      plannedCost: 600000,
      rules: {
        rebatePerCase: 50,
        caseSize: 24,
        thresholdCases: 100,
        mechanism: "BILL_BACK",
        settlement: "GCash",
      },
      areaCode: "CAM-CLC",
      outletCodes: [],
      skuCodes: ["LF-NDL-CHK-60", "LF-NDL-BEF-60"],
      items: [],
      approvalStatus: "APPROVED",
    },

    // --- FREE_ITEM (free goods) ---
    {
      name: "Buy 12 Get 1 Free — Potato Chips",
      actionTypeCode: "FREE_ITEM",
      description:
        "Free goods deal: buy 12 bags of Potato Chips (any variant), get 1 free. Runs during school season (May–June) for convenience stores.",
      startDate: new Date(year, 4, 1),
      endDate: new Date(year, 5, 30),
      plannedCost: 180000,
      rules: {
        buyQty: 12,
        freeQty: 1,
        mechanism: "FREE_GOODS",
        appliesTo: "CONVENIENCE",
      },
      areaCode: "QCR-PSG",
      outletCodes: [],
      skuCodes: ["LF-SNK-CHP-45", "LF-SNK-CHP-90"],
      items: [],
      approvalStatus: "APPROVED",
    },

    // --- BUNDLE ---
    {
      name: "Cola + Chips Combo Pack",
      actionTypeCode: "BUNDLE",
      description:
        "Bundle deal: Cola 1.5L + Potato Chips 45g at ₱85 (vs ₱95 separately). For modern trade chains, Q4 Christmas season.",
      startDate: new Date(year, 9, 1),
      endDate: new Date(year, 11, 31),
      plannedCost: 350000,
      rules: {
        bundlePrice: 85,
        regularPrice: 95,
        components: ["LF-BEV-COL-1500", "LF-SNK-CHP-45"],
        mechanism: "BUNDLE",
      },
      areaCode: "SMD-MKT",
      outletCodes: [],
      skuCodes: ["LF-BEV-COL-1500", "LF-SNK-CHP-45"],
      items: [],
      approvalStatus: "PROPOSED",
    },
  ];
}

export async function seedActionPrograms(
  outletIds: Record<string, string>,
  skuIds: Record<string, string>,
  userIds: Record<string, string>,
  areaIds: Record<string, string>,
): Promise<number> {
  console.log("🎯 Seeding action programs (display rental + trade promos)...");

  const programs = buildActionPrograms();
  const actionTypeIds: Record<string, string> = {};
  const actionTypes = await prisma.actionType.findMany({ select: { code: true, id: true } });
  for (const at of actionTypes) actionTypeIds[at.code] = at.id;

  let count = 0;

  for (const program of programs) {
    // Pick outlets: DISPLAY_RENTAL targets specific channels
    const allOutletCodes = Object.keys(outletIds);
    const outletCodes =
      program.outletCodes.length > 0
        ? program.outletCodes
        : allOutletCodes.slice(0, Math.min(12, allOutletCodes.length));

    const created = await prisma.actionProgram.create({
      data: {
        documentNumber: nextActionProgramNumber(),
        name: program.name,
        actionTypeId: actionTypeIds[program.actionTypeCode]!,
        description: program.description,
        startDate: program.startDate,
        endDate: program.endDate,
        plannedCost: program.plannedCost,
        budgetCurrency: CURRENCY,
        rules: program.rules,
        areaId: areaIds[program.areaCode]!,
        picId: userIds["trade@luzonfoods.ph"]!,
        approvalStatus: program.approvalStatus,
        createdById: userIds["trade@luzonfoods.ph"]!,
        outlets: {
          create: outletCodes.slice(0, 12).map((code) => ({ outletId: outletIds[code]! })),
        },
        skus: {
          create: program.skuCodes.map((skuCode) => {
            const price = SKU_PRICES[skuCode] ?? 0;
            return {
              skuId: skuIds[skuCode]!,
              quantity: 12,
              price,
              discount: 0,
              priceAfterDiscount: price,
              cost: Math.round(price * 0.6),
              tax: 0,
              total: price * 12,
            };
          }),
        },
        items: {
          create: program.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            cost: item.cost,
            notes: item.notes,
          })),
        },
      },
    });
    count += 1;
    console.log(`  ✓ ${created.documentNumber} — ${program.name} (${program.actionTypeCode})`);
  }

  console.log(`✓ ${count} action programs`);
  return count;
}
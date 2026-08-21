// =============================================
// EVENT PROPOSALS — STORE OPENINGS + SAMPLING DAYS
// =============================================
// 3 events: new-store opening sampling, sari-sari owner appreciation day,
// mall sampling activation. Budgets in PHP.

import { prisma } from "../../lib/prisma.js";
import { CURRENCY, nextEventProposalNumber } from "./constants.js";
import { SKUS } from "./catalog.js";

const SKU_PRICES: Record<string, number> = Object.fromEntries(SKUS.map((s) => [s.code, s.basePrice]));

type EventSeed = {
  name: string;
  eventTypeCode: string;
  description: string;
  venue: string;
  eventDate: Date;
  eventEndDate: Date;
  organizerName: string;
  organizerContact: string;
  areaCode: string;
  plannedCost: number;
  skuCodes: string[];
  approvalStatus: "APPROVED" | "PROPOSED" | "DRAFT";
};

export function buildEventProposals(): EventSeed[] {
  const now = new Date();
  const year = now.getFullYear();

  return [
    {
      name: "SM Hypermarket North EDSA Grand Opening — Sampling Booth",
      eventTypeCode: "GRAND_OPENING",
      description:
        "Sampling booth at the new SM Hypermarket North EDSA. Product sampling of Cola 1.5L, Potato Chips, and Instant Noodles for opening-week shoppers.",
      venue: "SM City North EDSA, Quezon City",
      eventDate: new Date(year, 2, 15),
      eventEndDate: new Date(year, 2, 17),
      organizerName: "SM Retail Events Team",
      organizerContact: "events@smretail.ph",
      areaCode: "QCR-QC",
      plannedCost: 120000,
      skuCodes: ["LF-BEV-COL-1500", "LF-SNK-CHP-45", "LF-NDL-CHK-60"],
      approvalStatus: "APPROVED",
    },
    {
      name: "Sari-Sari Store Owner Appreciation Day — Quezon City",
      eventTypeCode: "BAZAAR",
      description:
        "Half-day appreciation event for top 50 sari-sari store owners in Quezon City. Product showcase, loyalty program launch, and raffle.",
      venue: "Luzon Foods Corp. HQ, Quezon City",
      eventDate: new Date(year, 6, 20),
      eventEndDate: new Date(year, 6, 20),
      organizerName: "Luzon Foods Trade Marketing",
      organizerContact: "trade@luzonfoods.ph",
      areaCode: "QCR-QC",
      plannedCost: 85000,
      skuCodes: ["LF-BEV-COL-250", "LF-BEV-COF-25", "LF-HSH-SHM-8"],
      approvalStatus: "APPROVED",
    },
    {
      name: "Back-to-School Mall Sampling — Robinsons Galleria",
      eventTypeCode: "SAMPLING",
      description:
        "Back-to-school sampling activation at Robinsons Galleria. Focus on noodle and snack SKUs for students.",
      venue: "Robinsons Galleria, Ortigas, Pasig",
      eventDate: new Date(year, 4, 20),
      eventEndDate: new Date(year, 4, 22),
      organizerName: "Robinsons Malls Marketing",
      organizerContact: "marketing@robinsonsmalls.ph",
      areaCode: "QCR-PSG",
      plannedCost: 95000,
      skuCodes: ["LF-NDL-CHK-60", "LF-NDL-BEF-60", "LF-SNK-CHP-45"],
      approvalStatus: "PROPOSED",
    },
  ];
}

export async function seedEventProposals(
  skuIds: Record<string, string>,
  userIds: Record<string, string>,
  areaIds: Record<string, string>,
): Promise<number> {
  console.log("🎪 Seeding event proposals...");

  const events = buildEventProposals();
  const eventTypeIds: Record<string, string> = {};
  const eventTypes = await prisma.eventType.findMany({ select: { code: true, id: true } });
  for (const et of eventTypes) eventTypeIds[et.code] = et.id;

  let count = 0;

  for (const event of events) {
    const created = await prisma.eventProposal.create({
      data: {
        documentNumber: nextEventProposalNumber(),
        name: event.name,
        eventTypeId: eventTypeIds[event.eventTypeCode],
        description: event.description,
        venue: event.venue,
        eventDate: event.eventDate,
        eventEndDate: event.eventEndDate,
        organizerName: event.organizerName,
        organizerContact: event.organizerContact,
        areaId: areaIds[event.areaCode]!,
        plannedCost: event.plannedCost,
        currency: CURRENCY,
        approvalStatus: event.approvalStatus,
        createdById: userIds["trade@luzonfoods.ph"]!,
        skus: {
          create: event.skuCodes.map((skuCode) => {
            const price = SKU_PRICES[skuCode] ?? 0;
            return {
              skuId: skuIds[skuCode]!,
              quantity: 50,
              price,
              tax: 0,
              total: price * 50,
            };
          }),
        },
      },
    });
    count += 1;
    console.log(`  ✓ ${created.documentNumber} — ${event.name}`);
  }

  console.log(`✓ ${count} event proposals`);
  return count;
}
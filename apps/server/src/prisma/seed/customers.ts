// =============================================
// CUSTOMERS — OUTLET UNIVERSE (Metro Manila)
// =============================================
// Manufacturer → outlet direct (DSD). Customers ARE the outlets:
// ~250 sari-sari stores (independent, invented names), ~40 modern trade
// (real chains with real district branches), ~10 convenience/drugstore.

import { prisma } from "../../lib/prisma.js";
import { CHANNEL, CHANNEL_PAYMENT_TERMS, type ChannelTier } from "./constants.js";
import { AREAS } from "./regions.js";

export type OutletSeed = {
  code: string;
  name: string;
  customerName: string;
  areaCode: string;
  channel: ChannelTier;
  address: string;
  contactName: string;
  contactPhone: string;
  paymentTerms: string;
  creditLimit: number;
};

// --- Real modern-trade chain branches (district-accurate) ---
const MODERN_BRANCHES: Array<{ chain: string; areaCode: string; branch: string; address: string }> = [
  // SM Markets
  { chain: "SM Hypermarket", areaCode: "QCR-QC", branch: "North EDSA", address: "SM City North EDSA, Quezon City" },
  { chain: "SM Hypermarket", areaCode: "SMD-MKT", branch: "Makati", address: "SM Makati, Ayala Center, Makati" },
  { chain: "SM Supermarket", areaCode: "SMD-PRQ", branch: "Sucat", address: "SM City Sucat, Parañaque" },
  { chain: "Savemore Market", areaCode: "CAM-CLC", branch: "Monumento", address: "Rizal Avenue Extension, Caloocan" },
  { chain: "Savemore Market", areaCode: "QCR-PSG", branch: "Pasig", address: "E. Rodriguez Jr. Ave, Pasig" },
  // Robinsons
  { chain: "Robinsons Supermarket", areaCode: "QCR-PSG", branch: "Galleria", address: "Robinsons Galleria, Ortigas, Pasig" },
  { chain: "Robinsons Supermarket", areaCode: "QCR-MRK", branch: "Magnolia", address: "Robinsons Magnolia, Quezon City" },
  { chain: "Robinsons Supermarket", areaCode: "SMD-LPN", branch: "Las Piñas", address: "Robinsons Place Las Piñas" },
  // Puregold
  { chain: "Puregold", areaCode: "SMD-PRQ", branch: "Sucat", address: "Puregold Sucat, Parañaque" },
  { chain: "Puregold", areaCode: "QCR-PSG", branch: "Pasig", address: "Puregold Pasig, E. Rodriguez Ave" },
  { chain: "Puregold", areaCode: "CAM-CLC", branch: "Caloocan", address: "Puregold Caloocan, Rizal Ave Ext" },
  // WalterMart
  { chain: "WalterMart", areaCode: "SMD-MKT", branch: "Makati", address: "WalterMart Makati, Chino Roces Ave" },
  { chain: "WalterMart", areaCode: "QCR-QC", branch: "Quezon Ave", address: "WalterMart Quezon Ave, QC" },
  // Warehouse clubs
  { chain: "Landers Superstore", areaCode: "SMD-PSY", branch: "Pasay", address: "Landers Arcovia, Pasay" },
  { chain: "Landers Superstore", areaCode: "QCR-QC", branch: "Quezon City", address: "Landers Katipunan, QC" },
  { chain: "S&R Membership Shopping", areaCode: "SMD-PRQ", branch: "Aseana", address: "S&R Aseana, Parañaque" },
  // Others
  { chain: "All Day Supermarket", areaCode: "SMD-TGG", branch: "BGC", address: "All Day BGC, Taguig" },
  { chain: "Dali Everyday Grocery", areaCode: "CAM-VLZ", branch: "Valenzuela", address: "Dali Valenzuela, MacArthur Hwy" },
  { chain: "MerryMart", areaCode: "QCR-QC", branch: "Quezon City", address: "MerryMart CityMall, QC" },
  { chain: "Prince Hypermart", areaCode: "CAM-CLC", branch: "Caloocan", address: "Prince Hypermart, Caloocan" },
  { chain: "Fisher Supermarket", areaCode: "QCR-QC", branch: "Quezon City", address: "Fisher Mall, Quezon Ave, QC" },
  { chain: "South Supermarket", areaCode: "QCR-PSG", branch: "Pasig", address: "South Supermarket, Pasig" },
  { chain: "Unimart", areaCode: "SMD-MKT", branch: "Makati", address: "Unimart, Greenhills, San Juan" },
  { chain: "Makati Supermarket", areaCode: "SMD-MKT", branch: "Alabang", address: "Makati Supermarket Alabang, Muntinlupa" },
];

// --- Convenience / drugstore chains ---
const CONVENIENCE_BRANCHES: Array<{ chain: string; areaCode: string; branch: string; address: string }> = [
  { chain: "7-Eleven", areaCode: "SMD-TGG", branch: "BGC", address: "7-Eleven BGC, Taguig" },
  { chain: "7-Eleven", areaCode: "QCR-QC", branch: "Cubao", address: "7-Eleven Cubao, Quezon City" },
  { chain: "Ministop", areaCode: "SMD-MKT", branch: "Makati", address: "Ministop Makati, Ayala Ave" },
  { chain: "FamilyMart", areaCode: "QCR-PSG", branch: "Ortigas", address: "FamilyMart Ortigas, Pasig" },
  { chain: "Mercury Drug", areaCode: "SMD-PRQ", branch: "Parañaque", address: "Mercury Drug, Sucat Rd, Parañaque" },
  { chain: "Mercury Drug", areaCode: "CAM-CLC", branch: "Caloocan", address: "Mercury Drug, Monumento, Caloocan" },
  { chain: "Watsons", areaCode: "SMD-TGG", branch: "BGC", address: "Watsons BGC, Taguig" },
  { chain: "Watsons", areaCode: "QCR-QC", branch: "Trinoma", address: "Watsons Trinoma, Quezon City" },
  { chain: "Rose Pharmacy", areaCode: "SMD-LPN", branch: "Las Piñas", address: "Rose Pharmacy, Las Piñas" },
  { chain: "Southstar Drug", areaCode: "CAM-VLZ", branch: "Valenzuela", address: "Southstar Drug, Valenzuela" },
];

// --- Sari-sari store name templates (invented, PH-flavored) ---
const SARI_PREFIXES = ["Aling", "Mang", "Ka", "Nanay", "Tatay", "Kuya", "Ate"];
const SARI_NAMES = ["Nena", "Ramon", "Lita", "Pedro", "Cora", "Jun", "Marites", "Rolly", "Baby", "Edwin", "Lorna", "Dante", "Fe", "Rico", "Gloria", "Nestor", "Imelda", "Rene", "Susan", "Tony", "Luz", "Mario", "Elena", "Boy", "Nida", "Rudy", "Tess", "Oscar", "Mila", "Fred"];
const SARI_SUFFIXES = ["Sari-Sari Store", "Store", "Variety Store", "Mini Grocery", "Tindahan"];

// --- Real street/district names per area (for addresses) ---
const AREA_STREETS: Record<string, string[]> = {
  "MNL-MLA": ["Tondo, Manila", "Binondo, Manila", "Sampaloc, Manila", "Quiapo, Manila", "Ermita, Manila"],
  "QCR-QC": ["Commonwealth Ave, QC", "Aurora Blvd, QC", "EDSA, Cubao, QC", "Quezon Ave, QC", "Katipunan Ave, QC", "Tandang Sora, QC"],
  "QCR-PTG": ["Pateros, M. Almeda St", "Pateros, B. Morcilla St"],
  "QCR-MRK": ["Marcos Highway, Marikina", "J.P. Rizal St, Marikina", "Sumulong Hwy, Marikina"],
  "QCR-PSG": ["Ortigas Ave, Pasig", "E. Rodriguez Jr Ave, Pasig", "C. Raymundo Ave, Pasig", "F. Legaspi St, Pasig"],
  "QCR-SJU": ["Greenhills, San Juan", "N. Domingo St, San Juan"],
  "QCR-MDL": ["Boni Ave, Mandaluyong", "Shaw Blvd, Mandaluyong", "EDSA, Mandaluyong"],
  "CAM-CLC": ["Rizal Ave Ext, Caloocan", "Monumento, Caloocan", "A. Mabini St, Caloocan", "Bagong Barrio, Caloocan"],
  "CAM-MLB": ["C. Arellano St, Malabon", "Rizal St, Malabon"],
  "CAM-NVT": ["M. Naval St, Navotas", "R. Pascual St, Navotas"],
  "CAM-VLZ": ["MacArthur Hwy, Valenzuela", "Paso de Blas, Valenzuela", "Polo, Valenzuela"],
  "SMD-MKT": ["Ayala Ave, Makati", "Chino Roces Ave, Makati", "P. Burgos St, Makati", "Gil Puyat Ave, Makati"],
  "SMD-TGG": ["BGC, Taguig", "C-5 Road, Taguig", "Bayani Rd, Taguig", "Lower Bicutan, Taguig"],
  "SMD-PRQ": ["Sucat Rd, Parañaque", "Dr. A. Santos Ave, Parañaque", "Ninoy Aquino Ave, Parañaque"],
  "SMD-PSY": ["Taft Ave, Pasay", "EDSA, Pasay", "Roxas Blvd, Pasay"],
  "SMD-LPN": ["Alabang-Zapote Rd, Las Piñas", "C.V. Starr Ave, Las Piñas", "BF Resort, Las Piñas"],
  "SMD-MTL": ["National Rd, Alabang, Muntinlupa", "Filinvest City, Muntinlupa", "Sucat Rd, Muntinlupa"],
};

// --- Invented PH contact names ---
const CONTACT_NAMES = [
  "Rowena Santos", "Ramon Roldan", "Lita Villanueva", "Pedro Manalo", "Cora Bautista",
  "Jun Dela Cruz", "Marites Ramos", "Rolly Mendoza", "Baby Aquino", "Edwin Garcia",
  "Lorna Castillo", "Dante Reyes", "Fe Navarro", "Rico Salazar", "Gloria Torres",
  "Nestor Domingo", "Imelda Cruz", "Rene Pascual", "Susan Flores", "Tony Rivera",
  "Luz Gutierrez", "Mario Villar", "Elena Santiago", "Boy Mercado", "Nida Ocampo",
  "Rudy Fernandez", "Tess Aguirre", "Oscar Lim", "Mila Castro", "Fred Gonzales",
];

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length]!;
}

function buildSariSariOutlets(): OutletSeed[] {
  const outlets: OutletSeed[] = [];
  let seq = 0;

  for (const area of AREAS) {
    const sariCount = Math.round(area.outlets * 0.83); // ~83% of outlets are sari-sari
    const streets = AREA_STREETS[area.code] ?? ["Barangay, Metro Manila"];
    for (let i = 0; i < sariCount; i++) {
      seq += 1;
      const name = `${pick(SARI_PREFIXES, seq)} ${pick(SARI_NAMES, seq)}'s ${pick(SARI_SUFFIXES, seq)}`;
      const terms = CHANNEL_PAYMENT_TERMS.SARI_SARI;
      outlets.push({
        code: `OUT-SS-${String(seq).padStart(4, "0")}`,
        name,
        customerName: name,
        areaCode: area.code,
        channel: CHANNEL.SARI_SARI,
        address: pick(streets, seq),
        contactName: pick(CONTACT_NAMES, seq),
        contactPhone: `+63 9${String(17 + (seq % 10))} ${String(100 + (seq % 900))} ${String(1000 + (seq % 9000))}`,
        paymentTerms: pick(terms, seq),
        creditLimit: 5000 + (seq % 5) * 2500, // ₱5k–15k for sari-sari
      });
    }
  }
  return outlets;
}

function buildChainOutlets(): OutletSeed[] {
  const outlets: OutletSeed[] = [];
  let seq = 0;

  for (const branch of MODERN_BRANCHES) {
    seq += 1;
    const terms = CHANNEL_PAYMENT_TERMS.MODERN;
    outlets.push({
      code: `OUT-MT-${String(seq).padStart(4, "0")}`,
      name: `${branch.chain} — ${branch.branch}`,
      customerName: branch.chain,
      areaCode: branch.areaCode,
      channel: CHANNEL.MODERN,
      address: branch.address,
      contactName: pick(CONTACT_NAMES, seq + 7),
      contactPhone: `+63 2 ${String(8000 + seq)} ${String(1000 + (seq % 9000))}`,
      paymentTerms: pick(terms, seq),
      creditLimit: 200000 + (seq % 4) * 100000, // ₱200k–500k for chains
    });
  }

  for (const branch of CONVENIENCE_BRANCHES) {
    seq += 1;
    const terms = CHANNEL_PAYMENT_TERMS.CONVENIENCE;
    outlets.push({
      code: `OUT-CV-${String(seq).padStart(4, "0")}`,
      name: `${branch.chain} — ${branch.branch}`,
      customerName: branch.chain,
      areaCode: branch.areaCode,
      channel: CHANNEL.CONVENIENCE,
      address: branch.address,
      contactName: pick(CONTACT_NAMES, seq + 13),
      contactPhone: `+63 2 ${String(7000 + seq)} ${String(1000 + (seq % 9000))}`,
      paymentTerms: pick(terms, seq),
      creditLimit: 50000 + (seq % 3) * 25000, // ₱50k–100k for convenience
    });
  }

  return outlets;
}

export function buildAllOutlets(): OutletSeed[] {
  return [...buildSariSariOutlets(), ...buildChainOutlets()];
}

export async function seedCustomersAndOutlets(): Promise<{
  outletIds: Record<string, string>;
  outletsByArea: Record<string, string[]>;
  outletsByChannel: Record<ChannelTier, string[]>;
}> {
  console.log("🏪 Seeding customers and outlets...");

  const allOutlets = buildAllOutlets();

  // Group by customer name → one Customer per chain/independent store
  const customerGroups = new Map<string, OutletSeed[]>();
  for (const outlet of allOutlets) {
    const list = customerGroups.get(outlet.customerName) ?? [];
    list.push(outlet);
    customerGroups.set(outlet.customerName, list);
  }

  const customerIds = new Map<string, string>();
  for (const [customerName, outlets] of customerGroups) {
    const created = await prisma.customer.upsert({
      where: { code: `CUST-${customerName.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase()}` },
      update: {
        name: customerName,
        paymentTerms: outlets[0]!.paymentTerms,
        creditLimit: Math.max(...outlets.map((o) => o.creditLimit)),
        status: "ACTIVE",
      },
      create: {
        code: `CUST-${customerName.replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase()}`,
        name: customerName,
        paymentTerms: outlets[0]!.paymentTerms,
        creditLimit: Math.max(...outlets.map((o) => o.creditLimit)),
        status: "ACTIVE",
      },
    });
    customerIds.set(customerName, created.id);
  }

  // Create outlets + contacts
  const outletIds: Record<string, string> = {};
  const outletsByArea: Record<string, string[]> = {};
  const outletsByChannel: Record<ChannelTier, string[]> = { SARI_SARI: [], MODERN: [], CONVENIENCE: [] };

  for (const outlet of allOutlets) {
    const created = await prisma.outlet.create({
      data: {
        code: outlet.code,
        name: outlet.name,
        customerId: customerIds.get(outlet.customerName)!,
        areaId: (await prisma.area.findUnique({ where: { code: outlet.areaCode } }))!.id,
        address: outlet.address,
        contactName: outlet.contactName,
        contactPhone: outlet.contactPhone,
        status: "ACTIVE",
      },
    });
    outletIds[outlet.code] = created.id;
    (outletsByArea[outlet.areaCode] ??= []).push(created.id);
    outletsByChannel[outlet.channel].push(created.id);

    await prisma.customerContact.create({
      data: {
        customerId: customerIds.get(outlet.customerName)!,
        outletId: created.id,
        name: outlet.contactName,
        title: outlet.channel === CHANNEL.SARI_SARI ? "Store Owner" : "Store Manager",
        phone: outlet.contactPhone,
        isPrimary: true,
      },
    });
  }

  console.log(`✓ ${customerGroups.size} customers, ${allOutlets.length} outlets`);
  return { outletIds, outletsByArea, outletsByChannel };
}
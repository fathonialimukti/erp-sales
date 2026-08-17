// =============================================
// GEOGRAPHY — METRO MANILA (real, population-weighted)
// =============================================
// 4 regions = the 4 Metro Manila districts.
// 16 areas = real cities/municipalities with 2024 census populations.
// Outlet counts are weighted by population (QC 3.08M → most, Pateros 67k → fewest).

import { prisma } from "../../lib/prisma.js";

export type AreaSeed = {
  code: string;
  name: string;
  regionCode: string;
  population: number; // 2024 census, for weighting
  outlets: number; // planned outlet count
};

export const REGIONS = [
  { code: "MNL", name: "Capital District" },
  { code: "QCR", name: "Eastern Manila" },
  { code: "CAM", name: "Northern Manila (Camanava)" },
  { code: "SMD", name: "Southern Manila" },
] as const;

export const AREAS: AreaSeed[] = [
  // Capital District
  { code: "MNL-MLA", name: "Manila", regionCode: "MNL", population: 1902590, outlets: 34 },
  // Eastern Manila
  { code: "QCR-QC", name: "Quezon City", regionCode: "QCR", population: 3084270, outlets: 56 },
  { code: "QCR-PTG", name: "Pateros", regionCode: "QCR", population: 67319, outlets: 2 },
  { code: "QCR-MRK", name: "Marikina", regionCode: "QCR", population: 471323, outlets: 10 },
  { code: "QCR-PSG", name: "Pasig", regionCode: "QCR", population: 853050, outlets: 16 },
  { code: "QCR-SJU", name: "San Juan", regionCode: "QCR", population: 134312, outlets: 4 },
  { code: "QCR-MDL", name: "Mandaluyong", regionCode: "QCR", population: 465902, outlets: 10 },
  // Northern Manila (Camanava)
  { code: "CAM-CLC", name: "Caloocan", regionCode: "CAM", population: 1712945, outlets: 32 },
  { code: "CAM-MLB", name: "Malabon", regionCode: "CAM", population: 389929, outlets: 9 },
  { code: "CAM-NVT", name: "Navotas", regionCode: "CAM", population: 252878, outlets: 6 },
  { code: "CAM-VLZ", name: "Valenzuela", regionCode: "CAM", population: 725173, outlets: 14 },
  // Southern Manila
  { code: "SMD-MKT", name: "Makati", regionCode: "SMD", population: 309770, outlets: 8 },
  { code: "SMD-TGG", name: "Taguig", regionCode: "SMD", population: 1308085, outlets: 24 },
  { code: "SMD-PRQ", name: "Parañaque", regionCode: "SMD", population: 703245, outlets: 13 },
  { code: "SMD-PSY", name: "Pasay", regionCode: "SMD", population: 453186, outlets: 9 },
  { code: "SMD-LPN", name: "Las Piñas", regionCode: "SMD", population: 615549, outlets: 12 },
  { code: "SMD-MTL", name: "Muntinlupa", regionCode: "SMD", population: 552225, outlets: 10 },
];

export async function seedRegionsAndAreas(): Promise<{ regionIds: Record<string, string>; areaIds: Record<string, string> }> {
  console.log("🌏 Seeding regions and areas (Metro Manila)...");

  const regionIds: Record<string, string> = {};
  for (const region of REGIONS) {
    const created = await prisma.region.upsert({
      where: { code: region.code },
      update: { name: region.name },
      create: { code: region.code, name: region.name },
    });
    regionIds[region.code] = created.id;
  }

  const areaIds: Record<string, string> = {};
  for (const area of AREAS) {
    const created = await prisma.area.upsert({
      where: { code: area.code },
      update: { name: area.name, regionId: regionIds[area.regionCode]! },
      create: { code: area.code, name: area.name, regionId: regionIds[area.regionCode]! },
    });
    areaIds[area.code] = created.id;
  }

  const totalOutlets = AREAS.reduce((sum, a) => sum + a.outlets, 0);
  console.log(`✓ ${REGIONS.length} regions, ${AREAS.length} areas (${totalOutlets} planned outlets)`);
  return { regionIds, areaIds };
}
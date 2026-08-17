// =============================================
// CATALOG — 10 SKUs (focused manufacturer portfolio)
// =============================================
// Mirrors a real URC/CCBPI-shaped portfolio: a cola flagship in two formats
// (tingi sachet + family 1.5L), coffee sachet, snack pair, noodle pair,
// household staples. Every SKU has a distinct price point and velocity profile
// so per-SKU analytics are legible.

import { prisma } from "../../lib/prisma.js";

export type SkuSeed = {
  code: string;
  name: string;
  category: string;
  basePrice: number; // PHP list price
  baseUnit: string;
};

export const SKU_CATEGORIES = [
  { code: "BEV", name: "Beverages" },
  { code: "SNK", name: "Snacks" },
  { code: "NDL", name: "Noodles" },
  { code: "HSH", name: "Household" },
] as const;

export const SKUS: SkuSeed[] = [
  // Beverages
  { code: "LF-BEV-COL-1500", name: "Cola 1.5L", category: "BEV", basePrice: 75, baseUnit: "pcs" },
  { code: "LF-BEV-COL-250", name: "Cola 250ml Sachet", category: "BEV", basePrice: 10, baseUnit: "pcs" },
  { code: "LF-BEV-TEA-500", name: "Iced Tea 500ml", category: "BEV", basePrice: 25, baseUnit: "pcs" },
  { code: "LF-BEV-COF-25", name: "3-in-1 Coffee 25g Sachet", category: "BEV", basePrice: 8, baseUnit: "pcs" },
  // Snacks
  { code: "LF-SNK-CHP-45", name: "Potato Chips Cheese 45g", category: "SNK", basePrice: 20, baseUnit: "pcs" },
  { code: "LF-SNK-CHP-90", name: "Potato Chips Original 90g", category: "SNK", basePrice: 35, baseUnit: "pcs" },
  // Noodles
  { code: "LF-NDL-CHK-60", name: "Instant Noodles Chicken 60g", category: "NDL", basePrice: 15, baseUnit: "pcs" },
  { code: "LF-NDL-BEF-60", name: "Instant Noodles Beef 60g", category: "NDL", basePrice: 15, baseUnit: "pcs" },
  // Household
  { code: "LF-HSH-SOP-100", name: "Bar Soap 100g", category: "HSH", basePrice: 25, baseUnit: "pcs" },
  { code: "LF-HSH-SHM-8", name: "Shampoo Sachet 8g", category: "HSH", basePrice: 7, baseUnit: "pcs" },
];

export async function seedCatalog(): Promise<{ categoryIds: Record<string, string>; skuIds: Record<string, string> }> {
  console.log("📦 Seeding catalog (10 SKUs)...");

  const categoryIds: Record<string, string> = {};
  for (const category of SKU_CATEGORIES) {
    const created = await prisma.skuCategory.upsert({
      where: { code: category.code },
      update: { name: category.name },
      create: { code: category.code, name: category.name },
    });
    categoryIds[category.code] = created.id;
  }

  const skuIds: Record<string, string> = {};
  for (const sku of SKUS) {
    const created = await prisma.sku.upsert({
      where: { code: sku.code },
      update: {
        name: sku.name,
        categoryId: categoryIds[sku.category]!,
        basePrice: sku.basePrice,
        baseUnit: sku.baseUnit,
        status: "ACTIVE",
      },
      create: {
        code: sku.code,
        name: sku.name,
        categoryId: categoryIds[sku.category]!,
        basePrice: sku.basePrice,
        baseUnit: sku.baseUnit,
        status: "ACTIVE",
      },
    });
    skuIds[sku.code] = created.id;
  }

  console.log(`✓ ${SKU_CATEGORIES.length} categories, ${SKUS.length} SKUs`);
  return { categoryIds, skuIds };
}
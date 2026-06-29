import { prisma } from './prisma.js';

export interface DiscountInfo {
  discountPercent: number;
  actionProgramId: string;
  actionProgramName: string;
}

/**
 * Find the best discount for a SKU at a specific outlet on a specific date
 * Searches through approved action programs that match the criteria
 */
export async function findBestDiscount(
  skuId: string,
  outletId: string,
  date: Date
): Promise<DiscountInfo | null> {
  // Find all approved action programs that:
  // 1. Include this outlet
  // 2. Include this SKU
  // 3. Are active on the given date
  const programs = await prisma.actionProgram.findMany({
    where: {
      approvalStatus: 'APPROVED',
      startDate: { lte: date },
      endDate: { gte: date },
      outlets: {
        some: { outletId }
      },
      skus: {
        some: { skuId }
      }
    },
    include: {
      skus: {
        where: { skuId }
      }
    }
  });

  if (programs.length === 0) {
    return null;
  }

  // Find the program with the highest discount
  let bestDiscount: DiscountInfo | null = null;
  let highestDiscountPercent = 0;

  for (const program of programs) {
    const skuData = program.skus[0];
    if (!skuData) continue;

    // Calculate discount percentage
    // discount = (price - priceAfterDiscount) / price * 100
    const price = Number(skuData.price);
    const priceAfterDiscount = Number(skuData.priceAfterDiscount);
    
    if (price === 0) continue;

    const discountAmount = price - priceAfterDiscount;
    const discountPercent = (discountAmount / price) * 100;

    if (discountPercent > highestDiscountPercent) {
      highestDiscountPercent = discountPercent;
      bestDiscount = {
        discountPercent,
        actionProgramId: program.id,
        actionProgramName: program.name
      };
    }
  }

  return bestDiscount;
}

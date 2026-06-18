import { prisma } from "../lib/prisma.js";
import { publicProcedure, router } from "../trpc.js";

/**
 * Public landing page router — no auth required.
 * Returns CRM stats for the landing page dashboard.
 */
export const landingRouter = router({
  getScene: publicProcedure.query(async () => {
    const [regionCount, areaCount, customerCount, outletCount, salesOrderCount] = await Promise.all([
      prisma.region.count(),
      prisma.area.count(),
      prisma.customer.count(),
      prisma.outlet.count(),
      prisma.salesOrder.count(),
    ]);

    return {
      stats: {
        regions: regionCount,
        areas: areaCount,
        customers: customerCount,
        outlets: outletCount,
        salesOrders: salesOrderCount,
      },
    };
  }),
});
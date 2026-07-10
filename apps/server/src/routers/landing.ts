import { prisma } from "../lib/prisma.js";
import { publicProcedure, router } from "../trpc.js";

/**
 * Public landing page router — no auth required.
 * Returns CRM stats for the landing page dashboard.
 */
export const landingRouter = router({});
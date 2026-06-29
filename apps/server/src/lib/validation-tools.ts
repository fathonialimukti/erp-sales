import { tool } from 'ai';
import { z } from 'zod';
import { prisma } from './prisma.js';
import { validateReadOnlySql, formatQueryResult } from './ai-db-tools.js';

/**
 * Server-side tools for AI validation — these execute on the server
 * and return data directly to the AI model during validation.
 */
export const validationTools = {
  querySalesHistory: tool({
    description:
      'Query historical sales orders for a specific customer to analyze pricing patterns, order frequency, and typical order sizes. ' +
      'Use this to validate if current order prices and quantities are consistent with the customer\'s history.',
    inputSchema: z.object({
      customerId: z.string().describe('The customer ID to query history for'),
      skuId: z.string().optional().describe('Optional: specific SKU to check pricing history for'),
      limit: z.number().int().min(1).max(50).default(20).optional(),
    }),
    execute: async ({ customerId, skuId, limit = 20 }) => {
      try {
        const where: any = {
          customerId,
          approvalStatus: { in: ['APPROVED', 'PROPOSED'] },
        };

        if (skuId) {
          where.items = {
            some: {
              skuId,
            },
          };
        }

        const orders = await prisma.salesOrder.findMany({
          where,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                sku: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
          },
        });

        return {
          success: true,
          orderCount: orders.length,
          orders: orders.map((order) => ({
            id: order.id,
            documentNumber: order.documentNumber,
            date: order.date,
            grandTotal: order.grandTotal?.toNumber() ?? 0,
            itemCount: order.items.length,
            items: order.items.map((item) => ({
              skuName: item.sku.name,
              skuCode: item.sku.code,
              quantity: item.quantity.toNumber(),
              unitPrice: item.unitPrice.toNumber(),
              lineTotal: item.lineTotal.toNumber(),
            })),
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),

  querySkuPricing: tool({
    description:
      'Query pricing information for a specific SKU across recent sales orders to validate if the current unit price is reasonable.',
    inputSchema: z.object({
      skuId: z.string().describe('The SKU ID to check pricing for'),
      limit: z.number().int().min(1).max(100).default(50).optional(),
    }),
    execute: async ({ skuId, limit = 50 }) => {
      try {
        const results = await prisma.salesOrderItem.findMany({
          where: {
            skuId,
            salesOrder: {
              approvalStatus: { in: ['APPROVED', 'PROPOSED'] },
            },
          },
          take: limit,
          orderBy: { salesOrder: { createdAt: 'desc' } },
          include: {
            sku: {
              select: {
                id: true,
                name: true,
                code: true,
                basePrice: true,
              },
            },
            salesOrder: {
              select: {
                id: true,
                documentNumber: true,
                date: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        const prices = results.map((item) => item.unitPrice.toNumber());
        const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

        return {
          success: true,
          sku: {
            id: results[0]?.sku.id,
            name: results[0]?.sku.name,
            code: results[0]?.sku.code,
            basePrice: results[0]?.sku.basePrice?.toNumber() ?? null,
          },
          statistics: {
            avgUnitPrice: Math.round(avgPrice * 100) / 100,
            minUnitPrice: minPrice,
            maxUnitPrice: maxPrice,
            sampleSize: prices.length,
          },
          recentPrices: results.slice(0, 10).map((item) => ({
            documentNumber: item.salesOrder.documentNumber,
            date: item.salesOrder.date,
            customer: item.salesOrder.customer.name,
            unitPrice: item.unitPrice.toNumber(),
            quantity: item.quantity.toNumber(),
          })),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),

  queryCustomerProfile: tool({
    description:
      'Get customer profile information including total order count, average order value, and typical order patterns.',
    inputSchema: z.object({
      customerId: z.string().describe('The customer ID to query'),
    }),
    execute: async ({ customerId }) => {
      try {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
        });

        if (!customer) {
          return {
            success: false,
            error: 'Customer not found',
          };
        }

        const orderStats = await prisma.salesOrder.aggregate({
          where: {
            customerId,
            approvalStatus: { in: ['APPROVED', 'PROPOSED'] },
          },
          _count: { id: true },
          _sum: {
            grandTotal: true,
          },
          _avg: {
            grandTotal: true,
          },
        });

        return {
          success: true,
          customer: {
            id: customer.id,
            name: customer.name,
            code: customer.code,
          },
          statistics: {
            totalOrders: orderStats._count.id,
            totalRevenue: orderStats._sum.grandTotal?.toNumber() ?? 0,
            avgOrderValue: orderStats._avg.grandTotal?.toNumber() ?? 0,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),

  queryOutletInfo: tool({
    description:
      'Get outlet information and its order history to validate if the outlet is appropriate for this order.',
    inputSchema: z.object({
      outletId: z.string().describe('The outlet ID to query'),
    }),
    execute: async ({ outletId }) => {
      try {
        const outlet = await prisma.outlet.findUnique({
          where: { id: outletId },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            area: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!outlet) {
          return {
            success: false,
            error: 'Outlet not found',
          };
        }

        const orderCount = await prisma.salesOrder.count({
          where: {
            outletId,
            approvalStatus: { in: ['APPROVED', 'PROPOSED'] },
          },
        });

        return {
          success: true,
          outlet: {
            id: outlet.id,
            name: outlet.name,
            code: outlet.code,
            customer: outlet.customer?.name ?? null,
            area: outlet.area?.name ?? null,
            address: outlet.address,
          },
          statistics: {
            totalOrders: orderCount,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),
};

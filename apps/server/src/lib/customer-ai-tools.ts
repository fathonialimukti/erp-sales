import { tool } from 'ai';
import * as z from 'zod';
import { prisma } from './prisma.js';

/**
 * Customer AI tools — public endpoint for B2B self-service.
 * No auth; identity gathered conversationally.
 */
export const customerAiTools = {
    lookupCustomer: tool({
        description: 'Find a customer by name (fuzzy match). Returns customer info with their outlets.',
        inputSchema: z.object({
            name: z.string().describe('Customer name to search for'),
        }),
        execute: async ({ name }) => {
            const customers = await prisma.customer.findMany({
                where: { name: { contains: name, mode: 'insensitive' } },
                include: {
                    outlets: {
                        select: { id: true, name: true, address: true, status: true },
                    },
                },
                take: 5,
            });
            return { customers };
        },
    }),

    lookupSalesOrder: tool({
        description: 'Find a sales order by customer name and order number. Returns order details with items.',
        inputSchema: z.object({
            customerName: z.string().describe('Customer name for verification'),
            orderNumber: z.string().describe('Order document number (e.g., SO-20260719-0001)'),
        }),
        execute: async ({ customerName, orderNumber }) => {
            const order = await prisma.salesOrder.findFirst({
                where: {
                    documentNumber: orderNumber,
                    customer: { name: { contains: customerName, mode: 'insensitive' } },
                },
                include: {
                    customer: { select: { id: true, name: true, code: true } },
                    outlet: { select: { id: true, name: true, address: true } },
                    items: {
                        include: {
                            sku: { select: { id: true, name: true, code: true, baseUnit: true } },
                        },
                    },
                },
            });
            if (!order) return { error: 'Order not found or does not belong to this customer' };
            return { order };
        },
    }),

    listProducts: tool({
        description: 'Search or list products (SKUs). Returns product info with prices and category.',
        inputSchema: z.object({
            search: z.string().optional().describe('Search term for product name or code'),
            category: z.string().optional().describe('Category name filter'),
            limit: z.number().int().min(1).max(50).optional().default(20),
        }),
        execute: async ({ search, category, limit = 20 }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const where: any = { status: 'ACTIVE' };
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } },
                ];
            }
            if (category) {
                where.category = { name: { contains: category, mode: 'insensitive' } };
            }
            const products = await prisma.sku.findMany({
                where,
                include: { category: { select: { id: true, name: true } } },
                take: limit,
                orderBy: { name: 'asc' },
            });
            return { products };
        },
    }),

    createDraftOrder: tool({
        description:
            'Create a draft sales order for customer review. Order starts as DRAFT status and must be reviewed by an employee before proposal.',
        inputSchema: z.object({
            customerId: z.string().describe('Customer ID from lookupCustomer'),
            outletId: z.string().describe('Outlet ID for delivery'),
            items: z
                .array(
                    z.object({
                        skuId: z.string().describe('Product SKU ID'),
                        quantity: z.number().positive().describe('Order quantity'),
                        unitPrice: z.number().nonnegative().describe('Unit price'),
                    }),
                )
                .min(1)
                .describe('Order line items'),
            notes: z.string().optional().describe('Optional order notes'),
        }),
        execute: async ({ customerId, outletId, items, notes }) => {
            // Verify customer and outlet
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                select: { id: true, name: true, code: true },
            });
            if (!customer) return { error: 'Customer not found' };

            const outlet = await prisma.outlet.findUnique({
                where: { id: outletId },
                select: { id: true, name: true, areaId: true, customerId: true },
            });
            if (!outlet) return { error: 'Outlet not found' };
            if (outlet.customerId !== customerId) {
                return { error: 'Outlet does not belong to this customer' };
            }

            // Use dedicated system user for AI-created orders
            // Falls back to first admin if SYSTEM_USER_ID not configured
            const systemUserId = process.env.SYSTEM_USER_ID;
            let createdById: string;
            
            if (systemUserId) {
                const systemUser = await prisma.user.findUnique({
                    where: { id: systemUserId },
                    select: { id: true },
                });
                if (!systemUser) return { error: 'SYSTEM_USER_ID configured but user not found' };
                createdById = systemUser.id;
            } else {
                const adminUser = await prisma.user.findFirst({
                    where: { role: { name: 'admin' } },
                    select: { id: true },
                });
                if (!adminUser) return { error: 'No system user available to create order' };
                createdById = adminUser.id;
            }

            // Generate document number: SO-YYYYMMDD-XXXX
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0]!.replace(/-/g, '');
            const prefix = `SO-${dateStr}-`;
            const lastOrder = await prisma.salesOrder.findFirst({
                where: { documentNumber: { startsWith: prefix } },
                orderBy: { documentNumber: 'desc' },
                select: { documentNumber: true },
            });
            let nextNum = 1;
            if (lastOrder?.documentNumber) {
                const lastNum = parseInt(lastOrder.documentNumber.slice(-4), 10);
                if (!isNaN(lastNum)) nextNum = lastNum + 1;
            }
            const documentNumber = `${prefix}${nextNum.toString().padStart(4, '0')}`;

            // Calculate totals
            let subtotal = 0;
            const itemData = items.map((item, idx) => {
                const lineTotal = item.quantity * item.unitPrice;
                subtotal += lineTotal;
                return {
                    skuId: item.skuId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal,
                    sortOrder: idx,
                };
            });

            // Create order with DRAFT status
            const order = await prisma.salesOrder.create({
                data: {
                    documentNumber,
                    customerId,
                    outletId,
                    areaId: outlet.areaId,
                    createdById,
                    notes,
                    approvalStatus: 'DRAFT',
                    source: 'AI_ASSISTANT',
                    subtotal,
                    grandTotal: subtotal,
                    items: { create: itemData },
                },
                include: {
                    items: { include: { sku: { select: { name: true, code: true } } } },
                },
            });

            return {
                orderId: order.id,
                documentNumber: order.documentNumber,
                status: order.approvalStatus,
                itemCount: order.items.length,
                total: order.grandTotal,
            };
        },
    }),
};

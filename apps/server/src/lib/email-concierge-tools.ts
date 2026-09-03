import { tool } from 'ai';
import * as z from 'zod';
import { findBestDiscount } from './action-program-discount.js';
import {
  searchKnowledgeChunks,
  formatKnowledgeHits,
  toKnowledgeSearchHits,
} from './rag.js';
import { prisma } from './prisma.js';
import { getSettingValue } from './settings-service.js';

export type ConciergeFinalizedReply = {
  subject?: string;
  htmlBody: string;
  textBody?: string;
};

export type ConciergeRunState = {
  finalized?: ConciergeFinalizedReply;
  createdOrderDocNumbers: string[];
};

async function nextSalesOrderDocumentNumber() {
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
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

async function resolveSystemUserId(): Promise<string | { error: string }> {
  // 1. Dedicated AI system user (preferred — clean audit trail)
  const aiEmail = String(await getSettingValue(prisma, 'system.aiSystemEmail'));
  const aiUser = await prisma.user.findUnique({
    where: { email: aiEmail },
    select: { id: true },
  });
  if (aiUser) return aiUser.id;

  // 2. Explicit system.systemUserId setting (env fallback SYSTEM_USER_ID)
  const systemUserId = String(await getSettingValue(prisma, 'system.systemUserId'));
  if (systemUserId) {
    const systemUser = await prisma.user.findUnique({
      where: { id: systemUserId },
      select: { id: true },
    });
    if (!systemUser) return { error: 'system.systemUserId configured but user not found' };
    return systemUser.id;
  }

  // 3. Fallback: any user with System Admin role
  const adminUser = await prisma.user.findFirst({
    where: { role: { name: 'System Admin' } },
    select: { id: true },
  });
  if (!adminUser) return { error: 'No system user available to create order' };
  return adminUser.id;
}

export function createEmailConciergeTools(ctx: {
  conversationId: string;
  customerId?: string | null;
  state: ConciergeRunState;
}) {
  return {
    lookupCustomer: tool({
      description:
        'Find a customer by name (fuzzy match). Prefer the conversation-linked customer when present.',
      inputSchema: z.object({
        name: z.string().describe('Customer name to search for'),
      }),
      execute: async ({ name }) => {
        if (ctx.customerId) {
          const linked = await prisma.customer.findUnique({
            where: { id: ctx.customerId },
            include: {
              outlets: {
                select: { id: true, name: true, address: true, status: true },
              },
            },
          });
          if (linked) return { customers: [linked], linked: true };
        }
        const customers = await prisma.customer.findMany({
          where: { name: { contains: name, mode: 'insensitive' } },
          include: {
            outlets: {
              select: { id: true, name: true, address: true, status: true },
            },
          },
          take: 5,
        });
        return { customers, linked: false };
      },
    }),

    listProducts: tool({
      description: 'Search or list active products (SKUs) with prices and category.',
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

    getCustomerDiscounts: tool({
      description:
        'Get best B2B action-program discounts for the conversation customer outlets, optionally for a SKU.',
      inputSchema: z.object({
        skuId: z.string().optional().describe('Optional SKU to price'),
        outletId: z.string().optional().describe('Optional outlet; defaults to all customer outlets'),
      }),
      execute: async ({ skuId, outletId }) => {
        if (!ctx.customerId) {
          return { error: 'Conversation is not linked to a customer' };
        }
        const outlets = await prisma.outlet.findMany({
          where: {
            customerId: ctx.customerId,
            ...(outletId ? { id: outletId } : {}),
          },
          select: { id: true, name: true },
          take: 20,
        });
        if (outlets.length === 0) return { discounts: [], note: 'No outlets found' };

        const today = new Date();
        if (skuId) {
          const discounts = [];
          for (const outlet of outlets) {
            const best = await findBestDiscount(skuId, outlet.id, today);
            if (best) {
              discounts.push({
                outletId: outlet.id,
                outletName: outlet.name,
                skuId,
                ...best,
              });
            }
          }
          return { discounts };
        }

        // Without skuId: list active programs for these outlets (summary only)
        const programs = await prisma.actionProgram.findMany({
          where: {
            approvalStatus: 'APPROVED',
            startDate: { lte: today },
            endDate: { gte: today },
            outlets: { some: { outletId: { in: outlets.map((o) => o.id) } } },
          },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            skus: {
              select: {
                skuId: true,
                price: true,
                priceAfterDiscount: true,
                sku: { select: { code: true, name: true } },
              },
              take: 20,
            },
          },
          take: 10,
        });
        return { programs, outlets };
      },
    }),

    lookupSalesOrder: tool({
      description: 'Find a sales order by document number and customer name.',
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

    createDraftOrder: tool({
      description:
        'Create a DRAFT sales order linked to this email conversation (source EMAIL_CRM). Must be reviewed by staff.',
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

        const createdById = await resolveSystemUserId();
        if (typeof createdById === 'object') return createdById;

        const documentNumber = await nextSalesOrderDocumentNumber();
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

        const order = await prisma.salesOrder.create({
          data: {
            documentNumber,
            customerId,
            outletId,
            areaId: outlet.areaId,
            createdById,
            notes,
            approvalStatus: 'DRAFT',
            source: 'EMAIL_CRM',
            emailConversationId: ctx.conversationId,
            subtotal,
            grandTotal: subtotal,
            items: { create: itemData },
          },
          include: {
            items: { include: { sku: { select: { name: true, code: true } } } },
          },
        });

        if (order.documentNumber) {
          ctx.state.createdOrderDocNumbers.push(order.documentNumber);
        }

        return {
          orderId: order.id,
          documentNumber: order.documentNumber,
          status: order.approvalStatus,
          itemCount: order.items.length,
          total: order.grandTotal,
        };
      },
    }),

    searchKnowledge: tool({
      description:
        'Search the ERP knowledge base for customer questions about products, company info, processes, or anything that might be documented (e.g. "topan"). ' +
        'Returns ranked hits with title, source, and snippet. Use this for general knowledge; keep searchEmailRules for voice/anti-slop/secrecy rules.',
      inputSchema: z.object({
        query: z
          .string()
          .min(1)
          .describe('Natural language or keyword search over the knowledge base (e.g. "topan", "payment terms", "delivery process")'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .default(5)
          .optional()
          .describe('Max knowledge hits to return (1-10, default 5)'),
      }),
      execute: async ({ query, limit }) => {
        const hits = await searchKnowledgeChunks(query, limit ?? 5);
        const searchHits = toKnowledgeSearchHits(hits);
        return {
          hits: searchHits,
          count: searchHits.length,
        };
      },
    }),

    searchEmailRules: tool({
      description:
        'MANDATORY — call this FIRST before drafting any email reply. Loads the current voice, AI-slop ban list, structural rules, internal secrecy rules, and before/after examples from the knowledge base. You MUST call this at least once per reply. The rules from this call OVERRIDE any defaults.',
      inputSchema: z.object({
        topics: z
          .array(z.enum(['voice', 'banned-phrases', 'structural', 'examples', 'secrecy', 'all']))
          .default(['all'])
          .describe('Which rule sections to load. Default "all" loads everything.'),
      }),
      execute: async ({ topics }) => {
        const query = topics.includes('all') || topics.length === 0
          ? 'email agent rules voice anti-slop banned phrases structural patterns secrecy examples'
          : topics.join(' ');
        // Pinned to the email-agent-rules source: rule queries must never pull
        // unrelated workflow/product chunks into the reply prompt.
        const hits = await searchKnowledgeChunks(query, 5, { sources: ['email-agent-rules'] });
        const formatted = formatKnowledgeHits(hits);
        return {
          rulesLoaded: true,
          topics: topics.includes('all') ? ['all'] : topics,
          rules: formatted || 'No email rules found in knowledge base. Apply strict defaults: no bullet points, no passive voice, no AI slop phrases, no internal secrets.',
        };
      },
    }),

    finalizeCustomerReply: tool({
      description:
        'REQUIRED — this MUST be your LAST tool call. Provide the final HTML reply body. Free-form agent text is never emailed. Ending the run without calling this fails the run (missing_finalize) and the customer receives nothing. Before calling this, you MUST call searchEmailRules at least once to load the current voice, anti-slop, and secrecy rules.',
      inputSchema: z.object({
        htmlBody: z.string().min(1).describe('Final HTML email body for the customer'),
        textBody: z.string().optional().describe('Optional plain-text fallback'),
        subject: z.string().optional().describe('Optional reply subject'),
      }),
      execute: async ({ htmlBody, textBody, subject }) => {
        const trimmed = htmlBody.trim();
        if (!trimmed) return { ok: false as const, error: 'htmlBody required' };
        ctx.state.finalized = {
          htmlBody: trimmed,
          ...(textBody?.trim() ? { textBody: textBody.trim() } : {}),
          ...(subject?.trim() ? { subject: subject.trim() } : {}),
        };
        return { ok: true as const };
      },
    }),
  };
}

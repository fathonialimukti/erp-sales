import { TRPCError } from '@trpc/server';
import { generateText } from 'ai';
import {
  createDraftOrderFromEmailSchema,
  createEmailConversationSchema,
  createEmailMessageSchema,
  emailConversationIdSchema,
  emailCrmListInputSchema,
  retryEmailAgentSchema,
  sendEmailMessageSchema,
  suggestEmailReplySchema,
  updateEmailConversationSchema,
} from '@repo/schemas/email-crm';
import { logActivity } from '../lib/activity-log.js';
import { chatModel } from '../lib/ai-provider.js';
import { enqueueEmailConcierge } from '../lib/email-concierge.js';
import {
  htmlToText,
  sanitizeEmailHtml,
  wrapPlainTextAsHtml,
} from '../lib/email-html.js';
import { sendSmtpEmail } from '../lib/email-smtp.js';
import {
  buildCreateLogDetail,
  buildDeleteLogDetail,
  buildUpdateLogDetail,
} from '../lib/log-detail.js';
import {
  buildPaginationMeta,
  buildPaginationParams,
  buildTextSearchWhere,
} from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../prisma/generated/client.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { normalizeEmail } from '../lib/email-inbound.js';

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

export const emailCrmRouter = router({
  list: protectedProcedure
    .use(hasPermission('email-crm@read'))
    .input(emailCrmListInputSchema)
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const searchWhere = buildTextSearchWhere(input?.search, ['email', 'subject'] as const);
      const where = {
        ...(searchWhere ?? {}),
        ...(input?.status ? { status: input.status } : {}),
        ...(input?.priority ? { priority: input.priority } : {}),
        ...(input?.customerId ? { customerId: input.customerId } : {}),
      };

      const [data, total] = await Promise.all([
        prisma.emailConversation.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            customer: { select: { id: true, name: true, code: true } },
            _count: { select: { messages: true, salesOrders: true } },
          },
        }),
        prisma.emailConversation.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('email-crm@read'))
    .input(emailConversationIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.emailConversation.findUnique({
        where: { id: input.id },
        include: {
          customer: { select: { id: true, name: true, code: true } },
          messages: { orderBy: { createdAt: 'asc' } },
          salesOrders: {
            select: {
              id: true,
              documentNumber: true,
              approvalStatus: true,
              grandTotal: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('email-crm@create'))
    .input(createEmailConversationSchema)
    .mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      // email is not unique — same sender may have multiple conversations
      const created = await prisma.emailConversation.create({
        data: {
          email,
          subject: input.subject,
          status: input.status,
          priority: input.priority,
          sentiment: input.sentiment,
          tags: input.tags ?? undefined,
          customerId: input.customerId ?? undefined,
        },
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'email-crm',
        resourceId: created.id,
        message: `Created email conversation ${created.email}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('email-crm@update'))
    .input(updateEmailConversationSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, email, tags, subject, status, priority, sentiment, customerId } = input;
      const existing = await prisma.emailConversation.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });

      // ponytail: build data bag to satisfy exactOptionalPropertyTypes + Json null
      const data: Prisma.EmailConversationUpdateInput = {};
      if (email !== undefined) data.email = normalizeEmail(email);
      if (subject !== undefined) data.subject = subject;
      if (status !== undefined) data.status = status;
      if (priority !== undefined) data.priority = priority;
      if (sentiment !== undefined) data.sentiment = sentiment;
      if (tags !== undefined) data.tags = tags === null ? Prisma.DbNull : tags;
      if (customerId !== undefined) {
        data.customer = customerId === null ? { disconnect: true } : { connect: { id: customerId } };
      }

      const updated = await prisma.emailConversation.update({
        where: { id: currentId },
        data,
      });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'email-crm',
        resourceId: updated.id,
        message: `Updated email conversation ${updated.email}`,
        detail: buildUpdateLogDetail(
          existing as unknown as Record<string, unknown>,
          updated as unknown as Record<string, unknown>,
        ),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('email-crm@delete'))
    .input(emailConversationIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.emailConversation.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });

      await prisma.emailConversation.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'email-crm',
        resourceId: existing.id,
        message: `Deleted email conversation ${existing.email}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),

  createMessage: protectedProcedure
    .use(hasPermission('email-crm@update'))
    .input(createEmailMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.emailConversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, email: true },
      });
      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });
      }

      const now = new Date();
      const message = await prisma.$transaction(async (tx) => {
        const created = await tx.emailMessage.create({
          data: {
            conversationId: input.conversationId,
            body: input.body,
            // Admin compose is always outbound; ignore client-supplied INBOUND
            direction: 'OUTBOUND',
            messageId: input.messageId,
            inReplyTo: input.inReplyTo,
            references: input.references,
          },
        });
        await tx.emailConversation.update({
          where: { id: input.conversationId },
          data: { lastMessageAt: now },
        });
        return created;
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'email-crm',
        resourceId: conversation.id,
        message: `Added ${message.direction} message to ${conversation.email}`,
        detail: buildCreateLogDetail(message as unknown as Record<string, unknown>),
      });

      return message;
    }),

  suggestReply: protectedProcedure
    .use(hasPermission('email-crm@update'))
    .input(suggestEmailReplySchema)
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.emailConversation.findUnique({
        where: { id: input.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          customer: { select: { name: true, code: true } },
        },
      });
      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });
      }

      const thread = [...conversation.messages]
        .reverse()
        .map((m) => `${m.direction}: ${m.body}`)
        .join('\n\n');

      const system = [
        'You are a B2B sales customer-service assistant drafting email replies for an ERP sales team.',
        "Match the customer's language. Be professional and concise.",
        'Do not invent order numbers, prices, or commitments without evidence in the thread.',
      ].join(' ');

      const promptParts = [
        conversation.customer
          ? `Customer: ${conversation.customer.name}${conversation.customer.code ? ` (${conversation.customer.code})` : ''}`
          : `Sender email: ${conversation.email}`,
        conversation.subject ? `Subject: ${conversation.subject}` : null,
        input.instruction ? `Instruction: ${input.instruction}` : null,
        'Thread:',
        thread || '(no messages yet)',
        'Draft a reply email body only (no subject line).',
      ].filter(Boolean);

      const { text } = await generateText({
        model: chatModel,
        instructions: system,
        prompt: promptParts.join('\n\n'),
      });

      const draft = text.trim();
      let savedMessageId: string | undefined;

      if (input.save && draft) {
        const now = new Date();
        const saved = await prisma.$transaction(async (tx) => {
          const created = await tx.emailMessage.create({
            data: {
              conversationId: conversation.id,
              direction: 'OUTBOUND',
              body: draft,
            },
          });
          await tx.emailConversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: now },
          });
          return created;
        });
        savedMessageId = saved.id;

        await logActivity(prisma, {
          action: 'CREATE',
          userId: ctx.user.userId,
          resource: 'email-crm',
          resourceId: conversation.id,
          message: `Saved AI suggested reply for ${conversation.email}`,
          detail: buildCreateLogDetail(saved as unknown as Record<string, unknown>),
        });
      }

      return { draft, savedMessageId };
    }),

  createDraftOrder: protectedProcedure
    .use(hasPermission('email-crm@update'))
    .input(createDraftOrderFromEmailSchema)
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.emailConversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, email: true, customerId: true },
      });
      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });
      }
      if (!conversation.customerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Conversation must be linked to a customer before creating an order.',
        });
      }

      const outlet = await prisma.outlet.findUnique({
        where: { id: input.outletId },
        select: { id: true, areaId: true, customerId: true },
      });
      if (!outlet) throw new TRPCError({ code: 'NOT_FOUND', message: 'Outlet not found.' });
      if (outlet.customerId !== conversation.customerId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Outlet does not belong to the conversation customer.',
        });
      }

      const documentNumber = await nextSalesOrderDocumentNumber();
      let subtotal = 0;
      const itemData = input.items.map((item, idx) => {
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
          customerId: conversation.customerId,
          outletId: outlet.id,
          areaId: outlet.areaId,
          createdById: ctx.user.userId,
          notes: input.notes,
          approvalStatus: 'DRAFT',
          source: 'EMAIL_CRM',
          emailConversationId: conversation.id,
          subtotal,
          grandTotal: subtotal,
          items: { create: itemData },
        },
        include: {
          items: { include: { sku: { select: { id: true, name: true, code: true } } } },
        },
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'email-crm',
        resourceId: conversation.id,
        message: `Created draft sales order ${order.documentNumber ?? order.id} from email conversation`,
        detail: buildCreateLogDetail(order as unknown as Record<string, unknown>),
      });

      return order;
    }),

  sendMessage: protectedProcedure
    .use(hasPermission('email-crm@update'))
    .input(sendEmailMessageSchema)
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.emailConversation.findUnique({
        where: { id: input.conversationId },
        include: {
          messages: {
            where: { direction: 'INBOUND' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });
      }

      const plainBody = input.body?.trim() ?? '';
      const rawHtml = input.htmlBody?.trim() ?? '';
      let html: string;
      let text: string;

      if (rawHtml) {
        const sanitized = sanitizeEmailHtml(rawHtml);
        if (!sanitized.ok) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid htmlBody: ${sanitized.reason}`,
          });
        }
        html = sanitized.html;
        text = plainBody || htmlToText(html) || html;
      } else {
        text = plainBody;
        html = wrapPlainTextAsHtml(text);
      }

      const lastInbound = conversation.messages[0];
      const inReplyTo = lastInbound?.messageId ?? undefined;
      const references =
        [lastInbound?.references, lastInbound?.messageId].filter(Boolean).join(' ').trim() ||
        undefined;

      const subject =
        input.subject?.trim() ||
        (conversation.subject
          ? /^re:\s/i.test(conversation.subject)
            ? conversation.subject
            : `Re: ${conversation.subject}`
          : 'Re: your message');

      let smtpMessageId: string;
      try {
        const sent = await sendSmtpEmail({
          to: conversation.email,
          subject,
          html,
          text,
          ...(inReplyTo ? { inReplyTo } : {}),
          ...(references ? { references } : {}),
        });
        smtpMessageId = sent.messageId;
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'SMTP send failed',
        });
      }

      const now = new Date();
      const message = await prisma.$transaction(async (tx) => {
        const created = await tx.emailMessage.create({
          data: {
            conversationId: conversation.id,
            direction: 'OUTBOUND',
            body: text,
            htmlBody: html,
            messageId: smtpMessageId,
            inReplyTo: inReplyTo ?? null,
            references: references ?? null,
            sendStatus: 'SENT',
            sentAt: now,
          },
        });
        await tx.emailConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: now,
            lastOutboundAt: now,
          },
        });
        return created;
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'email-crm',
        resourceId: conversation.id,
        message: `Sent outbound email to ${conversation.email}`,
        detail: buildCreateLogDetail(message as unknown as Record<string, unknown>),
      });

      return message;
    }),

  retryAgent: protectedProcedure
    .use(hasPermission('email-crm@update'))
    .input(retryEmailAgentSchema)
    .mutation(async ({ input, ctx }) => {
      const conversation = await prisma.emailConversation.findUnique({
        where: { id: input.conversationId },
        select: { id: true, email: true, agentStatus: true },
      });
      if (!conversation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Email conversation not found.' });
      }

      // Unstick FAILED / RUNNING / AWAITING_SEND (and allow re-run from IDLE/SENT).
      // Always force IDLE so runEmailConcierge can re-enter even if a prior job died mid-run.
      await prisma.emailConversation.update({
        where: { id: conversation.id },
        data: {
          agentStatus: 'IDLE',
          agentError: null,
          // allow retry even if lastOutboundAt was recent
          lastOutboundAt: null,
        },
      });

      enqueueEmailConcierge(conversation.id);

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'email-crm',
        resourceId: conversation.id,
        message: `Retried email concierge for ${conversation.email}`,
        detail: {
          agentStatus: 'IDLE',
          previousAgentStatus: conversation.agentStatus,
          enqueued: true,
        },
      });

      return { ok: true as const };
    }),
});

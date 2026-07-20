import type { Request, Response } from 'express';
import { emailInboundPayloadSchema } from '@repo/schemas/email-crm';
import * as emailAutoReplyAi from '../lib/email-auto-reply-ai.js';
import { processInboundEmail } from '../lib/email-inbound.js';
import { isValidEmailWebhookSecret } from '../lib/email-webhook-secret.js';
import { prisma } from '../lib/prisma.js';

function replySubject(original?: string | null): string {
  const base = original?.trim();
  if (!base) return 'Re: your message';
  return /^re:\s/i.test(base) ? base : `Re: ${base}`;
}

export async function emailAutoReplyHandler(req: Request, res: Response) {
  if (!isValidEmailWebhookSecret(req.header('x-email-webhook-secret') ?? undefined)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = emailInboundPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await processInboundEmail(parsed.data);

    if ('skipped' in result) {
      res.status(200).json({ ok: true, skipped: result.skipped, reply: null });
      return;
    }

    if ('deduped' in result && result.deduped) {
      res.status(200).json({
        ok: true,
        deduped: true,
        conversationId: result.conversationId,
        messageId: result.messageId,
        reply: null,
      });
      return;
    }

    try {
      const conversation = await prisma.emailConversation.findUnique({
        where: { id: result.conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          customer: { select: { name: true, code: true } },
        },
      });

      if (!conversation) {
        res.status(200).json({
          ok: true,
          conversationId: result.conversationId,
          messageId: result.messageId,
          linkedCustomerId: result.linkedCustomerId,
          reply: null,
          aiError: 'Conversation not found after inbound store',
        });
        return;
      }

      const draft = await emailAutoReplyAi.generateEmailAutoReplyDraft(conversation);
      if (!draft) {
        res.status(200).json({
          ok: true,
          conversationId: result.conversationId,
          messageId: result.messageId,
          linkedCustomerId: result.linkedCustomerId,
          reply: null,
          aiError: 'Empty AI draft',
        });
        return;
      }

      const now = new Date();
      const outbound = await prisma.$transaction(async (tx) => {
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

      res.status(200).json({
        ok: true,
        conversationId: result.conversationId,
        messageId: result.messageId,
        outboundMessageId: outbound.id,
        linkedCustomerId: result.linkedCustomerId,
        reply: {
          text: draft,
          subject: replySubject(parsed.data.subject ?? conversation.subject),
        },
      });
    } catch (aiErr) {
      console.error('email auto-reply AI failed', aiErr);
      res.status(200).json({
        ok: true,
        conversationId: result.conversationId,
        messageId: result.messageId,
        linkedCustomerId: result.linkedCustomerId,
        reply: null,
        aiError: aiErr instanceof Error ? aiErr.message : 'AI generation failed',
      });
    }
  } catch (err) {
    console.error('email auto-reply failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

import type { EmailInboundPayload } from '@repo/schemas/email-crm';
import { Prisma } from '../prisma/generated/client.js';
import { prisma } from './prisma.js';

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/^.*</, '').replace(/>.*$/, '').trim();
}

export function extractBody(payload: EmailInboundPayload): string {
  if (payload.text?.trim()) return payload.text.trim();
  if (payload.html?.trim()) {
    return payload.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

export function shouldSkipInbound(payload: EmailInboundPayload): string | null {
  const from = normalizeEmail(payload.from);
  if (/^(noreply@|no-reply@|mailer-daemon@|postmaster@|bounce@)/.test(from)) {
    return 'noreply_sender';
  }
  // Match worker.txt auto-reply subject filter
  if (payload.subject && /^(auto[- ]?reply|out of office|delivery status)/i.test(payload.subject)) {
    return 'auto_reply_subject';
  }
  const body = extractBody(payload);
  if (!body && !payload.subject?.trim()) return 'empty_body';
  return null;
}

async function dedupedByMessageId(messageId: string) {
  const existing = await prisma.emailMessage.findUnique({
    where: { messageId },
    select: {
      id: true,
      conversationId: true,
      conversation: { select: { customerId: true } },
    },
  });
  if (!existing) return null;
  return {
    ok: true as const,
    conversationId: existing.conversationId,
    messageId: existing.id,
    linkedCustomerId: existing.conversation.customerId ?? undefined,
    deduped: true as const,
  };
}

export async function processInboundEmail(payload: EmailInboundPayload) {
  const skip = shouldSkipInbound(payload);
  if (skip) return { ok: true as const, skipped: skip };

  const email = normalizeEmail(payload.from);
  const body = extractBody(payload);
  const messageId = payload.messageId?.trim() || null;

  if (messageId) {
    const deduped = await dedupedByMessageId(messageId);
    if (deduped) return deduped;
  }

  let linkedCustomerId: string | undefined;
  const contacts = await prisma.customerContact.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { customerId: true },
    take: 2,
  });
  if (contacts.length === 1) linkedCustomerId = contacts[0]!.customerId;

  const conversation = await prisma.emailConversation.upsert({
    where: { email },
    create: {
      email,
      subject: payload.subject,
      lastMessageAt: new Date(),
      customerId: linkedCustomerId,
    },
    update: {
      lastMessageAt: new Date(),
      ...(payload.subject ? { subject: payload.subject } : {}),
    },
  });

  // Never overwrite an existing customerId
  if (!conversation.customerId && linkedCustomerId) {
    await prisma.emailConversation.update({
      where: { id: conversation.id },
      data: { customerId: linkedCustomerId },
    });
  }

  let message;
  try {
    message = await prisma.emailMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'INBOUND',
        body: body || payload.subject || '(empty)',
        messageId,
        inReplyTo: payload.inReplyTo,
        references: payload.references,
      },
    });
  } catch (err) {
    // Concurrent retry: unique messageId race → return existing as success
    if (
      messageId &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const deduped = await dedupedByMessageId(messageId);
      if (deduped) return deduped;
    }
    throw err;
  }

  const final = await prisma.emailConversation.findUnique({
    where: { id: conversation.id },
    select: { customerId: true },
  });

  return {
    ok: true as const,
    conversationId: conversation.id,
    messageId: message.id,
    linkedCustomerId: final?.customerId ?? undefined,
  };
}

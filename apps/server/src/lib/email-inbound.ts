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

/** Metadata-only note so the agent can see filenames (no binary stored). */
export function formatAttachmentNote(payload: EmailInboundPayload): string {
  const list = payload.attachments ?? [];
  if (!payload.hasAttachments && list.length === 0) return '';
  if (list.length === 0) {
    return '\n\n[Attachments detected (not stored)]';
  }
  const parts = list.map(
    (a) => `${a.filename} (${a.contentType}, ${a.size} bytes)`,
  );
  return `\n\n[Attachments detected (not stored): ${parts.join('; ')}]`;
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

function parentMessageIdCandidates(payload: EmailInboundPayload): string[] {
  const refs = (payload.references ?? '')
    .split(/\s+/)
    .map((r) => r.trim())
    .filter(Boolean);
  const ordered = [payload.inReplyTo?.trim(), ...refs].filter(
    (v): v is string => Boolean(v),
  );
  // preserve order, unique
  return [...new Set(ordered)];
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

async function resolveConversationId(
  payload: EmailInboundPayload,
  email: string,
  linkedCustomerId: string | undefined,
): Promise<string> {
  const candidates = parentMessageIdCandidates(payload);
  if (candidates.length > 0) {
    // Prefer In-Reply-To order: walk candidates until a parent message is found
    for (const mid of candidates) {
      const parent = await prisma.emailMessage.findFirst({
        where: { messageId: mid },
        select: { conversationId: true },
      });
      if (parent) {
        await prisma.emailConversation.update({
          where: { id: parent.conversationId },
          data: {
            lastMessageAt: new Date(),
            ...(payload.subject ? { subject: payload.subject } : {}),
          },
        });
        return parent.conversationId;
      }
    }
  }

  // Header threading: same sender without reply headers → NEW conversation.
  // Subject lookup strips repeated Re:/Fwd: prefixes (Outlook-style chains)
  // so replies thread onto the original conversation even without
  // In-Reply-To/References headers.
  const normalizedSubject =
    payload.subject?.trim().replace(/^((?:re|fwd?|fw)\s*(:|\[)\s*)+/i, '').trim() ?? '';
  const existing = normalizedSubject
    ? await prisma.emailConversation.findFirst({
        where: { email, subject: normalizedSubject, status: 'OPEN' },
        orderBy: { lastMessageAt: 'desc' },
        select: { id: true },
      })
    : await prisma.emailConversation.findFirst({
        where: { email, subject: null, status: 'OPEN' },
        orderBy: { lastMessageAt: 'desc' },
        select: { id: true },
      });

  if (existing) {
    await prisma.emailConversation.update({
      where: { id: existing.id },
      data: { lastMessageAt: new Date() },
    });
    return existing.id;
  }

  const created = await prisma.emailConversation.create({
    data: {
      email,
      subject: normalizedSubject || null,
      lastMessageAt: new Date(),
      customerId: linkedCustomerId,
    },
  });
  return created.id;
}

export async function processInboundEmail(payload: EmailInboundPayload) {
  const skip = shouldSkipInbound(payload);
  if (skip) return { ok: true as const, skipped: skip };

  const email = normalizeEmail(payload.from);
  const body =
    (extractBody(payload) || payload.subject || '(empty)') +
    formatAttachmentNote(payload);
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

  const conversationId = await resolveConversationId(payload, email, linkedCustomerId);

  // Never overwrite an existing customerId
  const conversation = await prisma.emailConversation.findUnique({
    where: { id: conversationId },
    select: { id: true, customerId: true },
  });
  if (conversation && !conversation.customerId && linkedCustomerId) {
    await prisma.emailConversation.update({
      where: { id: conversationId },
      data: { customerId: linkedCustomerId },
    });
  }

  let message;
  try {
    message = await prisma.emailMessage.create({
      data: {
        conversationId,
        direction: 'INBOUND',
        body,
        htmlBody: payload.html?.trim() || null,
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
    where: { id: conversationId },
    select: { customerId: true },
  });

  return {
    ok: true as const,
    conversationId,
    messageId: message.id,
    linkedCustomerId: final?.customerId ?? undefined,
  };
}

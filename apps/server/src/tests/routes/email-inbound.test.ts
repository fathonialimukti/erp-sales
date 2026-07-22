import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/email-concierge.js', () => ({
  enqueueEmailConcierge: vi.fn(),
}));
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { processInboundEmail } from '../../lib/email-inbound.js';
import { emailInboundHandler } from '../../routes/email-inbound.js';
import {
  deleteTestCustomer,
  seedTestCustomer,
} from '../helpers/seed.js';

const SECRET = 'test-email-webhook-secret';
const createdConversationIds: string[] = [];
let customerId: string;
const contactEmail = `buyer-${randomUUID()}@example.com`;

function mockRes() {
  const state: { statusCode: number; body: unknown } = { statusCode: 200, body: null };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    },
  } as unknown as Response;
  return { res, state };
}

beforeAll(async () => {
  process.env.EMAIL_WEBHOOK_SECRET = SECRET;
  const customer = await seedTestCustomer();
  customerId = customer.id;
  await prisma.customerContact.create({
    data: {
      customerId,
      name: 'Buyer Contact',
      email: contactEmail,
      isPrimary: true,
    },
  });
});

afterAll(async () => {
  for (const id of createdConversationIds) {
    await prisma.emailConversation.delete({ where: { id } }).catch(() => {});
  }
  if (customerId) {
    await prisma.customerContact.deleteMany({ where: { customerId } }).catch(() => {});
    await deleteTestCustomer(customerId);
  }
});

describe('processInboundEmail', () => {
  it('creates conversation + inbound message and links single contact match', async () => {
    const messageId = `<msg-${randomUUID()}@example.com>`;
    const result = await processInboundEmail({
      from: contactEmail,
      to: 'info@example.com',
      subject: 'Need quote',
      text: 'Please send pricing for SKU-1',
      messageId,
    });

    expect(result.ok).toBe(true);
    if ('skipped' in result) throw new Error('should not skip');
    expect(result.conversationId).toBeTruthy();
    expect(result.messageId).toBeTruthy();
    expect(result.linkedCustomerId).toBe(customerId);
    createdConversationIds.push(result.conversationId);

    const conversation = await prisma.emailConversation.findUnique({
      where: { id: result.conversationId },
      include: { messages: true },
    });
    expect(conversation?.email).toBe(contactEmail.toLowerCase());
    expect(conversation?.customerId).toBe(customerId);
    expect(conversation?.messages).toHaveLength(1);
    expect(conversation?.messages[0]?.direction).toBe('INBOUND');
  });

  it('is idempotent on messageId', async () => {
    const messageId = `<dup-${randomUUID()}@example.com>`;
    const first = await processInboundEmail({
      from: `other-${randomUUID()}@example.com`,
      to: 'info@example.com',
      subject: 'Hello',
      text: 'First',
      messageId,
    });
    if ('skipped' in first) throw new Error('should not skip');
    createdConversationIds.push(first.conversationId);

    const second = await processInboundEmail({
      from: `other-${randomUUID()}@example.com`,
      to: 'info@example.com',
      subject: 'Hello again',
      text: 'Second should dedupe',
      messageId,
    });
    if ('skipped' in second) throw new Error('should not skip');

    expect(second.conversationId).toBe(first.conversationId);
    expect(second.messageId).toBe(first.messageId);
    expect('deduped' in second && second.deduped).toBe(true);

    const count = await prisma.emailMessage.count({ where: { messageId } });
    expect(count).toBe(1);
  });

  it('soft-skips noreply senders', async () => {
    const result = await processInboundEmail({
      from: 'noreply@example.com',
      to: 'info@example.com',
      subject: 'Auto',
      text: 'ignore me',
    });
    expect(result).toEqual({ ok: true, skipped: 'noreply_sender' });
  });

  it('soft-skips auto-reply subjects', async () => {
    const result = await processInboundEmail({
      from: `human-${randomUUID()}@example.com`,
      to: 'info@example.com',
      subject: 'Out of Office: away until Monday',
      text: 'I am away',
    });
    expect(result).toEqual({ ok: true, skipped: 'auto_reply_subject' });
  });

  it('soft-skips empty body without subject', async () => {
    const result = await processInboundEmail({
      from: `empty-${randomUUID()}@example.com`,
      to: 'info@example.com',
      text: '   ',
    });
    expect(result).toEqual({ ok: true, skipped: 'empty_body' });
  });

  it('appends attachment metadata note to stored body (no binary)', async () => {
    const messageId = `<att-${randomUUID()}@example.com>`;
    const result = await processInboundEmail({
      from: `att-${randomUUID()}@example.com`,
      to: 'info@example.com',
      subject: 'Invoice attached',
      text: 'Please process',
      messageId,
      hasAttachments: true,
      attachments: [
        {
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
          size: 24580,
        },
      ],
    });
    if ('skipped' in result) throw new Error('should not skip');
    createdConversationIds.push(result.conversationId);

    const msg = await prisma.emailMessage.findUnique({
      where: { id: result.messageId },
    });
    expect(msg?.body).toContain('Please process');
    expect(msg?.body).toContain(
      '[Attachments detected (not stored): invoice.pdf (application/pdf, 24580 bytes)]',
    );
  });

  it('never overwrites existing customerId', async () => {
    const email = `sticky-${randomUUID()}@example.com`;
    const first = await processInboundEmail({
      from: email,
      to: 'info@example.com',
      subject: 'Unlinked',
      text: 'No contact yet',
      messageId: `<sticky-1-${randomUUID()}@example.com>`,
    });
    if ('skipped' in first) throw new Error('should not skip');
    createdConversationIds.push(first.conversationId);

    await prisma.emailConversation.update({
      where: { id: first.conversationId },
      data: { customerId },
    });

    // Create a different contact with same email pointing elsewhere would be multi-match;
    // instead ensure a later inbound does not clear/change the assigned customer.
    // Reply with In-Reply-To so it joins the same conversation (header threading)
    const firstMsg = await prisma.emailMessage.findFirst({
      where: { conversationId: first.conversationId },
      orderBy: { createdAt: 'asc' },
    });
    const second = await processInboundEmail({
      from: email,
      to: 'info@example.com',
      subject: 'Follow-up',
      text: 'Still me',
      messageId: `<sticky-2-${randomUUID()}@example.com>`,
      inReplyTo: firstMsg?.messageId ?? undefined,
      references: firstMsg?.messageId ?? undefined,
    });
    if ('skipped' in second) throw new Error('should not skip');
    expect(second.conversationId).toBe(first.conversationId);

    const conversation = await prisma.emailConversation.findUnique({
      where: { id: first.conversationId },
    });
    expect(conversation?.customerId).toBe(customerId);
  });

  it('starts a new conversation for same sender without reply headers', async () => {
    const email = `thread-${randomUUID()}@example.com`;
    const a = await processInboundEmail({
      from: email,
      to: 'info@aetherglo.com',
      subject: 'First topic',
      text: 'Hello 1',
      messageId: `<a-${randomUUID()}@example.com>`,
    });
    if ('skipped' in a) throw new Error('skip');
    createdConversationIds.push(a.conversationId);

    const b = await processInboundEmail({
      from: email,
      to: 'info@aetherglo.com',
      subject: 'Second topic',
      text: 'Hello 2',
      messageId: `<b-${randomUUID()}@example.com>`,
    });
    if ('skipped' in b) throw new Error('skip');
    createdConversationIds.push(b.conversationId);

    expect(b.conversationId).not.toBe(a.conversationId);
  });

  it('joins conversation when In-Reply-To matches prior messageId', async () => {
    const email = `reply-${randomUUID()}@example.com`;
    const parentMid = `<parent-${randomUUID()}@example.com>`;
    const first = await processInboundEmail({
      from: email,
      to: 'info@aetherglo.com',
      subject: 'Quote',
      text: 'Need prices',
      messageId: parentMid,
    });
    if ('skipped' in first) throw new Error('skip');
    createdConversationIds.push(first.conversationId);

    const second = await processInboundEmail({
      from: email,
      to: 'info@aetherglo.com',
      subject: 'Re: Quote',
      text: 'Following up',
      messageId: `<child-${randomUUID()}@example.com>`,
      inReplyTo: parentMid,
      references: parentMid,
    });
    if ('skipped' in second) throw new Error('skip');
    expect(second.conversationId).toBe(first.conversationId);
  });
});

describe('emailInboundHandler', () => {
  it('returns 401 when secret missing/wrong', async () => {
    const { res, state } = mockRes();
    await emailInboundHandler(
      {
        header: () => 'wrong-secret',
        body: { from: 'a@b.com', to: 'c@d.com', text: 'hi' },
      } as unknown as Request,
      res,
    );
    expect(state.statusCode).toBe(401);
  });

  it('returns 200 for valid secret + payload', async () => {
    const { res, state } = mockRes();
    const from = `handler-${randomUUID()}@example.com`;
    await emailInboundHandler(
      {
        header: (name: string) =>
          name.toLowerCase() === 'x-email-webhook-secret' ? SECRET : undefined,
        body: {
          from,
          to: 'info@example.com',
          subject: 'Handler test',
          text: 'Hello from handler',
          messageId: `<handler-${randomUUID()}@example.com>`,
        },
      } as unknown as Request,
      res,
    );
    expect(state.statusCode).toBe(200);
    const body = state.body as { ok: boolean; conversationId?: string };
    expect(body.ok).toBe(true);
    if (body.conversationId) createdConversationIds.push(body.conversationId);
  });
});

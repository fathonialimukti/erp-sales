import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { emailAutoReplyHandler } from '../../routes/email-auto-reply.js';

const SECRET = 'test-email-auto-reply-secret';
const createdConversationIds: string[] = [];

vi.mock('../../lib/email-concierge.js', () => ({
  enqueueEmailConcierge: vi.fn(),
}));

import { enqueueEmailConcierge } from '../../lib/email-concierge.js';

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

function mockReq(body: unknown, secret?: string): Request {
  return {
    header: (name: string) =>
      name.toLowerCase() === 'x-email-webhook-secret' ? secret : undefined,
    body,
  } as unknown as Request;
}

beforeAll(() => {
  process.env.EMAIL_WEBHOOK_SECRET = SECRET;
});

afterAll(async () => {
  vi.restoreAllMocks();
  for (const id of createdConversationIds) {
    await prisma.emailConversation.delete({ where: { id } }).catch(() => {});
  }
});

describe('emailAutoReplyHandler', () => {
  it('returns 401 when secret missing/wrong', async () => {
    const { res, state } = mockRes();
    await emailAutoReplyHandler(
      mockReq({ from: 'a@b.com', to: 'c@d.com', text: 'hi' }, 'wrong-secret'),
      res,
    );
    expect(state.statusCode).toBe(401);
  });

  it('returns 200 with reply:null when inbound is skipped', async () => {
    const { res, state } = mockRes();
    await emailAutoReplyHandler(
      mockReq(
        {
          from: 'noreply@example.com',
          to: 'info@example.com',
          subject: 'Auto',
          text: 'ignore me',
        },
        SECRET,
      ),
      res,
    );
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({
      ok: true,
      skipped: 'noreply_sender',
      reply: null,
    });
  });

  it('stores inbound, enqueues concierge, returns reply:null (no CF AI body)', async () => {
    vi.mocked(enqueueEmailConcierge).mockClear();
    const { res, state } = mockRes();
    const from = `auto-reply-${randomUUID()}@example.com`;
    await emailAutoReplyHandler(
      mockReq(
        {
          from,
          to: 'info@example.com',
          subject: 'Need pricing',
          text: 'Can you send a quote for SKU-1?',
          messageId: `<auto-reply-${randomUUID()}@example.com>`,
        },
        SECRET,
      ),
      res,
    );

    expect(state.statusCode).toBe(200);
    const body = state.body as {
      ok: boolean;
      conversationId?: string;
      messageId?: string;
      reply?: unknown;
    };
    expect(body.ok).toBe(true);
    expect(body.conversationId).toBeTruthy();
    expect(body.messageId).toBeTruthy();
    expect(body.reply).toBeNull();
    expect(enqueueEmailConcierge).toHaveBeenCalledWith(body.conversationId);
    if (body.conversationId) createdConversationIds.push(body.conversationId);

    const messages = await prisma.emailMessage.findMany({
      where: { conversationId: body.conversationId },
      orderBy: { createdAt: 'asc' },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.direction).toBe('INBOUND');
  });

  it('does not re-enqueue on deduped messageId', async () => {
    vi.mocked(enqueueEmailConcierge).mockClear();
    const messageId = `<dedupe-auto-${randomUUID()}@example.com>`;
    const from = `dedupe-auto-${randomUUID()}@example.com`;
    const payload = {
      from,
      to: 'info@example.com',
      subject: 'Hello',
      text: 'First inbound',
      messageId,
    };

    const first = mockRes();
    await emailAutoReplyHandler(mockReq(payload, SECRET), first.res);
    expect(first.state.statusCode).toBe(200);
    const firstBody = first.state.body as {
      conversationId?: string;
      reply?: unknown;
    };
    if (firstBody.conversationId) createdConversationIds.push(firstBody.conversationId);
    expect(firstBody.reply).toBeNull();
    expect(enqueueEmailConcierge).toHaveBeenCalledOnce();

    const second = mockRes();
    await emailAutoReplyHandler(mockReq(payload, SECRET), second.res);
    expect(second.state.statusCode).toBe(200);
    expect(second.state.body).toMatchObject({
      ok: true,
      deduped: true,
      conversationId: firstBody.conversationId,
      reply: null,
    });
    // still only one enqueue (first request)
    expect(enqueueEmailConcierge).toHaveBeenCalledOnce();
  });
});

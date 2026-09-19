import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import {
  applyConciergeResult,
  isStaleRunning,
  MAX_AGENT_STEPS,
  runEmailConcierge,
  shouldForceFinalize,
  STALE_RUNNING_MS,
  validateConciergeResult,
} from '../../lib/email-concierge.js';
import type { ConciergeRunState } from '../../lib/email-concierge-tools.js';
import { prisma } from '../../lib/prisma.js';

// The agent loop is the only caller of the AI SDK. Mock the single AI entry
// point so the tool-loop-exhaustion regression below is deterministic while
// every other `ai` export (tool, stepCountIs, …) stays real.
vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, generateText: vi.fn() };
});

vi.mock('../../lib/email-smtp.js', () => ({
  sendSmtpEmail: vi.fn(async () => ({ messageId: `<smtp-test-${randomUUID()}@aetherglo.com>` })),
  createSmtpTransport: vi.fn(),
  generateMessageId: vi.fn(() => '<smtp-test@aetherglo.com>'),
}));

// generateText is mocked, so the provider/model is never invoked. Stub the
// factory to keep the test offline and independent of AI env config.
vi.mock('../../lib/ai-provider.js', () => ({
  getChatModel: vi.fn(async () => ({})),
}));

import { generateText } from 'ai';

type MockTool = { execute: (input: Record<string, unknown>) => Promise<unknown> };
type MockGenerateOptions = {
  prepareStep?: (opts: { stepNumber: number }) => unknown;
  tools: Record<string, MockTool>;
};

// Real-DB convention (matches every other integration test in this suite):
// applyConciergeResult writes via prisma.$transaction, so the conversation
// rows referenced by id 'c1' / 'c2' must actually exist or the FK constraint
// fails before the subject assertions can run.
const conversationIds: string[] = [];

beforeAll(async () => {
  for (const id of ['c1', 'c2']) {
    await prisma.emailConversation.create({
      data: { id, email: `a@b.com-${randomUUID()}`, subject: null },
    });
    conversationIds.push(id);
  }
});

afterAll(async () => {
  for (const id of conversationIds) {
    await prisma.emailConversation.delete({ where: { id } }).catch(() => {});
  }
});

describe('isStaleRunning', () => {
  it('treats fresh RUNNING as not stale', () => {
    const now = Date.now();
    expect(isStaleRunning('RUNNING', new Date(now - 60_000), now)).toBe(false);
  });

  it('treats RUNNING older than 5 minutes as stale', () => {
    const now = Date.now();
    expect(isStaleRunning('RUNNING', new Date(now - STALE_RUNNING_MS - 1), now)).toBe(true);
  });

  it('never treats non-RUNNING as stale', () => {
    const now = Date.now();
    expect(isStaleRunning('FAILED', new Date(now - STALE_RUNNING_MS * 2), now)).toBe(false);
    expect(isStaleRunning('IDLE', new Date(now - STALE_RUNNING_MS * 2), now)).toBe(false);
  });
});

describe('validateConciergeResult', () => {
  it('does not send without finalize', () => {
    const state: ConciergeRunState = { createdOrderDocNumbers: [] };
    const r = validateConciergeResult(state);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing_finalize');
  });

  it('rejects script html', () => {
    const state: ConciergeRunState = {
      createdOrderDocNumbers: [],
      finalized: { htmlBody: '<p>hi</p><script>x</script>' },
    };
    const r = validateConciergeResult(state);
    expect(r.ok).toBe(false);
  });

  it('requires order doc in html when order created', () => {
    const state: ConciergeRunState = {
      createdOrderDocNumbers: ['SO-20260722-0001'],
      finalized: { htmlBody: '<p>Thanks, we created a draft order.</p>' },
    };
    const r = validateConciergeResult(state);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing_order_reference');
  });

  it('accepts finalize with order doc reference', () => {
    const state: ConciergeRunState = {
      createdOrderDocNumbers: ['SO-20260722-0001'],
      finalized: {
        htmlBody: '<p>Draft order <strong>SO-20260722-0001</strong> is ready for review.</p>',
      },
    };
    const r = validateConciergeResult(state);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.html).toContain('SO-20260722-0001');
      expect(r.text).toMatch(/SO-20260722-0001/);
    }
  });

  it('caps subject length at 200 chars', () => {
    const longSubject = 'S'.repeat(250);
    const state: ConciergeRunState = {
      createdOrderDocNumbers: [],
      finalized: {
        subject: longSubject,
        htmlBody: '<p>Hello</p>',
      },
    };
    const r = validateConciergeResult(state);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.subject).toHaveLength(200);
    }
  });
});

describe('applyConciergeResult', () => {
  it('does not call SMTP without finalize', async () => {
    const send = vi.fn(async () => ({ messageId: '<x@aetherglo.com>' }));
    const r = await applyConciergeResult(
      {
        state: { createdOrderDocNumbers: [] },
        conversation: { id: 'c1', email: 'a@b.com', subject: 'Hi' },
      },
      send as never,
    );
    expect(r.ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('ignores AI-provided subject and uses conversation subject for threading', async () => {
    type SendArgs = [{ to: string; subject: string; html: string; text: string; inReplyTo?: string; references?: string }];
    const send = vi.fn(async () => ({ messageId: `<x-${randomUUID()}@aetherglo.com>` }));
    const r = await applyConciergeResult(
      {
        state: {
          createdOrderDocNumbers: [],
          finalized: {
            subject: 'Product Inquiry', // AI invented a different subject
            htmlBody: '<p>Hello</p>',
          },
        },
        conversation: { id: 'c1', email: 'a@b.com', subject: 'test' },
      },
      send as never,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.subject).toBe('Re: test');
      expect(r.subject).not.toBe('Re: Product Inquiry');
    }
    expect(send).toHaveBeenCalledTimes(1);
    const sendArgs = send.mock.calls as unknown as SendArgs[];
    expect(sendArgs[0]![0].subject).toBe('Re: test');
  });

  it('preserves Re: prefix when conversation subject already has it', async () => {
    const send = vi.fn(async () => ({ messageId: `<x-${randomUUID()}@aetherglo.com>` }));
    const r = await applyConciergeResult(
      {
        state: {
          createdOrderDocNumbers: [],
          finalized: { subject: 'New Topic', htmlBody: '<p>Hi</p>' },
        },
        conversation: { id: 'c2', email: 'a@b.com', subject: 'Re: test' },
      },
      send as never,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.subject).toBe('Re: test');
  });

  // SPEC §2.1: a run that refused a non-carton line sent its reply but created
  // no order — the conversation is waiting on the buyer, not done.
  it('marks the conversation AWAITING_BUYER_CONFIRMATION when the carton gate refused the order', async () => {
    const send = vi.fn(async () => ({ messageId: `<x-${randomUUID()}@aetherglo.com>` }));
    const r = await applyConciergeResult(
      {
        state: {
          createdOrderDocNumbers: [],
          cartonBlocked: {
            kind: 'carton_multiple',
            message: 'Product A is only sold per carton of 20 pcs',
          },
          finalized: {
            htmlBody:
              '<p>Product A is only sold per carton of 20 pcs. You asked for 50 — shall I make it 40 (2 carton) or 60 (3 carton)?</p>',
          },
        },
        conversation: { id: 'c1', email: 'a@b.com', subject: 'Order' },
      },
      send as never,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.agentStatus).toBe('AWAITING_BUYER_CONFIRMATION');

    const conv = await prisma.emailConversation.findUnique({ where: { id: 'c1' } });
    expect(conv?.agentStatus).toBe('AWAITING_BUYER_CONFIRMATION');
  });

  it('marks the conversation SENT when an order was created alongside the reply', async () => {
    const send = vi.fn(async () => ({ messageId: `<x-${randomUUID()}@aetherglo.com>` }));
    const r = await applyConciergeResult(
      {
        state: {
          createdOrderDocNumbers: ['SO-20260918-0001'],
          finalized: {
            htmlBody: '<p>Draft order <strong>SO-20260918-0001</strong> is ready.</p>',
          },
        },
        conversation: { id: 'c2', email: 'a@b.com', subject: 'Order' },
      },
      send as never,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.agentStatus).toBe('SENT');
  });
});

describe('shouldForceFinalize', () => {
  it('does not force finalize while steps remain', () => {
    expect(shouldForceFinalize(0)).toBe(false);
    expect(shouldForceFinalize(MAX_AGENT_STEPS - 2)).toBe(false);
  });

  it('forces finalize on the final allowed step', () => {
    expect(shouldForceFinalize(MAX_AGENT_STEPS - 1)).toBe(true);
  });
});

describe('runEmailConcierge agent loop', () => {
  it('sends outbound even when the model spends every step on tools (no linked customer)', async () => {
    // Regression for prod conversation 01M2HVDFB7600RYH6F2WF231QV:
    // customerId:null → the model keeps exploring tools, exhausts its step
    // budget and never calls finalizeCustomerReply, so the run was marked
    // FAILED/missing_finalize and no OUTBOUND row was ever written.
    const conversation = await prisma.emailConversation.create({
      data: {
        email: `agent-${randomUUID()}@example.com`,
        subject: 'Quote',
        lastMessageAt: new Date(),
      },
    });
    try {
      await prisma.emailMessage.createMany({
        data: [
          { conversationId: conversation.id, direction: 'INBOUND', body: 'try again' },
          { conversationId: conversation.id, direction: 'INBOUND', body: 'try again' },
        ],
      });

      // Emulate the prod loop: a non-finalize tool every step, no finalize on
      // its own. Only the caller's prepareStep override can force finalize.
      vi.mocked(generateText).mockImplementation(async (options) => {
        const opts = options as unknown as MockGenerateOptions;
        for (let stepNumber = 0; stepNumber < MAX_AGENT_STEPS; stepNumber++) {
          const prepared = (await opts.prepareStep?.({ stepNumber })) as
            | { toolChoice?: { type: string; toolName: string } }
            | undefined;
          if (prepared?.toolChoice?.type === 'tool') {
            await opts.tools[prepared.toolChoice.toolName]?.execute({
              htmlBody: '<p>Sorry for the delay — here is our reply.</p>',
            });
            return undefined as never;
          }
        }
        return undefined as never;
      });

      await runEmailConcierge(conversation.id);

      const conv = await prisma.emailConversation.findUnique({ where: { id: conversation.id } });
      expect(conv?.agentStatus).toBe('SENT');
      expect(conv?.agentError).toBeNull();
      expect(conv?.lastOutboundAt).toBeTruthy();

      const outbound = await prisma.emailMessage.findFirst({
        where: { conversationId: conversation.id, direction: 'OUTBOUND' },
      });
      expect(outbound?.sendStatus).toBe('SENT');
      expect(outbound?.body).toContain('Sorry for the delay');
    } finally {
      await prisma.emailConversation.delete({ where: { id: conversation.id } }).catch(() => {});
    }
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'crypto';
import {
  applyConciergeResult,
  isStaleRunning,
  STALE_RUNNING_MS,
  validateConciergeResult,
} from '../../lib/email-concierge.js';
import type { ConciergeRunState } from '../../lib/email-concierge-tools.js';
import { prisma } from '../../lib/prisma.js';

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
});

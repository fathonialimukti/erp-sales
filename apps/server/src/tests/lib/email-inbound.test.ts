import { describe, expect, it, vi } from 'vitest';

// `shouldSkipInbound` is pure — stub prisma so this unit test never opens a DB
// connection (email-inbound.ts imports the client at module load).
vi.mock('../../lib/prisma.js', () => ({ prisma: {} }));

import { shouldSkipInbound } from '../../lib/email-inbound.js';

function inbound(from: string, subject = 'Question about my order', text = 'Hello, I have a question.') {
  return { from, to: 'info@aetherglo.com', subject, text };
}

describe('shouldSkipInbound — automated/bounce senders', () => {
  it('skips Brevo VERP bounce addresses (bounces-<digits>-<digits>@mail.<domain>)', () => {
    expect(
      shouldSkipInbound(
        inbound(
          'bounces-486094414-3447527115@mail.aetherglo.com',
          '[DELIVERABILITY_PROBE] internal test — safe to ignore',
        ),
      ),
    ).toBe('noreply_sender');
  });

  it('skips tagged VERP local parts like bounce+abc@x.com', () => {
    expect(shouldSkipInbound(inbound('bounce+abc@x.com'))).toBe('noreply_sender');
  });

  it('skips dashed VERP local parts like bounce-123@x.com', () => {
    expect(shouldSkipInbound(inbound('bounce-123@x.com'))).toBe('noreply_sender');
  });

  it('skips the plural bounces- prefix', () => {
    expect(shouldSkipInbound(inbound('bounces-123-456@mail.x.com'))).toBe('noreply_sender');
  });

  it('still skips the existing plain bounce@ filter', () => {
    expect(shouldSkipInbound(inbound('bounce@x.com'))).toBe('noreply_sender');
  });

  it('still skips existing filters (mailer-daemon@)', () => {
    expect(shouldSkipInbound(inbound('mailer-daemon@x.com'))).toBe('noreply_sender');
  });

  it('still skips existing filters (noreply@ / no-reply@ / postmaster@)', () => {
    expect(shouldSkipInbound(inbound('noreply@x.com'))).toBe('noreply_sender');
    expect(shouldSkipInbound(inbound('no-reply@x.com'))).toBe('noreply_sender');
    expect(shouldSkipInbound(inbound('postmaster@x.com'))).toBe('noreply_sender');
  });
});

describe('shouldSkipInbound — normal customers are NOT skipped', () => {
  it('does not skip bouncer@x.com (bounce appears only as a substring)', () => {
    expect(shouldSkipInbound(inbound('bouncer@x.com'))).toBeNull();
  });

  it('does not skip mybounce@x.com (bounce appears only as a substring)', () => {
    expect(shouldSkipInbound(inbound('mybounce@x.com'))).toBeNull();
  });

  it('does not skip a normal customer address', () => {
    expect(shouldSkipInbound(inbound('fathonialim2@gmail.com'))).toBeNull();
  });
});
import { timingSafeEqual } from 'node:crypto';

function secretsEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Fail-closed: empty EMAIL_WEBHOOK_SECRET rejects all requests. */
export function isValidEmailWebhookSecret(provided: string | undefined): boolean {
  const expected = process.env.EMAIL_WEBHOOK_SECRET ?? '';
  if (!expected) return false;
  return secretsEqual(String(provided ?? ''), expected);
}

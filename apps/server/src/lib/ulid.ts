import { randomBytes } from 'node:crypto';

const ULID_ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Shared ULID generator (T2 dedupe: single export; previously duplicated in
 * lib/ai-widgets.ts and lib/backup.ts).
 */
export function generateUlid(): string {
  let time = Date.now();
  let timePart = '';
  for (let i = 0; i < 10; i++) {
    timePart = ULID_ENCODING[time % 32]! + timePart;
    time = Math.floor(time / 32);
  }
  let random = BigInt(`0x${randomBytes(10).toString('hex')}`);
  let randomPart = '';
  for (let i = 0; i < 16; i++) {
    randomPart = ULID_ENCODING[Number(random % 32n)]! + randomPart;
    random /= 32n;
  }
  return timePart + randomPart;
}

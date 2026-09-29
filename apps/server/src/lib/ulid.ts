import { ulid } from 'ulid';

/**
 * Shared ULID generator (T2 dedupe: single export; previously duplicated in
 * lib/ai-widgets.ts and lib/backup.ts).
 *
 * T1 hardening: thin wrapper over the `ulid` package — the hand-rolled
 * Crockford base32 encoder is gone. Output is unchanged in shape: 26 chars,
 * Crockford's alphabet, 10-char ms timestamp + 16-char random. Not monotonic
 * (neither was the old impl) and nothing sorts or paginates by id.
 */
export function generateUlid(): string {
  return ulid();
}

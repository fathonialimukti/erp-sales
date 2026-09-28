import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getJwtSecret } from './jwt-secret.js';

export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_TOKEN_TTL_MS = 60 * 60 * 1000;

// ponytail: double-submit cookie — token is `<expiresAtMs>.<nonce>.<hmac>`, and
// the server accepts it only when cookie value === x-csrf-token header. The HMAC
// is what makes that safe: without it a sibling subdomain that can set a cookie
// (the same-site vector sameSite=lax does not cover) also picks the token, since
// unsigned double-submit is just "attacker controls both halves".
const sign = (payload: string): string =>
    createHmac('sha256', getJwtSecret()).update(payload).digest('hex');

const safeEqual = (a: string, b: string): boolean =>
    a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const generateCsrfToken = (): string => {
    const payload = `${Date.now() + CSRF_TOKEN_TTL_MS}.${randomBytes(32).toString('hex')}`;
    return `${payload}.${sign(payload)}`;
};

/**
 * Signature + expiry check. Fails closed on malformed input: a non-numeric
 * expiresAt yields NaN, and `now < NaN` is false, so garbage never passes.
 */
export const isValidCsrfToken = (token: string, now: number = Date.now()): boolean => {
    const [expiresAt, nonce, signature] = token.split('.');
    if (!expiresAt || !nonce || !signature) return false;
    if (!safeEqual(signature, sign(`${expiresAt}.${nonce}`))) return false;
    return now < Number(expiresAt);
};

/** Double-submit: both halves present, identical, well-formed and unexpired. */
export const validateCsrfToken = (provided: string, expected: string): boolean =>
    safeEqual(provided, expected) && isValidCsrfToken(provided);

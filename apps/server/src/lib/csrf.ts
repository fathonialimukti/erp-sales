import { timingSafeEqual, randomBytes } from 'node:crypto';

export const CSRF_HEADER = 'x-csrf-token';
export const CSRF_COOKIE_NAME = 'csrf_token';

export const generateCsrfToken = (): string => randomBytes(32).toString('hex');

export const validateCsrfToken = (provided: string, expected: string): boolean => {
    if (provided.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
};

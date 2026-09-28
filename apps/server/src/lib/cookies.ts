import type { Response } from 'express';

/**
 * Additive `Set-Cookie`.
 *
 * `res.setHeader('Set-Cookie', value)` REPLACES whatever was there, and a tRPC
 * response can legitimately carry more than one cookie: `createContext` mints
 * the CSRF cookie on every request, and `auth.login` / `auth.logout` mint (or
 * clear) the session cookie from inside the resolver — which silently dropped
 * the CSRF mint. Node accepts an array of strings and emits one `Set-Cookie`
 * header per entry, so appending is the fix; every cookie-setting path must go
 * through this instead of a bare `setHeader`.
 */
export function appendSetCookie(res: Response, cookie: string): void {
    // `res.getHeader?.()` — a partial Response double (a unit-test stub) has no
    // reader, and there is nothing to preserve in that case anyway.
    const existing = res.getHeader?.('Set-Cookie');
    const values = existing === undefined ? [] : ([] as string[]).concat(existing as string | string[]);
    res.setHeader('Set-Cookie', [...values, cookie]);
}

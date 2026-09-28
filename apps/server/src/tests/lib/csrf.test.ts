import { describe, it, expect, vi } from 'vitest';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { createContext, type Context } from '../../context.js';
import { protectedProcedure, router } from '../../trpc.js';
import { createTestContext } from '../helpers/caller.js';
import {
    CSRF_COOKIE_NAME,
    CSRF_HEADER,
    CSRF_TOKEN_TTL_MS,
    generateCsrfToken,
    isValidCsrfToken,
    validateCsrfToken,
} from '../../lib/csrf.js';

// A router wired the way `protectedProcedure` is meant to be once the client
// echoes the token: the central hook applied once, on the base procedure.
// (The former `csrfProtectedProcedure` re-applied the same check on top of this
// and had no call sites — see trpc.ts.)
const probeRouter = router({
    ping: protectedProcedure.mutation(() => ({ ok: true })),
    peek: protectedProcedure.query(() => ({ ok: true })),
});

const USER = { userId: 'user-1', email: 'user@example.com', name: 'User' };

/** `cookieToken` becomes ctx.csrfToken; `headerToken` becomes the echoed header. */
const callMutation = (cookieToken: string, headerToken?: string) => {
    const base = createTestContext(USER);
    const ctx = {
        ...base,
        csrfToken: cookieToken,
        req: { ...base.req, headers: headerToken ? { [CSRF_HEADER]: headerToken } : {} },
    } as unknown as Context;
    return probeRouter.createCaller(ctx).ping();
};

const callQuery = (headerToken?: string) => {
    const base = createTestContext(USER);
    const ctx = {
        ...base,
        req: { ...base.req, headers: headerToken ? { [CSRF_HEADER]: headerToken } : {} },
    } as unknown as Context;
    return probeRouter.createCaller(ctx).peek();
};

const FORBIDDEN = { code: 'FORBIDDEN' };

/** Defaulted destructuring: split() yields string | undefined under noUncheckedIndexedAccess. */
const parts = (token: string) => {
    const [expiresAt = '', nonce = '', signature = ''] = token.split('.');
    return { expiresAt, nonce, signature };
};

/** Swap the first character, keeping the length identical to the original. */
const flipFirst = (value: string) => `${value[0] === 'a' ? 'b' : 'a'}${value.slice(1)}`;

describe('csrf token primitive', () => {
    it('mints a signed token that validates, and mints a distinct one each call', () => {
        const token = generateCsrfToken();
        expect(isValidCsrfToken(token)).toBe(true);
        expect(validateCsrfToken(token, token)).toBe(true);
        expect(generateCsrfToken()).not.toBe(token);
    });

    it('rejects a token whose payload was tampered with', () => {
        const token = generateCsrfToken();
        const { expiresAt, nonce, signature } = parts(token);
        const tampered = `${expiresAt}.${flipFirst(nonce)}.${signature}`;

        expect(tampered).toHaveLength(token.length);
        expect(validateCsrfToken(tampered, tampered)).toBe(false);
    });

    it('rejects a token whose signature was tampered with', () => {
        const { expiresAt, nonce, signature } = parts(generateCsrfToken());
        const tampered = `${expiresAt}.${nonce}.${flipFirst(signature)}`;

        expect(validateCsrfToken(tampered, tampered)).toBe(false);
    });

    it('rejects an unsigned token an attacker minted for themselves', () => {
        // The subdomain-injection case: an attacker who can set a cookie picks
        // both halves. Without the HMAC the server would have no way to tell.
        const forged = `${Date.now() + CSRF_TOKEN_TTL_MS}.${'0'.repeat(64)}.${'0'.repeat(64)}`;
        expect(validateCsrfToken(forged, forged)).toBe(false);
    });

    it('rejects a token past its TTL', () => {
        const token = generateCsrfToken();
        const past = Date.now() + CSRF_TOKEN_TTL_MS + 1_000;

        expect(isValidCsrfToken(token, past)).toBe(false);
        expect(validateCsrfToken(token, token)).toBe(true); // sanity: still valid now
    });

    it('fails closed on malformed tokens', () => {
        for (const bad of ['', 'nope', 'a.b', 'a.b.c.d', `${Date.now() + CSRF_TOKEN_TTL_MS}.only-two-parts`]) {
            expect(isValidCsrfToken(bad)).toBe(false);
        }
    });
});

describe('csrfOnMutation middleware', () => {
    it('passes when the header echoes the cookie token', async () => {
        const token = generateCsrfToken();
        await expect(callMutation(token, token)).resolves.toEqual({ ok: true });
    });

    it('rejects a missing token', async () => {
        await expect(callMutation(generateCsrfToken())).rejects.toMatchObject(FORBIDDEN);
    });

    it('rejects a header that does not match the cookie token', async () => {
        await expect(callMutation(generateCsrfToken(), generateCsrfToken())).rejects.toMatchObject(FORBIDDEN);
    });

    it('rejects a tampered token', async () => {
        const cookieToken = generateCsrfToken();
        const { expiresAt, nonce, signature } = parts(cookieToken);
        const tampered = `${expiresAt}.${flipFirst(nonce)}.${signature}`;

        // Same length as the cookie value, so the length short-circuit in
        // validateCsrfToken cannot be what rejects it — the values differ.
        expect(tampered).toHaveLength(cookieToken.length);
        await expect(callMutation(cookieToken, tampered)).rejects.toMatchObject(FORBIDDEN);
    });

    it('rejects an expired token even when cookie and header agree', async () => {
        const token = generateCsrfToken();
        const future = Date.now() + CSRF_TOKEN_TTL_MS + 1_000;
        const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(future);
        try {
            await expect(callMutation(token, token)).rejects.toMatchObject(FORBIDDEN);
        } finally {
            nowSpy.mockRestore();
        }
    });

    it('leaves queries ungated', async () => {
        await expect(callQuery()).resolves.toEqual({ ok: true });
    });
});

describe('createContext cookie rotation', () => {
    const runCreateContext = async (cookieValue?: string, preexisting?: string) => {
        const headers: Record<string, string | string[]> = preexisting ? { 'Set-Cookie': preexisting } : {};
        const setCookies: string[] = [];
        const req = {
            headers: cookieValue ? { cookie: `${CSRF_COOKIE_NAME}=${cookieValue}` } : {},
        } as unknown as CreateExpressContextOptions['req'];
        const res = {
            setHeader: (name: string, value: string | string[]) => {
                if (name === 'Set-Cookie') setCookies.push(...(Array.isArray(value) ? value : [value]));
            },
            getHeader: (name: string) => headers[name],
        } as unknown as CreateExpressContextOptions['res'];

        const ctx = await createContext({ req, res } as unknown as CreateExpressContextOptions);
        return { ctx, setCookies };
    };

    it('keeps a valid cookie value instead of churning the token', async () => {
        const token = generateCsrfToken();
        const { ctx, setCookies } = await runCreateContext(token);

        expect(ctx.csrfToken).toBe(token);
        expect(setCookies[0]).toContain(token);
    });

    it('appends the CSRF cookie instead of dropping a cookie a resolver already set', async () => {
        // auth.login / auth.logout call appendSetCookie for the session cookie.
        // A bare setHeader here would replace theirs and the response would
        // arrive with no CSRF mint at all.
        const token = generateCsrfToken();
        const sessionCookie = 'access_token=jwt-value; Path=/; HttpOnly';

        const { setCookies } = await runCreateContext(token, sessionCookie);

        expect(setCookies).toEqual([sessionCookie, expect.stringContaining(`${CSRF_COOKIE_NAME}=${token}`)]);
    });

    it('mints a replacement when the cookie is absent', async () => {
        const { ctx } = await runCreateContext();
        expect(isValidCsrfToken(ctx.csrfToken)).toBe(true);
    });

    it('mints a replacement for an expired cookie rather than wedging the caller', async () => {
        const expired = generateCsrfToken();
        const future = Date.now() + CSRF_TOKEN_TTL_MS + 1_000;
        const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(future);
        try {
            const { ctx } = await runCreateContext(expired);
            expect(ctx.csrfToken).not.toBe(expired);
            expect(isValidCsrfToken(ctx.csrfToken, future)).toBe(true);
        } finally {
            nowSpy.mockRestore();
        }
    });

    it('mints a replacement for a forged cookie', async () => {
        const forged = `${Date.now() + CSRF_TOKEN_TTL_MS}.${'0'.repeat(64)}.${'0'.repeat(64)}`;
        const { ctx } = await runCreateContext(forged);
        expect(ctx.csrfToken).not.toBe(forged);
    });
});

import { appRouter } from '../../router.js';
import { prisma } from '../../lib/prisma.js';
import type { Context } from '../../context.js';
import { DEFAULT_LOCALE, type ServerLocale } from '../../lib/locale.js';
import { CSRF_HEADER, generateCsrfToken } from '../../lib/csrf.js';

export const createTestContext = (
  user: { userId: string; email: string; name: string | null } | null,
  locale: ServerLocale = DEFAULT_LOCALE
): Context => {
  // ponytail: enforcement is live, so the harness plays the browser. One token
  // per context, echoed in the request header exactly as the client does it —
  // the header must match `csrfToken` (the "cookie") or every mutation 403s.
  const csrfToken = generateCsrfToken();

  return {
    req: { headers: { [CSRF_HEADER]: csrfToken }, protocol: 'http' } as any,
    res: {
      headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
    } as any,
    user: user
      ? {
          ...user,
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
        }
      : null,
    token: null,
    db: prisma,
    locale,
    csrfToken,
  };
};

export const createCaller = (user: { userId: string; email: string; name: string | null } | null) =>
  appRouter.createCaller(createTestContext(user));

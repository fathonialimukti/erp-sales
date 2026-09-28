import { createTRPCClient, httpBatchLink, retryLink } from '@trpc/client';
import type { appRouter } from '../../../server/src/router';

// Defaults to localhost for local/dev. VITE_TRPC_URL is the production override
// (base URL; /trpc is appended by the link below). Falls back to
// VITE_API_BASE_URL when the client is served behind a proxy (e.g. Nginx Proxy
// Manager) so browsers call the server's public URL instead of their own localhost.
const trpcBaseUrl =
  import.meta.env.VITE_TRPC_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:10022';

export type AppRouter = typeof appRouter;
export type AppRouterType = AppRouter;

// ponytail: double-submit CSRF. The `csrf_token` cookie is httpOnly and this app
// is a different origin from the API, so no browser JS can read it — the server
// hands the value out in the body of `auth.csrfToken` and we echo it back in
// CSRF_HEADER, on mutations only.
//
// httpBatchLink keeps a separate loader per op type, so a GET batch is always
// all-queries and a POST batch always all-mutations. Two things fall out: query
// batches stay token-free (and skip the CORS preflight a custom header would add
// to them), and a 403 on a POST batch means none of its mutations ran — the
// middleware throws before any resolver — so re-issuing it once cannot double-write.
const CSRF_HEADER = 'x-csrf-token';
// Re-read a minute before the server's stated expiry, so we never race its own
// check and never hand it a token it has already rejected.
const CSRF_REFRESH_SKEW_MS = 60_000;

let csrfToken: string | null = null;
let csrfExpiresAt = 0;

const csrfTokenIsFresh = () =>
  csrfToken !== null && csrfExpiresAt - Date.now() > CSRF_REFRESH_SKEW_MS;

const refreshCsrfToken = async () => {
  const fresh = await trpcClient.auth.csrfToken.query();
  csrfToken = fresh.csrfToken;
  csrfExpiresAt = fresh.csrfExpiresAt;
};

const rawClient = createTRPCClient<AppRouterType>({
  links: [
    retryLink({
      retry: ({ attempts, error }) => {
        if (attempts >= 3) return false;
        const status = error.data?.httpStatus;
        return !status || status >= 500;
      },
      retryDelayMs: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    }),
    httpBatchLink({
      url: `${trpcBaseUrl}/trpc/v1`,
      async fetch(url, options) {
        // tRPC types the custom `fetch` as `(input, init?)` — `init` is optional, so
        // every `options.` below is an optional-chain on purpose (TS18048 otherwise).
        // GET batch => queries only => nothing to gate.
        if (options?.method === 'GET') {
          return fetch(url, { ...options, credentials: 'include' });
        }

        const send = (token: string | null) => {
          const headers = new Headers(options?.headers);
          if (token) headers.set(CSRF_HEADER, token);
          return fetch(url, { ...options, headers, credentials: 'include' });
        };

        if (!csrfTokenIsFresh()) await refreshCsrfToken();

        const response = await send(csrfToken);
        // Re-minting an expired cookie is routine, so a stale echo must not
        // surface as an error. Re-send once — but only when the server's token
        // actually moved: same token means the 403 was a permission denial, and
        // re-running that batch could repeat a mutation that already committed.
        if (response.status !== 403) return response;
        const sent = csrfToken;
        await refreshCsrfToken();
        return csrfToken === sent ? response : send(csrfToken);
      },
    }),
  ],
});

export const trpcClient = rawClient;

// Re-export for use with React Query
export type TRPCClient = typeof trpcClient;

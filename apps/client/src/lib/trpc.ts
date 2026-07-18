import { createTRPCClient, httpBatchLink } from '@trpc/client';
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

const rawClient = createTRPCClient<AppRouterType>({
  links: [
    httpBatchLink({
      url: `${trpcBaseUrl}/trpc`,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'include' });
      },
    }),
  ],
});

export const trpcClient = rawClient;

// Re-export for use with React Query
export type TRPCClient = typeof trpcClient;

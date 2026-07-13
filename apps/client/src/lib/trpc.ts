import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { appRouter } from '../../../server/src/router';

const trpcBaseUrl = 'http://localhost:10022';

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

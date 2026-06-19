import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { appRouter } from '../../../server/src/router';

const trpcBaseUrl = 'http://localhost:2022';

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

/**
 * Proxy-wrapped client that preserves the tRPC client's dynamic
 * Proxy behaviour while adding legacy flat-namespace aliases for
 * `role` and `permission` (redirecting to `accessControl.*`).
 *
 * IMPORTANT: Never spread a tRPC client into `{ ...client }` — the
 * spread destroys the Proxy traps and makes ALL router namespaces
 * resolve to `undefined`.
 */
export const trpcClient: typeof rawClient & {
  role: typeof rawClient.accessControl.role;
  permission: typeof rawClient.accessControl.permission;
} = new Proxy(rawClient, {
  get(target, prop, receiver) {
    if (prop === 'role') return Reflect.get(target, 'accessControl').role;
    if (prop === 'permission') return Reflect.get(target, 'accessControl').permission;
    return Reflect.get(target, prop, receiver);
  },
}) as typeof rawClient & {
  role: typeof rawClient.accessControl.role;
  permission: typeof rawClient.accessControl.permission;
};

// Re-export for use with React Query
export type TRPCClient = typeof trpcClient;

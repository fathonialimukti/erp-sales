// Shared API base URL resolver. Same precedence as trpc.ts so non-tRPC
// endpoints (/api/ai/*, /uploads/*, PDF) work in every environment.
//
//   1. VITE_TRPC_URL  → primary override (already used by tRPC client)
//   2. VITE_API_BASE_URL → alternate name used behind proxies
//   3. 'http://localhost:10022' → local/dev fallback
//
// Both env vars are listed in turbo.json globalEnv and the devcontainer sets
// VITE_TRPC_URL to the public API host, so prod builds resolve correctly.
export const API_BASE_URL: string =
  import.meta.env.VITE_TRPC_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  'http://localhost:10022';

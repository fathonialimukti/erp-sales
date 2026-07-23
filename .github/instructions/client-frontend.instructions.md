---
description: "Use when writing React components, pages, hooks, or any file in apps/client/src/ (excluding locales). Covers tRPC client patterns, Tailwind + shadcn Aurora UI, auth/permission patterns, and page component conventions."
applyTo: "apps/client/src/**"
---

# Client-Side Conventions

## tRPC — CRITICAL

The client uses a **vanilla** `createTRPCClient` — **NOT** `createTRPCReact`. There are no `trpc.router.useQuery()` hooks.

All data fetching goes through raw `@tanstack/react-query`:

```ts
import { trpcClient } from '../../lib/trpc';

// Query
useQuery({ queryKey: ['resource', 'list', input], queryFn: () => trpcClient.resource.list.query(input) });

// Mutation
useMutation({ mutationFn: (data) => trpcClient.resource.create.mutate(data) });
```

- Import `trpcClient` and `AppRouterType` from `'../../lib/trpc'` (adjust relative depth)
- `credentials: 'include'` is already configured in the shared client — do not add it per-call
- The `warehouse` namespace is **two levels deep**: `trpcClient.warehouse.warehouse.list.query()`

## CSS & UI — CRITICAL

- **Stack: Tailwind CSS v4 + shadcn/ui (new-york, Aurora-themed).** No HeroUI. No CSS-in-JS.
- Prefer shadcn primitives from `apps/client/src/components/ui/*` and domain components under `apps/client/src/components/*` for **new** code.
- `apps/client/src/ui/*` is a **legacy compatibility layer** (thin adapters over shadcn + Tailwind). Prefer `@/components/ui` for new work; existing pages may keep importing from `ui/` until page rewrites.
- Use `cn()` from `@/lib/utils`. Theme tokens live in `apps/client/src/index.css` (`bg-primary`, `text-destructive`, `bg-success`, module accents, etc.).
- Colocate only when needed; avoid new plain-CSS kit files. Some mid-migration page/component `.css` files remain until Phase 6 purge.
- Icons: Lucide for chrome; custom SVGs for nav modules. No emoji as UI icons.
- Design skills (when needed): `ui-ux-pro-max`, `frontend-design`, `web-design-guidelines`, `modern-css`, `css-first`, `accessibility` under `.agents/skills/`

## Auth & Permissions

```ts
import { hasPermissionAtom } from '../../lib/atoms';

const hasPermission = useAtomValue(hasPermissionAtom);
const canCreate = hasPermission('warehouse@create');
```

- Permission format is always `resource@action` (e.g. `warehouse@read`, `user@delete`)
- Gate UI elements with `canCreate`, `canUpdate`, `canDelete` derived from `hasPermission`
- `ProtectedRoute` returns `null` until `authBootstrapReadyAtom` is true — never assume auth is ready

## Component Conventions

- Functional components only — type props with `interface ComponentProps {}`, never `React.FC`
- Default export for standalone pages; named export for reusable components and form pages
- All user-visible strings via `intl.formatMessage({ id: '...', defaultMessage: '...' })`

## Page Patterns

**Index page**: `useAtomValue(hasPermissionAtom)` → canCreate/canUpdate/canDelete; `useQuery` list; 300ms debounced search; TanStack Table / `DataTable`; delete modal state; shadcn or legacy `ui/` adapters.

**Form page** — split into outer + inner:
- *Outer* (`{Domain}FormPage`): `useParams` → `isEdit`; queries for detail + dependencies; guard renders (loading, not-found, edit-blocked); passes `initialValues` to inner
- *Inner* (`{Domain}Form`): `ModalStage` state machine; `useMutation` for create/update; `useForm` from `@tanstack/react-form` with Zod `safeParse`; `intentRef` for approval intent

## Import Paths

```ts
import { trpcClient } from '../../lib/trpc';       // adjust depth
import { hasPermissionAtom } from '../../lib/atoms';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
// legacy mid-migration only:
import { Button as LegacyButton } from '../../ui/Button';
```

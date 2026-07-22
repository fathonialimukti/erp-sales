---
description: "Use when writing React components, pages, hooks, or any file in apps/client/src/ (excluding locales). Covers tRPC client patterns, plain CSS + local UI kit rules, auth/permission patterns, and page component conventions."
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

- **No HeroUI. No Tailwind. No CSS-in-JS.**
- Use design tokens from `apps/client/src/styles/tokens.css` via CSS variables
- Prefer primitives from `apps/client/src/ui/` (`Button`, `Card`, `Input`, `Modal`, `Table`, `Select`, `Spinner`, …)
- Colocate styles as `ComponentName.css` next to the component; import the CSS file from the TSX
- Semantic class names (`btn`, `btn--primary`, `card`) — not utility-class soup
- Global layout/page styles live under `apps/client/src/styles/`
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
- Icons: `<Icon icon="solar:..." />` from `@iconify/react` (or local `ui/Icon`) — no emoji icons
- All user-visible strings via `intl.formatMessage({ id: '...', defaultMessage: '...' })`

## Page Patterns

**Index page**: `useAtomValue(hasPermissionAtom)` → canCreate/canUpdate/canDelete; `useQuery` list; 300ms debounced search; TanStack Table; delete modal state; UI from `apps/client/src/ui/`.

**Form page** — split into outer + inner:
- *Outer* (`{Domain}FormPage`): `useParams` → `isEdit`; queries for detail + dependencies; guard renders (loading, not-found, edit-blocked); passes `initialValues` to inner
- *Inner* (`{Domain}Form`): `ModalStage` state machine; `useMutation` for create/update; `useForm` from `@tanstack/react-form` with Zod `safeParse`; `intentRef` for approval intent

## Import Paths

```ts
import { trpcClient } from '../../lib/trpc';       // adjust depth
import { hasPermissionAtom } from '../../lib/atoms';
import { useIntl } from 'react-intl';
import { Icon } from '@iconify/react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
```

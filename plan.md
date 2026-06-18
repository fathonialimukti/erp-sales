# ERP App Remodel — Full Plan (post-foundation)

> Status: foundation done (HeroUI removed, design tokens, `ui/` primitives, shell, Dashboard, Sales Order sample feature shipped).
> Next: remodel every remaining CRUD feature to the new visual + interaction standard.

---

## 1. Visual / UX system (already established)

- **Style**: enterprise professional, minimalist, 60-30-10 color rule.
- **Palette**: 60% neutral surface (`--color-surface-0..3`, slate-50/100/200), 30% slate chrome (`--color-slate-50..950`), 10% emerald accent (`--color-accent-500 #10b981`).
- **Typography**: Inter (UI) + JetBrains Mono (numbers/IDs).
- **Effects**: subtle borders, layered shadows (`shadow-sm` for cards, `shadow-md` for popovers), 200ms transitions.
- **No emoji icons** — `@iconify/react` (`solar:*` set, `mdi:*` for domain).
- **No `className` on HeroUI components** (HeroUI already removed).
- **Every page wrapper** carries `data-ai-context={JSON.stringify({ section, ... })}`.

## 2. Component conventions (locked)

### `ui/` primitives (already shipped)

`Button`, `Card` (+ `CardHeader/Body/Title/Description`), `Input`, `Textarea`, `Select` (+ `SelectItem`), `SelectSearch`, `FormDatePicker`, `Checkbox`, `Chip`, `Modal` (+ `ModalContent/Header/Body/Footer`), `Dropdown` (+ `DropdownTrigger/Menu/Item/Separator`), `Pagination`, `Spinner`, `Skeleton`, `EmptyState`, `Toast` + `useToast`, `Avatar`, `Table` (+ `TableHead/Header/Body/Row/Cell`), `Tooltip`, `Separator`, `Label`, `FieldError`, `FormField`, `ListBox`, `cn`.

### `components/` (already shipped)

`Navbar`, `Sidebar`, `PageHeader`, `SelectSearch`, `FormDatePicker`, `ImageUploadField`, `ApprovalHistory`, `EntityPhoto`, `ProtectedRoute`, `AiAssistant`.

### Page templates (locked)

**Index page**: search + table + pagination + delete modal + empty state.

**Detail page**: `<PageHeader>` + sections (info, related, approval history) + action bar.

**Form page**: outer loader + inner form + modal state machine (`'idle' | 'confirm-draft' | 'confirm-propose' | 'loading' | 'success' | 'error'`) + i18n.

### Sales Order Form reactivity lesson (locked)

TanStack Form's `form.state.values` reads **do not subscribe**. Use:

```tsx
<form.Subscribe selector={(s) => s.values.items ?? []}>
  {(items) => /* render with re-render on change */}
</form.Subscribe>
```

Handlers read fresh state via `form.state.values` at click time, not from a stale closure.

### CSS strategy

- Default: Tailwind utilities (matching `ui/` + tokens).
- Sales Order Form: plain CSS file `SalesOrderFormPage.css` (per-page, BEM `.so-*`) — only because of complex grid + popover positioning. No other page needs this.

## 3. i18n convention (locked)

- `en.json` + `id.json` in `apps/client/src/locales/`.
- Keys: `<domain>.<page>.<key>` (e.g. `customer.form.title_create`).
- Both locale files must be updated in the same commit.

## 4. Remodel sequence (13 domains, ordered by dependency)

| # | Domain | Depends on | Pages |
|---|--------|-----------|-------|
| 1 | Region | — | Index, Detail, Form |
| 2 | Area | Region | Index, Detail, Form |
| 3 | Customer | Area | Index, Detail, Form (with contacts sub-list) |
| 4 | Outlet | Customer, Area | Index, Detail, Form |
| 5 | SKU Category | — | Index, Detail, Form |
| 6 | SKU | SKU Category | Index, Detail, Form |
| 7 | Invoice | Sales Order, Customer | Index, Detail, Form |
| 8 | Visit Log | Customer, Outlet | Index, Detail, Form |
| 9 | Action Program | — | Index, Detail, Form (with photo upload, approval) |
| 10 | Event Proposal | Action Program, Customer | Index, Detail, Form (multi-step, approval) |
| 11 | Users | — | Index, Detail, Form |
| 12 | Roles | — | Index, Form |
| 13 | Notifications + Activity Logs | — | Index |

## 5. Per-domain remodel checklist

1. Read the existing `IndexPage/DetailPage/FormPage` to inventory what's there.
2. Schema: confirm `packages/schemas/src/<domain>.ts` has `*FormSchema` + `update*Schema` with `currentId`.
3. Server: confirm `apps/server/src/routers/<domain>.ts` has `list/get/create/update/delete` with `hasPermission` middleware.
4. Index page: rebuild to template.
5. Detail page: rebuild to template.
6. Form page: rebuild to template.
7. i18n: add `<domain>.*` keys to both `en.json` + `id.json`.
8. Sidebar: confirm permission string is set.
9. Smoke: navigate, list, search, paginate, create, edit, delete, permission gating.

## 6. Cross-cutting polish (after domains)

- Sidebar nav restructure (group: Master Data / Sales / Operations / Admin).
- Landing page redesign.
- Login page refresh.
- Notifications bell in Navbar (badge count).
- Activity log filters (date range, resource, action).
- Global search (Cmd+K) → tRPC `search.global` endpoint.

## 7. Verification (final gate)

- `bun run check-types` — zero errors.
- `bun run lint` — zero warnings.
- Playwright smoke test per page.
- `bun run build` — clean.
- Visual QA: light + dark, 375/768/1024/1440.

## 8. Open risks / watch-outs

- **Sales Order Form reactivity**: keep `<form.Subscribe>` pattern. Do NOT revert to `form.getFieldValue()`.
- **Dropdown clipping**: any future form using `SelectSearch` inside a card must have `overflow: visible` on the card root.
- **Trash icon**: use the symmetric 5-stroke SVG (lid line + body path + 2 vertical handles + top opening line).
- **Grid alignment**: for item rows, use `align-items: end` on grid, `display: flex; flex-direction: column` on each cell.
- **tRPC list limits**: never exceed 100 on list queries.
- **CSS leakage**: Sales Order Form CSS is `SalesOrderFormPage.css` only — do not move it to global.
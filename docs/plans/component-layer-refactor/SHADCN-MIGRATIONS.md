# Domain → shadcn migration map

**Date:** 2026-07-24  
**Authority:** `docs/design-system/aurora-commerce-design-law.md`  
**Rule:** compose `@/components/ui/*`; keep domain API only when product-specific.

## Already installed (no CLI needed)

| shadcn | Path |
|--------|------|
| empty | `ui/empty.tsx` |
| combobox | `ui/combobox.tsx` (Base UI — use `render`, not only `asChild`) |
| select | `ui/select.tsx` |
| command | `ui/command.tsx` |
| input-group | `ui/input-group.tsx` |
| pagination | `ui/pagination.tsx` |
| popover, dialog, sheet, drawer | present |
| badge, button, card, spinner, skeleton | present |

## Install if implementing DatePicker / form Field law

```bash
cd apps/client
bunx --bun shadcn@latest add calendar
# optional form recipe:
bunx --bun shadcn@latest add field
```

`react-day-picker` and `cmdk` are already dependencies; Calendar UI surface is still missing.

---

## Ranked candidates

### P0 — high value, already have primitives

| Domain file | Today | Target | Notes |
|-------------|-------|--------|-------|
| **`Select.tsx`** | Hand-rolled `<details>` + search + hue avatars | **Delete** or rewrite on **`ui/combobox`** (search) / **`ui/select`** (closed list) | Barrel-only export; **zero page callers**. Easiest win: **delete file + barrel**. |
| **`EmptyState.tsx`** | Custom Card + dashed border | Compose **`ui/empty`** (`Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`) | Keep domain props (`module`, `action`) as thin wrapper. |
| **`Pagination.tsx`** | Custom nav + two Buttons | Compose **`ui/pagination`** (`Pagination`, `PaginationContent`, `PaginationItem`, `PaginationPrevious`, `PaginationNext`, optional page links) | Keep 1-based `page` / `onChange` domain API for index pages. |
| **`FilterBar.tsx`** | Manual absolute Search icon + raw `Input` | **`InputGroup` + `InputGroupAddon` + `InputGroupInput`** | Skill law: never raw `Input` inside input-group. |
| **`SearchPalette.tsx`** | Custom Dialog + hand-rolled list/keyboard | **`Command` + `CommandDialog` + `CommandInput` + `CommandList` / `CommandItem` / `CommandGroup` / `CommandEmpty`** | Keep tRPC + nav permission logic; replace chrome only. |

### P1 — install Calendar; real product use

| Domain file | Today | Target | Notes |
|-------------|-------|--------|-------|
| **`DatePicker.tsx`** | Full custom calendar UI | **`ui/calendar` + `ui/popover` + `ui/button`** | Used by sales-order index/form. Modes: date / datetime / daterange — may need phased: start with **date**, then range. |
| **`FormDatePicker.tsx`** | `DayPicker` + `<details>` | Same Calendar + Popover | Already depends on `react-day-picker`; align surface with shadcn Calendar. |

### P1 — async search select (keep domain API)

| Domain file | Today | Target | Notes |
|-------------|-------|--------|-------|
| **`SelectSearch.tsx`** | Hand-rolled dropdown + tanstack query | **`ui/combobox`** + existing query/debounce | Keep `sourceData` / `queryKeyBase` API for SalesOrderForm. Drop local hue avatars / duplicate `initialOf` → `@/lib/initials`. **Base UI Combobox** API caveat. |

### P2 — optional polish (already mostly shadcn)

| Domain file | Today | Opportunity |
|-------------|-------|-------------|
| **`ConfirmDialog`** | Already `ui/dialog` + `ui/button` | Optional: **`ui/alert-dialog`** for confirm pattern |
| **`NotificationDrawer`** | Already Sheet + Tabs + ScrollArea | Tint map still uses raw sky/amber/emerald — map to **semantic** tokens only |
| **`StatusChip` / `KpiCard` / `PageHeader` / `DataTable`** | Domain recipes on Badge/Card/Table | **Keep** — product API, not adapters |
| **`ImageUploadField`** | Domain file read + EntityPhoto | No shadcn upload primitive; keep |
| **`useToast`** | Sonner thin API | Already correct |

### Do not migrate away

| Component | Why keep domain |
|-----------|-----------------|
| `PageHeader`, `FilterBar` (recipe), `DataTable`, `KpiCard`, `StatusChip`, `NavModuleTile`, `EntityPhoto`, shell chrome | Design-law signatures / product recipes |
| Module accent plates | Not in shadcn |

---

## Recommended waves

### Wave A — quick wins (no install)

1. Delete dead `Select.tsx` (+ barrel)  
2. `EmptyState` → compose `ui/empty` (keep `module` / `action`)  
3. `Pagination` → compose `ui/pagination` (keep page API)  
4. `FilterBar` search → `InputGroup*`  
5. Typecheck  

### Wave B — Calendar (install `calendar`)

1. `bunx --bun shadcn@latest add calendar`  
2. Rewrite `FormDatePicker` on Calendar + Popover  
3. Rewrite `DatePicker` date mode first; defer datetime/range if heavy  
4. Wire sales-order call sites if API stays stable  

### Wave C — Combobox (no install; careful Base UI)

1. Rewrite `SelectSearch` shell on `ui/combobox`  
2. Preserve async `sourceData` contract  
3. SalesOrderForm smoke  

### Wave D — Command palette

1. Rewrite `SearchPalette` list UI on `CommandDialog` / `Command*`  
2. Keep nav + remote result sources  
3. Optional: scrub non-semantic tint classes  

### Wave E — optional

1. `bunx --bun shadcn@latest add field` for form pages later  
2. ConfirmDialog → AlertDialog  

---

## API caveats

1. **Combobox = Base UI** (`@base-ui/react`) — prefer `render` prop patterns from installed `combobox.tsx`.  
2. **Select / Popover / Dialog = Radix-style** — `asChild`.  
3. Do not collide names: domain `Pagination` vs `ui/pagination` imports.  
4. Never edit primitive tokens for brand; compose only.  
5. Design law: no success CTA, no module colors on table cells, semantic status chips only.

---

## Success criteria

- Fewer hand-rolled overlays / selects / calendars  
- Domain wrappers only where ERP API or module accent needs them  
- `bun run check-types` green  
- No second design system  

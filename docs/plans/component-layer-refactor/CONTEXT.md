# Component Layer Refactor — Context Pack

**Status:** Active — Wave dead-delete + B + C + D approved  
**Date:** 2026-07-24  
**Scope:** Domain → shadcn migrations under `apps/client/src/components/*`  
**ui/* rule:** may **add** missing shadcn via CLI (`calendar`, etc.); do not restyle unrelated primitives  
**Authority:** `docs/design-system/aurora-commerce-design-law.md`  
**Owner when implementing:** Frontend Engineer only  
**Tokens / motion:** `apps/client/src/index.css` · `apps/client/src/lib/motion.ts`

```
Design law (FROZEN): docs/design-system/aurora-commerce-design-law.md
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: Frontend Engineer + ui-ux-pro-max
```

---

## Problem

Mid-migration from vanilla CSS / legacy API to Tailwind + shadcn Aurora left a **dual component layer**:

1. **shadcn primitives** — `@/components/ui/*` (frozen / do not restyle here)
2. **Domain + legacy adapters** — root of `@/components/*` + barrel `index.ts`

Pages already prefer primitives for controls (`Button`, `Input`, `DropdownMenu`, `Card` from `ui/*`).  
Domain recipes (`PageHeader`, `FilterBar`, `DataTable`, …) are real product API.  
Legacy adapters (`Button`, `Avatar`, `Card`, `Chip`, `Modal`, …) are thin renames, dead, or partially used — they fight the design law’s “prefer ui/* + domain” rule.

---

## Inventory (verified)

### A. Domain components — **KEEP** (product API)

Align with design law §5. Polish only if law violated.

| Component | Role | Law surface |
|-----------|------|-------------|
| `PageHeader` | Title + module accent bar / eyebrow | §4 index/detail |
| `FilterBar` | Search + filters + count | §4 index |
| `DataTable` | TanStack table shell (loading/empty/error) | §5 tables |
| `KpiCard` | KPI plate + optional module wash | §3 numbers, module plates |
| `StatusChip` | Approval status icon + label | §2 chip map |
| `EmptyState` | Dashed empty panel | §5 empty |
| `ConfirmDialog` | Destructive / confirm modal | §4 index |
| `NavModuleTile` | Sidebar module wayfinding | §2 module spectrum |
| `EntityPhoto` | Entity image / camera fallback | detail heroes |
| `ApprovalHistory` / `ApprovalTimeline` | Workflow history | detail |
| `SelectSearch` | Async remote select (orders etc.) | forms |
| `Pagination` | List paging | index |
| `useToast` | Sonner thin API | feedback |
| `ImageUploadField` | Upload UX | forms |
| Shell: `Sidebar`, `Topbar`, `UserAvatarMenu`, `UserMenuPopover`, `SearchPalette`, `NotificationDrawer`, `AiAssistant/*`, `reports/*`, `motion/*` | Chrome / modules | §4 shell |

### B. Legacy adapters — **SHRINK / DELETE / ADOPT**

Barrel note in `components/index.ts`: *“prefer @/components/ui + domain components for new code.”*

| File | Live page usage | Verdict |
|------|-----------------|---------|
| `Avatar.tsx` | **None** (menus use `ui/avatar`) | **DELETE** (user decided). Shared `initialsOf` → `apps/client/src/lib/initials.ts` |
| `Button.tsx` | `LandingPage`, `Pagination` only | Map to `ui/button`; drop `success` CTA |
| `Card.tsx` | Barrel only? (pages use `ui/card`) | Delete after grep clean |
| `Chip.tsx` | Prefer `StatusChip` / `ui/badge` | Keep only if non-status tags need tones; else delete |
| `Input.tsx` | Prefer `ui/input` + `ui/input-group` | Delete after `FilterBar`-style patterns; no second Input |
| `Modal.tsx` | Prefer `ConfirmDialog` / `ui/dialog` | Delete or keep only if non-confirm dialogs still depend |
| `Label` / `Textarea` / `Skeleton` / `Spinner` / `Tooltip` / `Checkbox` / `Table` | Prefer `ui/*` | Delete after import clean |
| `Dropdown*` | Prefer `ui/dropdown-menu` | Delete after import clean |
| `FormField` / `FieldError` | Domain form helper | Keep if still used; align with labels law |
| `Select.tsx` | Hand-rolled (not shadcn) | **Decision:** rewrite on `ui/select` or `ui/combobox` **later**; not in wave 1 |
| `Icon.tsx` | Legacy iconify bridge | Delete if no callers |
| `Toast.tsx` | Legacy type re-export | Fold into `useToast` only |

### C. Design-law gaps found in **our** code (fix targets)

| Finding | Law | Action |
|---------|-----|--------|
| `Button` `variant="success"` → green CTA | Ban #2 mint/module as CTA | Remove success primary path |
| `StatusChip` DRAFT uses `bg-slate-100 text-slate-700` | Prefer semantic muted | Use `bg-muted text-muted-foreground` |
| `EmptyState` uses `space-y-1` | Prefer `flex flex-col gap-*` (project shadcn rules) | `gap-1` |
| `Avatar` unused; menus reimplement initials | Prefer one domain Avatar | Shared `initialsOf` + adopt or delete |
| `Pagination` depends on legacy `Button` | Prefer `ui/button` | Rewire |
| Adapter barrel still exports dead API | Prefer ui + domain | Thin barrel to domain-only |
| Dual import styles (`@/components/ui/*` vs `../../components/*`) | Consistency | Domain via `@/components/...` paths |

---

## Target architecture (frozen)

```txt
apps/client/src/components/
├── ui/*                 # shadcn — DO NOT TOUCH in this plan
├── <Domain>.tsx         # product recipes only (list below)
├── shell / reports / motion / AiAssistant
└── index.ts             # domain-only barrel (optional; or kill barrel)
```

**Rule for new page code**

| Need | Import |
|------|--------|
| Primitive control | `@/components/ui/*` |
| Page chrome recipe | Domain component (`PageHeader`, …) |
| Never | Hand-written hex, second Button API, module color on table cells |

---

## Non-goals

- No redesign of shadcn `ui/*` tokens/variants
- No full page redesign wave (only import fixes when deleting adapters)
- No rewrite of `Select` / `SelectSearch` in wave 1 (separate plan if needed)
- No git commit/push by agents
- No inventing a second design system

---

## Success criteria

1. Domain components obey design law (chips, KPI plates, headers, empty).
2. Dead adapters removed or single-purpose (Avatar if adopted).
3. Pages do not import legacy `Button`/`Card`/`Modal` renames.
4. `bun run check-types` green for client.
5. No change to `components/ui/*` files.

---

## Reference pages (patterns already correct)

- Index recipe: `apps/client/src/pages/region/RegionIndexPage.tsx`
- Domain header/filter/table: `PageHeader` · `FilterBar` · `DataTable` · `EmptyState` · `ConfirmDialog`
- Primitives: `@/components/ui/button`, `dropdown-menu`, etc.

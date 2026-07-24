# Component Layer Refactor — Implementation Plan

> **For agentic workers:** Frontend Engineer executes task-by-task. Full-Stack orchestrates only. **Never edit** `apps/client/src/components/ui/*`. Steps use checkbox syntax.

**Goal:** Align custom domain components with Aurora design law and delete/adopt legacy adapters without touching shadcn primitives.

**Architecture:** Keep product recipes (`PageHeader`, `FilterBar`, `DataTable`, `StatusChip`, …). Thin or remove rename-only adapters. Pages import `ui/*` for primitives and domain files for recipes.

**Tech stack:** React 19 · Tailwind v4 · shadcn Aurora · Lucide · `cn()` · react-intl · Motion presets only if needed.

**Context pack:** `docs/plans/component-layer-refactor/CONTEXT.md`  
**Design law:** `docs/design-system/aurora-commerce-design-law.md`

## Global constraints

- **Do not** edit `apps/client/src/components/ui/**`
- Semantic tokens only (`bg-primary`, `text-muted-foreground`, …) — no new hex
- One primary CTA per region; no success-colored primary buttons
- Status = icon + label via `StatusChip` map
- Module accents only on allowed plates (header/nav/KPI/empty)
- Prefer `flex` + `gap-*` over `space-y-*` / `space-x-*`
- Git: manual only — agent recommends commit, never writes git
- Verify: `bun run check-types` (and scoped vitest if present)

---

## Recommended approach (locked)

**Phased prune + law polish (recommended)**

1. Polish **live domain** components against design law  
2. Fix **still-used** adapters that block deletion (`Pagination`, optionally `Avatar`)  
3. Delete **dead** adapters after import greps go zero  
4. Thin `index.ts` barrel to domain-only  
5. Typecheck

**Rejected alternatives**

| Approach | Why not |
|----------|---------|
| Big-bang rewrite all pages to only `ui/*` | High churn; domain recipes already correct |
| Restyle shadcn in `ui/*` | Explicitly out of scope |
| Keep all adapters forever “for compat” | Dead code + dual APIs fight law |

---

## Wave 0 — Preflight greps (no code)

- [ ] Confirm zero consumers for candidate deletes:

```bash
# from repo root
rg -n "from ['\"].*components/(Button|Avatar|Card|Chip|Input|Modal|Label|Textarea|Skeleton|Spinner|Tooltip|Checkbox|Table|Dropdown|Icon|Toast)['\"]" apps/client/src --glob '!**/*.test.*'
rg -n "from ['\"]@/components['\"]" apps/client/src
```

- [ ] List any remaining hits in `LandingPage`, `Pagination`, menus, etc. (update CONTEXT if inventory drifts)

---

## Wave 1 — Domain law polish (KEEP set)

### Task 1.1 — `StatusChip` draft tone

**File:** `apps/client/src/components/StatusChip.tsx`

- [ ] Change DRAFT style from slate hard classes to semantic muted:

```tsx
// DRAFT.className
"border-transparent bg-muted text-muted-foreground"
```

- [ ] Keep PROPOSED / APPROVED / REJECTED as law §2 map (primary soft / success / destructive)
- [ ] Keep icon + label always

**Verify:** visual draft chip on any index with status column; no slate utility left in STATUS_STYLES

### Task 1.2 — `EmptyState` layout tokens

**File:** `apps/client/src/components/EmptyState.tsx`

- [ ] Replace inner `space-y-1` with `flex flex-col gap-1`
- [ ] Optional (only if product wants module empty tint later): accept optional `module?: ModuleKey` wash on icon plate using `moduleCssVar` + color-mix 14% — **defer unless needed**
- [ ] Do not rebuild as marketing empty

### Task 1.3 — Delete `Avatar` wrapper (user locked)

**Decision:** delete domain wrapper. Menus keep composing `ui/avatar` directly.

**Files:**
- delete `apps/client/src/components/Avatar.tsx`
- add `apps/client/src/lib/initials.ts` with shared `initialsOf`
- rewire `UserAvatarMenu.tsx`, `UserMenuPopover.tsx` to import `initialsOf` from `@/lib/initials`
- remove `Avatar` export from `components/index.ts`

```ts
// apps/client/src/lib/initials.ts
export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
```

- [ ] Create `lib/initials.ts`
- [ ] Replace local `initialsOf` in menus with `@/lib/initials`
- [ ] Delete `Avatar.tsx`
- [ ] Drop barrel export
- [ ] Grep for `components/Avatar` / `from "./Avatar"` must be zero

### Task 1.4 — Spot-check domain already law-aligned

No change unless diffs violate law:

| File | Expected |
|------|----------|
| `PageHeader.tsx` | module left bar + eyebrow; `font-heading text-2xl` |
| `KpiCard.tsx` | module plate wash 14%; tabular-nums value; success/destructive delta |
| `FilterBar.tsx` | `ui/input` + Lucide search |
| `DataTable.tsx` | crm density; no module row paints |
| `ConfirmDialog.tsx` | `ui/dialog` + `ui/button` |
| `NavModuleTile.tsx` | active wash only |

---

## Wave 2 — Break adapter dependency chains

### Task 2.1 — `Pagination` off legacy `Button`

**File:** `apps/client/src/components/Pagination.tsx`

- [ ] Import `Button` from `@/components/ui/button`
- [ ] Drop `leftIcon` / `rightIcon` API — compose Lucide children:

```tsx
import { Button } from "@/components/ui/button";

// ...
<Button type="button" variant="outline" size="sm" onClick={() => onChange(page - 1)} disabled={!canPrev}>
  <ChevronLeft data-icon="inline-start" />
  Prev
</Button>
```

- [ ] i18n: prefer `react-intl` for Prev/Next/Page of (both en + id) if hard-coded English remains

**Verify:** any index page pagination still works

### Task 2.2 — `LandingPage` off legacy `Button`

**File:** `apps/client/src/pages/LandingPage.tsx`

- [ ] `import { Button } from "@/components/ui/button"`
- [ ] Map old variants: `primary→default`, `danger→destructive`, drop `success` CTA
- [ ] Loading: compose `Loader2` + `disabled` (shadcn has no `isLoading`)

### Task 2.3 — Delete legacy `Button.tsx` (after 2.1–2.2 greps clean)

- [ ] Confirm no imports of `./Button` or `components/Button`
- [ ] Delete `apps/client/src/components/Button.tsx`
- [ ] Remove from barrel `index.ts`

---

## Wave 3 — Dead adapter deletion

For each file, grep must be zero (except self + barrel), then delete file + barrel export.

### Task 3.1 — Delete rename-only adapters

Candidates (confirm greps):

- [ ] `Card.tsx` (pages use `ui/card`)
- [ ] `Input.tsx` (use `ui/input` / `InputGroup` for icons)
- [ ] `Label.tsx`, `Textarea.tsx`, `Skeleton.tsx`, `Spinner.tsx`, `Tooltip.tsx`, `Checkbox.tsx`
- [ ] `Table.tsx` (raw table primitive alias)
- [ ] `Dropdown.tsx`, `DropdownMenu.tsx`, `DropdownTrigger.tsx` if unused (pages already use `ui/dropdown-menu`)
- [ ] `Modal.tsx` if no callers (prefer `ConfirmDialog` / `ui/dialog`)
- [ ] `Icon.tsx`, `Toast.tsx` if unused
- [ ] `Chip.tsx` if non-status tags unused — **if used**, keep as thin Badge tone map but ban success CTA misuse

### Task 3.2 — Thin barrel

**File:** `apps/client/src/components/index.ts`

- [ ] Export **domain only** (or delete barrel and force direct imports — prefer domain-only barrel for mid-migration):

```ts
// Domain recipes only — primitives live in @/components/ui/*
export { Avatar } from "./Avatar"; // if kept
export { ConfirmDialog } from "./ConfirmDialog";
export { DataTable } from "./DataTable";
export { EmptyState } from "./EmptyState";
export { FilterBar } from "./FilterBar";
export { KpiCard } from "./KpiCard";
export { PageHeader } from "./PageHeader";
export { Pagination } from "./Pagination";
export { StatusChip } from "./StatusChip";
// …other live domain exports only
export { useToast, ToastContainer } from "./useToast";
```

- [ ] Comment stays: prefer `ui/*` + domain for new code

### Task 3.3 — Import path hygiene (optional, same wave)

- [ ] Prefer `@/components/PageHeader` over relative `../../components/PageHeader` for new/touched files only (no repo-wide churn unless easy)

---

## Wave 4 — Deferred (not this plan)

| Item | Why deferred |
|------|----------------|
| `Select.tsx` rewrite on `ui/select` / `ui/combobox` | Large behavior surface |
| `SelectSearch.tsx` restyle only if law broken | Working product control |
| `FormField` → shadcn Field primitives | Needs form migration wave |
| Empty module tint on all EmptyStates | Product decision |
| Page-wide import codemod | Risk without payoff |

---

## Verification checklist

- [ ] `rg` shows no imports of deleted adapters
- [ ] `bun run check-types` passes
- [ ] Smoke: login shell, one index (`RegionIndexPage`), one detail, landing CTA, user avatar menu
- [ ] Code Reviewer: ponytail + design-law ban scan  
- [ ] No files under `components/ui/` modified

---

## Execution order (Frontend Engineer)

```txt
Wave 0 greps
→ Wave 1 (StatusChip, EmptyState, Avatar+menus)
→ Wave 2 (Pagination, LandingPage, delete Button)
→ Wave 3 (dead deletes + barrel)
→ typecheck + Reviewer
```

Parallelism: Wave 1 files independent; Wave 2.1 before Button delete; Wave 3 after greps clean.

---

## Definition of done

- Design law obeyed on domain chips/empty/avatar  
- Legacy `Button` gone; Pagination + Landing on `ui/button`  
- Dead adapters deleted; barrel not advertising dual API  
- `ui/*` untouched  
- Types green; Reviewer lean or minor-only  

---

## Next step after approval

User approves this plan → Full-Stack dispatches **Frontend Engineer** with frozen CONTEXT + this PLAN embedded (no design rediscovery).

### Task 2: Tailwind v4 class modernization (Frontend)

**Files (modify only — all in `apps/client/src/`):**
- `components/PageHeader.tsx` (lines 114, 203)
- `pages/Dashboard.tsx` (654, 740, 824)
- `components/Topbar.tsx` (176)
- `pages/RouteErrorPage.tsx` (66)
- `layouts/PrivateLayout.tsx` (47)
- `components/NavButtonGroup.tsx` (35, 36)
- `components/Sidebar.tsx` (261, 321)
- `layouts/PublicLayout.tsx` (200)
- `pages/email-crm/EmailCrmDetailPage.tsx` (396, 472, 537, 631, 658)
- `components/KpiCard.tsx` (56)
- `pages/visit-log/VisitLogDetailPage.tsx` (283, 363, 381)
- `pages/sales-order/SalesOrderDetailPage.tsx` (466, 604, 635, 695, 759, 771, 792)
- `components/ui/table.tsx` (73, 86)
- `pages/sales-order/SalesOrderPipeline.tsx` (114, 114, 127)
- `components/DataTable.tsx` (282, 283)
- `pages/sales-order/SalesOrderIndexPage.tsx` (484, 531)
- `pages/outlet/OutletDetailPage.tsx` (157, 216, 244)
- `pages/sku-category/SkuCategoryDetailPage.tsx` (234, 475, 507)
- `pages/sku/SkuDetailPage.tsx` (154)
- `pages/access-control/RoleDetailPage.tsx` (170, 215, 262)

**Problem:**
Tailwind v4 IntelliSense reports ~85 "can be written as" suggestions. Each is a behaviour-preserving shorthand. The Problems panel shows them as compileWarning entries.

**Rewrite rules (apply verbatim — do not improvise):**

| Old | New | Notes |
|-----|-----|-------|
| `w-[3px]` | `w-0.75` | spacing scale: 0.75 = 3px |
| `w-[9.5rem]` | `w-38` | 38 = 9.5rem (at 4px/base 16px) |
| `w-[160px]` | `w-40` | |
| `w-[140px]` | `w-35` | |
| `w-[290px]` | `w-72.5` | |
| `h-[280px]` | `h-70` | |
| `min-h-[280px]` | `min-h-70` | |
| `min-w-[22px]` | `min-w-5.5` | |
| `ml-[calc(0.75rem+17rem)]` | `ml-71` | |
| `ml-[calc(0.75rem+5rem)]` | `ml-23` | |
| `bg-primary/[0.06]` | `bg-primary/6` | opacity shorthand |
| `bg-primary/[0.04]` | `bg-primary/4` | |
| `bg-primary/[0.03]` | `bg-primary/3` | |
| `bg-primary/[0.025]` | `bg-primary/2.5` | |
| `hover:bg-primary/[0.06]` | `hover:bg-primary/6` | |
| `text-[var(--module-customer)]` | `text-module-customer` | token registered in index.css @theme inline |
| `text-[var(--module-outlet)]` | `text-module-outlet` | |
| `text-[var(--module-order)]` | `text-module-order` | |
| `text-[var(--module-visit)]` | `text-module-visit` | |
| `text-[var(--module-sku)]` | `text-module-sku` | |
| `text-[var(--module-user)]` | `text-module-user` | |
| `text-[var(--module-email)]` | `text-module-email` | |
| `text-[var(--module-ai)]` | `text-module-ai` | |
| `border-[var(--module-order)]` | `border-module-order` | applies to border-/bg- too |
| `[&_[data-slot=button]]:X` | `**:data-[slot=button]:X` | arbitrary child → named variant |
| `[&:has([role=checkbox])]:pr-0` | `has-[[role=checkbox]]:pr-0` | |
| `!text-[oklch(0.16_0.02_260)]` (in `:X` chain) | `text-[oklch(0.16_0.02_260)]!` | important-goes-last |
| `break-words` | `wrap-break-word` | renamed utility |

**Frozen contract:**
- **Behaviour-preserving only.** Each new class compiles to the same CSS as the old. No layout/visual change.
- ONLY touch the exact class strings above. Do not refactor surrounding className, do not extract to constants, do not "improve" nearby classes not in the suggestion list.
- Leave `bg-[color-mix(in_srgb,var(--module-order)_8%,transparent)]` untouched — there is no shorthand; IntelliSense did NOT flag it (only the `text-[var(--module-*)]` siblings were flagged).
- Leave any non-flagged classes alone.
- Module color tokens confirmed registered in `apps/client/src/index.css` `@theme inline` (lines ~52-65: `--color-module-order` etc.) and `:root`/`.dark` blocks (repo memory line 10-12).
- Repo memory line 14: "Lint enforces `text-module-x` over `text-[var(--module-x)]`" — these renames are expected.

**Verification:**
- `bun run check-types` (root) must stay clean.
- `bunx vitest run apps/client` — client tests should still pass (no behavior change).
- After edits, `get_errors` on each modified file should return zero Tailwind warnings.
- Spot-check 1-2 files in the browser (already-open pages: localhost:10021) to confirm no visual regression — ONLY if a class compiled differently; otherwise skip.

**Out of scope:**
- No `index.css` change. No Tailwind config change. No new tokens.
- No touching files not in the list above.
- No renames of non-flagged `var(--module-*)` classes that the linter didn't flag (e.g. the `color-mix` siblings).

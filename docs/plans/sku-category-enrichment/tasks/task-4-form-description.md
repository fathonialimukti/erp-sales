### Task 4: Frontend — add description field to SkuCategoryFormPage + fix route casing

**Files:**
- Modify: `apps/client/src/pages/sku-category/SkuCategoryFormPage.tsx`

**Consumes:**
- `createSkuCategorySchema` and `updateSkuCategorySchema` from `@repo/schemas/sku-category` — both already accept `description: z.string().optional()`.
- tRPC `trpcClient.skuCategory.create.mutate` / `.update.mutate` — pass `description` through.

**Frozen contract:**
- `FormValues` interface: add `description: string` (default `""`).
- `defaults()`: return `{ code: "", name: "", description: "" }`.
- Edit seeding `useEffect`: also `form.setFieldValue("description", data.description ?? "")`.
- Add a `FormSection` titled `sku_category.form.section_description` ("Description") containing a `<Textarea>` (`@/components/ui/textarea`) bound to `description`, id `sku-category-description`, label `sku_category.form.field_description`, placeholder `sku_category.form.field_description_placeholder`. Place this section AFTER the basic info section.
  - If `Textarea` is not yet imported, import from `@/components/ui/textarea` (shadcn component). If the file does not exist in `apps/client/src/components/ui/textarea.tsx`, FALL BACK to a styled `<textarea className="...border ..." />` matching the `Input` look — do NOT block on a missing shadcn component.
- Route casing: replace `navigate("/skuCategory")`, `navigate(\`/skuCategory/${id}\`)`, `onBack={() => navigate(isEdit && id ? \`/skuCategory/${id}\` : "/skuCategory")}` → all `/sku-category`.
- Mutation type for `createMutation`/`updateMutation`: `FormValues` now includes `description`, so `mutationFn: (d: FormValues) => trpcClient.skuCategory.create.mutate(d)` already carries it; no type change needed but ensure `runSave` passes the full `form.state.values` (it already does).
- i18n keys (provided by Task 6 — already present in `en.json`/`id.json` per the grep): `sku_category.form.section_description`, `sku_category.form.field_description`, `sku_category.form.field_description_placeholder`. Use `intl.formatMessage`.

**Steps:**
- [ ] Step 1: Fix `/skuCategory` → `/sku-category` literals (back nav + success redirects)
- [ ] Step 2: Extend `FormValues` + `defaults` + edit-seed `useEffect` with `description`
- [ ] Step 3: Add Description `FormSection` with `Textarea` (or fallback `<textarea>`)
- [ ] Step 4: `bun run check-types` from repo root
- [ ] Step 5: Self-review: create + update both carry description; edit mode seeds existing description

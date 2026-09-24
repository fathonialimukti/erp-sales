### Task 5: PageHeader Enhancement (Section Progress Dots)

**Files:**
- Modify: `apps/client/src/components/PageHeader.tsx`
- Test: `apps/client/src/tests/PageHeader.test.tsx` (create if not exists)

**Interfaces:**
- Consumes: Existing `PageHeaderProps` interface (read the file first)
- Produces: Enhanced `PageHeader` with `progress?: { current: number; total: number; label?: string }` prop

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/PageHeader.tsx` (current implementation)
- `apps/client/src/index.css` (design tokens)
- `apps/client/src/lib/motion.ts` (motion presets)
- `AGENTS.md` (conventions)

**Frozen contract:**
- Component: `PageHeader`
- New prop: `progress?: { current: number; total: number; label?: string }` — when provided, renders a section progress indicator below the description
- Visual: Small dots (one per section) with the current section highlighted in module color, completed sections in `bg-success/30`, upcoming in `bg-muted`. A small text label shows "Section X of Y" or a custom label.
- Dots are `size-2` circles, spaced `gap-1.5`
- The progress indicator animates in using `pageEnter` preset
- Only renders when `progress` is provided
- No new dependencies

**Steps:**
- [ ] Step 1: Read current PageHeader implementation
- [ ] Step 2: Add `progress?: { current: number; total: number; label?: string }` prop
- [ ] Step 3: Render progress dots below the description when `progress` is provided
- [ ] Step 4: Current dot uses module color, completed dots use `bg-success/30`, upcoming dots use `bg-muted`
- [ ] Step 5: Show "Section X of Y" text (or custom label) next to the dots
- [ ] Step 6: Animate entrance using `pageEnter` preset
- [ ] Step 7: Write tests for progress indicator (present/absent, current/completed/upcoming states)
- [ ] Step 8: Run `bun run check-types` to verify no type errors
- [ ] Step 9: Self-review — ensure no existing behavior is broken

**Preservation (mandatory):** additive changes only — do not delete or regress existing props, behavior, or visual design. The `progress` prop is optional and defaults to undefined (no change).

**Report back (mandatory):**
End every implementer report with a `## Produces` block listing exact export/type names, signatures, permission strings, and i18n keys it created.

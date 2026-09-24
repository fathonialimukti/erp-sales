### Task 1: FormSection Enhancement (Completed State)

**Files:**
- Modify: `apps/client/src/components/FormSection.tsx`
- Test: `apps/client/src/tests/FormSection.test.tsx` (create if not exists)

**Interfaces:**
- Consumes: Existing `FormSectionProps` interface
- Produces: Enhanced `FormSection` with `completed?: boolean` prop

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/FormSection.tsx` (current implementation)
- `apps/client/src/index.css` (design tokens)
- `apps/client/src/lib/motion.ts` (motion presets)
- `AGENTS.md` (conventions)

**Frozen contract:**
- Component: `FormSection`
- New prop: `completed?: boolean` — when `true`, shows success state (green checkmark badge on icon plate, subtle success ring on card)
- Motion: Use existing `pageEnter` preset from `@/lib/motion` for the checkmark entrance
- Colors: Use `text-success`, `bg-success/15`, `border-success/30` semantic tokens (already defined in index.css)
- No new dependencies

**Steps:**
- [ ] Step 1: Read current FormSection implementation
- [ ] Step 2: Add `completed?: boolean` prop to `FormSectionProps`
- [ ] Step 3: When `completed` is true:
  - Add a green checkmark badge (CheckCircle2 icon) overlapping the icon plate (top-right)
  - Add subtle success ring to the card (`ring-success/30`)
  - The checkmark should animate in using `pageEnter` preset
- [ ] Step 4: When `completed` is false or undefined, render exactly as before (no visual change)
- [ ] Step 5: Write tests for both states
- [ ] Step 6: Run `bun run check-types` to verify no type errors
- [ ] Step 7: Self-review — ensure no existing behavior is broken

**Preservation (mandatory):** additive changes only — do not delete or regress existing props, behavior, or visual design. The `completed` prop is optional and defaults to `false` (no change).

**Report back (mandatory):**
End every implementer report with a `## Produces` block listing exact export/type names, signatures, permission strings, and i18n keys it created.

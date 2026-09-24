### Task 4: FormField Enhancement (Positive Field Feedback)

**Files:**
- Modify: `apps/client/src/components/FormField.tsx`
- Test: `apps/client/src/tests/FormField.test.tsx` (append to existing)

**Interfaces:**
- Consumes: `FormFieldProps` from T3 (now includes `hint?: string`)
- Produces: Enhanced `FormField` with `showValid?: boolean` prop

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/FormField.tsx` (current implementation after T3)
- `apps/client/src/index.css` (design tokens)
- `AGENTS.md` (conventions)

**Frozen contract:**
- Component: `FormField`
- New prop: `showValid?: boolean` — when `true` and no error, show a small green check icon to the right of the field label
- The check uses `CheckCircle2` from lucide-react, `text-success`, `size-3.5`
- Animated entrance using `pageEnter` preset from `@/lib/motion`
- Only shows when `showValid === true` AND there is no error (errors take precedence)
- No new dependencies

**Steps:**
- [ ] Step 1: Read current FormField implementation (after T3 changes)
- [ ] Step 2: Add `showValid?: boolean` prop to `FormFieldProps`
- [ ] Step 3: When `showValid` is true and no error, render a `CheckCircle2` icon next to the label with `text-success`
- [ ] Step 4: Animate the checkmark entrance using `pageEnter` preset
- [ ] Step 5: When error is present, the checkmark must NOT render (error takes precedence)
- [ ] Step 6: Append tests for the new behavior
- [ ] Step 7: Run `bun run check-types` to verify no type errors
- [ ] Step 8: Self-review — ensure no existing behavior is broken

**Preservation (mandatory):** additive changes only — do not delete or regress existing props, behavior, or visual design. The `showValid` prop is optional and defaults to false (no change).

**Report back (mandatory):**
End every implementer report with a `## Produces` block listing exact export/type names, signatures, permission strings, and i18n keys it created.

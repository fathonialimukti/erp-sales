### Task 3: FormField Enhancement (Contextual Hint Prop)

**Files:**
- Modify: `apps/client/src/components/FormField.tsx`
- Test: `apps/client/src/tests/FormField.test.tsx` (create if not exists)

**Interfaces:**
- Consumes: Existing `FormFieldProps` interface (or whatever the current props type is — read the file first)
- Produces: Enhanced `FormField` with `hint?: string` prop

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/FormField.tsx` (current implementation)
- `apps/client/src/index.css` (design tokens)
- `AGENTS.md` (conventions)

**Frozen contract:**
- Component: `FormField`
- New prop: `hint?: string` — persistent helper text shown below the input/children, above any error message
- Visual: `text-xs text-muted-foreground` (existing token, not gray — it's deepened Azure)
- The hint is always visible (not hidden behind a tooltip)
- No animation needed for the hint itself (static text)
- No new dependencies

**Steps:**
- [ ] Step 1: Read current FormField implementation
- [ ] Step 2: Add `hint?: string` prop to the props interface
- [ ] Step 3: Render the hint below the children, above any error message, using `text-xs text-muted-foreground`
- [ ] Step 4: Ensure the hint does not affect layout when not provided (no margin/padding when absent)
- [ ] Step 5: Write tests for hint rendering (present and absent)
- [ ] Step 6: Run `bun run check-types` to verify no type errors
- [ ] Step 7: Self-review — ensure no existing behavior is broken

**Preservation (mandatory):** additive changes only — do not delete or regress existing props, behavior, or visual design. The `hint` prop is optional and defaults to undefined (no change).

**Report back (mandatory):**
End every implementer report with a `## Produces` block listing exact export/type names, signatures, permission strings, and i18n keys it created.

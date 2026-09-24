### Task 6: FormLayout Enhancement (Smart Layout Modes)

**Files:**
- Modify: `apps/client/src/components/FormLayout.tsx`
- Test: `apps/client/src/tests/FormLayout.test.tsx` (create if not exists)

**Interfaces:**
- Consumes: Existing `FormLayoutProps` interface
- Produces: Enhanced `FormLayout` with `mode?: 'auto' | 'simple' | 'standard' | 'complex'` prop

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/FormLayout.tsx` (current implementation)
- `apps/client/src/index.css` (design tokens)
- `AGENTS.md` (conventions)

**Frozen contract:**
- Component: `FormLayout`
- New prop: `mode?: 'auto' | 'simple' | 'standard' | 'complex'` — controls layout behavior
- Behavior:
  - `'auto'` (default): Current behavior — sidebar if provided, single column if not
  - `'simple'`: Forces single-column centered layout (max-w-xl), no sidebar even if provided. For 1-field forms.
  - `'standard'`: Current behavior — sidebar if provided (xl:grid-cols with 290px rail)
  - `'complex'`: Forces sidebar + wider max-width (max-w-4xl), optimized for multi-section forms
- No visual changes to existing behavior when `mode` is undefined or 'auto'
- No new dependencies

**Steps:**
- [ ] Step 1: Read current FormLayout implementation
- [ ] Step 2: Add `mode?: 'auto' | 'simple' | 'standard' | 'complex'` prop
- [ ] Step 3: Implement layout modes:
  - `simple`: `max-w-xl mx-auto` centered, ignore sidebar
  - `standard`: current behavior (sidebar if provided)
  - `complex`: `max-w-4xl` with sidebar
  - `auto`: current behavior (backward compat)
- [ ] Step 4: Write tests for all modes
- [ ] Step 5: Run `bun run check-types` to verify no type errors
- [ ] Step 6: Self-review — ensure no existing behavior is broken

**Preservation (mandatory):** additive changes only — do not delete or regress existing props, behavior, or visual design. The `mode` prop is optional and defaults to `'auto'` (no change).

**Report back (mandatory):**
End every implementer report with a `## Produces` block listing exact export/type names, signatures, permission strings, and i18n keys it created.

### Task 2: FormPreview Enhancement (Animated Value Flash + Completion Accent)

**Files:**
- Modify: `apps/client/src/components/FormPreview.tsx`
- Test: `apps/client/src/tests/FormPreview.test.tsx` (create if not exists)

**Interfaces:**
- Consumes: Existing `FormPreviewProps` interface
- Produces: Enhanced `FormPreview` with animated value transitions + completion accent border

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/FormPreview.tsx` (current implementation)
- `apps/client/src/index.css` (design tokens)
- `apps/client/src/lib/motion.ts` (motion presets)
- `AGENTS.md` (conventions)

**Frozen contract:**
- Component: `FormPreview`
- New props: None (all enhancements are automatic based on existing `filled`/`total` props)
- Enhancements:
  1. **Animated value flash** — when a row's `value` changes, the value text gets a brief highlight (background flash using `bg-primary/10` that fades out over 300ms)
  2. **Completion accent border** — a 3px left border on the preview card that fills vertically (height %) based on completion percentage, using the module color
- Motion: Use existing presets from `@/lib/motion`. Value flash uses a simple opacity/background transition (not a spring). Completion border uses `animate={{ height: `${pct}%` }}`.
- Colors: Use module color from `moduleCssVar(module)`, `bg-primary/10` for flash
- No new dependencies

**Steps:**
- [ ] Step 1: Read current FormPreview implementation
- [ ] Step 2: Add animated value flash — track previous values with `useRef`, when a row value changes, briefly highlight it
- [ ] Step 3: Add completion accent border — absolute positioned left border that fills based on `filled/total` percentage
- [ ] Step 4: Ensure all animations respect `useReducedMotion()`
- [ ] Step 5: Write tests for both enhancements
- [ ] Step 6: Run `bun run check-types` to verify no type errors
- [ ] Step 7: Self-review — ensure no existing behavior is broken

**Preservation (mandatory):** additive changes only — do not delete or regress existing props, behavior, or visual design. All enhancements are automatic based on existing props.

**Report back (mandatory):**
End every implementer report with a `## Produces` block listing exact export/type names, signatures, permission strings, and i18n keys it created.

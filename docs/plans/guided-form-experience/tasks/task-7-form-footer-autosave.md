### Task 7: FormFooter Enhancement (Autosave Indicator)

**Files:**
- Modify: `apps/client/src/components/FormFooter.tsx`
- Test: `apps/client/src/tests/FormFooter.test.tsx` (create if not exists)

**Interfaces:**
- Consumes: Existing `FormFooterProps` interface (read the file first)
- Produces: Enhanced `FormFooter` with `autosave?: { enabled: boolean; lastSaved?: Date; onSave: () => void }` prop

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/FormFooter.tsx` (current implementation)
- `apps/client/src/index.css` (design tokens)
- `AGENTS.md` (conventions)

**Frozen contract:**
- Component: `FormFooter`
- New prop: `autosave?: { enabled: boolean; lastSaved?: Date; onSave: () => void }` — when `enabled` is true, shows a debounced autosave indicator
- Behavior:
  - When `autosave.enabled` is true, the footer shows a small "Saved HH:MM" text with a green dot indicator on the left side
  - The `onSave` callback is debounced (1.5s) — form pages pass a function that saves the draft
  - The indicator uses `text-xs text-muted-foreground` with a `bg-success/20` green dot
  - When `autosave` is undefined or `enabled` is false, renders exactly as before
- The debounce logic lives in the component (useRef + useEffect + setTimeout)
- No new dependencies

**Steps:**
- [ ] Step 1: Read current FormFooter implementation
- [ ] Step 2: Add `autosave?: { enabled: boolean; lastSaved?: Date; onSave: () => void }` prop
- [ ] Step 3: When `autosave.enabled` is true, render a small saved indicator (green dot + "Saved HH:MM") on the left side of the footer
- [ ] Step 4: Implement debounce logic (1.5s) for the `onSave` callback
- [ ] Step 5: When `lastSaved` changes, update the displayed timestamp
- [ ] Step 6: Write tests for autosave indicator (enabled/disabled, timestamp display)
- [ ] Step 7: Run `bun run check-types` to verify no type errors
- [ ] Step 8: Self-review — ensure no existing behavior is broken

**Preservation (mandatory):** additive changes only — do not delete or regress existing props, behavior, or visual design. The `autosave` prop is optional and defaults to undefined (no change).

**Report back (mandatory):**
End every implementer report with a `## Produces` block listing exact export/type names, signatures, permission strings, and i18n keys it created.

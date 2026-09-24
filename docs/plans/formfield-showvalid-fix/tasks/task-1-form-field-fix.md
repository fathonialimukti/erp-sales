### Task 1: FormField showValid fix

**Files:**
- Modify: `apps/client/src/components/FormField.tsx`
- Test (QE-owned — read it, do NOT run it): `apps/client/src/tests/FormField.test.tsx`

**Interfaces:**
- Consumes: `FormField.test.tsx` "showValid prop" block expects `svg.text-success`
  inside `label` when `showValid` is true with no `error` — and passes NO `value`
  prop. Zero of 21 `<FormField>` call sites pass `value=`; ~30 sites use bare
  `showValid` or boolean expressions (e.g. `showValid={f.state.value?.trim().length > 0}`).
- Produces: `showValid?: boolean` renders the CheckCircle2 iff `showValid && !error`.
  `value` prop removed (dead API introduced in the same uncommitted batch).

**Reads (in your own context — no context is provided):**
- `apps/client/src/components/FormField.tsx`
- `apps/client/src/tests/FormField.test.tsx`
- `AGENTS.md`

**Frozen contract:**
- Change `{showValid && !error && value ?` → `{showValid && !error ?`
- Remove `value?: string` from the props interface and from the destructure.
- Keep untouched: motion `pageEnter` animation, `useReducedMotion`,
  `text-success` semantic class, `aria-hidden`, hint/description/error rendering.

**Steps:**
- [ ] Step 1: Apply the minimal edit above.
- [ ] Step 2: Self-review via `git diff` — confirm no other lines changed.
- [ ] Step 3: Do NOT run tests (quality-engineer owns test execution). Do NOT commit.

**Preservation (mandatory):** removing the uncommitted `value` prop is explicitly
authorized here (it never shipped, zero callers). Everything else additive only.

**Report back (mandatory):**
End your report with a `## Produces` block: exact final prop list of
`FormFieldProps`, the exact render condition, and confirmation that no caller
passes `value` (or list any you found and how you handled them).

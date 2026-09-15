### Task 6: Compose reply Send failure — frontend debug + fix

**Files:**
- Discover + Modify: compose/reply component(s) under `apps/client/src/pages/**/Email*.tsx` or `components/**/Compose*.tsx` (resolve in-context, UI sites only — disjoint from T5)
- Test: alongside component (create/extend minimal)

**Interfaces:**
- Consumes: T1/T5 backend contract — `trpcClient.emailCrm.sendMessage` (or discovered namespace), stays `email-crm@update`; T5 fix details when available (do not block — verify current wiring first)
- Produces: component fixed, trpc call used, i18n keys, error surfacing

**Reads (in your own context):**
- `AGENTS.md`
- This brief
- `apps/client/src/pages/Region*.tsx` (query/mutation patterns)
- Compose UI + tRPC call site (find via own search for sendMessage/compose)

**Frozen contract:**
- Behavior: Compose → Send calls existing mutation, disables while pending, shows success/error via existing toast pattern, clears/closes on success, surfaces TRPCError message (validation / FORBIDDEN / SMTP) — no silent fail
- Client rules: tRPC vanilla only in `queryFn`/`mutationFn`, semantic tokens, functional components, all strings via `intl.formatMessage`

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Step 1: Reproduce — open compose, send, capture network/TRPC error + console; check: wrong procedure name, stale input shape vs Zod, missing permission gate swallowing error, unhandled promise, button disabled logic.
- [ ] Step 2: Minimal fix — correct mutation wiring + pending/error/success states only.
- [ ] Step 3: `bun run check-types` scoped. DO NOT run vitest/playwright.
- [ ] Step 4: Self-review — no backend/route changes

**Report back (mandatory):**
End with `## Produces`: exact files, trpcClient call signature, root cause 1 line, i18n keys, test file+names, what user sees now on success/fail.

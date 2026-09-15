### Task 13: Card redesign — summary + expandable (aetherglo roles)

**Files:**
- Modify: `apps/client/src/pages/LoginPage.tsx` (list wiring only if needed)
- Modify: `apps/client/src/pages/auth/DemoUserCard.tsx` (summary + expandable — owned by this task)
- Modify: `apps/client/src/lib/useAuth.ts` ONLY if demoLogin wiring needs change (else leave)
- Do NOT touch: locales JSON (T14 owns), routes, server, schemas

**Interfaces:**
- Consumes (verbatim role names from T12a ## Produces):
  - `demo.admin@aetherglo.com` / Demo Admin → `System Admin`
  - `demo.manager@aetherglo.com` / Demo Manager → `Demo Manager`
  - `demo.supervisor@aetherglo.com` / Demo Supervisor → `Demo Supervisor`
  - `demo.staff@aetherglo.com` / Demo Staff → `Demo Salesperson`
  - `demo.inbound@aetherglo.com` / Demo Inbound → `Demo Inbound Staff`
  - Capabilities arrive as `role.permissions → permission.name` strings via existing `trpcClient.auth.listDemoUsers` / `demoLogin` (no contract change)
- Produces: card UX + i18n keys required (T14 implements JSON).

**Reads (in your own context):** AGENTS.md, LoginPage.tsx, DemoUserCard.tsx, docs/design-system/DESIGN.md (FROZEN), index.css, lib/motion.ts.

**Frozen contract:**
- Remove raw chip block (first-5 + `+N`). Replace with: `ABOUT THIS USER` eyebrow + one-line summary (clamp-2) + ghost trigger `Show details · {count} access areas` ⇄ `Show less` + grouped details (resource header + View/Create/Edit/Delete/Validate/Propose/Approve badges) + unchanged `Continue as {name}` footer.
- Data: client-side role→summary map, slug = role.toLowerCase().replace(/\s+/g,'-'): `system-admin`, `demo-manager`, `demo-supervisor`, `demo-salesperson`, `demo-inbound-staff`, fallback `demo.about.generic`. Summaries:
  - system-admin: full access, users/roles/every workflow
  - demo-manager: runs sales op, reviews/validates/approves
  - demo-supervisor: proposes/validates, never approves
  - demo-salesperson: field account, own orders/visits
  - demo-inbound-staff: receiving only, record receipts, no pricing/orders
- Grouping: split `resource@action` on `@`; humanize resource (sales-order→Sales orders); actions via `demo.action.*` (read=View, create=Create, update=Edit, delete=Delete, validate=Validate, propose=Propose, approve=Approve); unknown suffix → capitalized raw. Count = # groups.
- Radix Collapsible / Accordion-multiple + CSS height keyframes (NOT Motion lib for height); per-card state; aria-expanded/controls, region label, 44px trigger, focus ring, motion-reduce instant. List stagger untouched.
- tRPC vanilla only, semantic tokens, functional components, intl.formatMessage.

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:** [ ] Replace chip block with summary+trigger [ ] Grouped details + interaction [ ] Wire summaries + fallback [ ] Self-review, no tests.

**Report back (mandatory):** End with `## Produces`: files touched, component/prop changes, trpc used, i18n keys required (exact list for T14), behavior.

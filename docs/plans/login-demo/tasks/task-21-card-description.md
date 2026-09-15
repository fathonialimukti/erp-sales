### Task 21: Card shows description (truncate + show more), remove permission groups

**Files:**
- Modify: `apps/client/src/pages/auth/DemoUserCard.tsx` (rendering only — owned by this task)
- Modify: `apps/client/src/pages/LoginPage.tsx` ONLY if list wiring needs the new field (it flows through existing `DemoUser` type — should not)
- Do NOT touch: locales (T22 owns), server, schemas, routes, LegacyLoginForm

**Interfaces:**
- Consumes (from T20 ## Produces):
  - `demoUserSchema.description` nullable/optional; `listDemoUsers` outputs `description: user.description ?? null`; gating/exclusion untouched.
  - Seed texts (fallback copy if DB row lacks description): Demo Admin "Full access to users, roles, and every workflow." / Manager "Runs the sales operation: reviews, validates, and approves team orders." / Supervisor "Supervises the team: proposes and validates orders, but never approves." / Staff "Field account: creates own sales orders and records visits." / Inbound "Receiving only: records incoming goods, no pricing or sales orders."
- Produces: final card copy behavior + keys required (T22).

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/client/src/pages/auth/DemoUserCard.tsx` (current: ABOUT eyebrow + clamp-2 summary + Show details trigger + grouped resource/action badges)
- DESIGN.md FROZEN, index.css, motion.ts

**Frozen contract:**
- REPLACE permission display entirely: no `resource@action` groups, no action badges, no group count. Card shows role story text: `user.description` when present; fallback to client role→text map (existing `ABOUT_KEY_BY_SLUG` summaries) when null; last resort `demo.about.generic`.
- Layout: ABOUT THIS USER eyebrow → description paragraph, **truncated by default (line-clamp-3 or max-h) + `Show more`/`Show less` trigger** when text overflows (detect via scrollHeight > clientHeight or always-show toggle when length above threshold — pick robust approach, report choice). No collapsible groups anymore; single expandable text block.
- Keep: avatar plate, name/email, role Badge, `Continue as {name}` footer, list stagger, a11y (trigger 44px, aria-expanded/controls, region label if expanded block), motion-reduce, semantic tokens, intl only for chrome copy (`demo.about.title`, `demo.showMore`, `demo.showLess`, `demo.about.generic` fallback) — description TEXT is data from server (or client fallback), NOT translated.
- Do NOT render raw permission strings anywhere on the card.

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Replace grouped badges with description + truncate/show-more
- [ ] Wire fallback chain (description → slug map → generic)
- [ ] Self-review + client check-types, no tests
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: files touched, truncation approach, fallback chain, i18n keys still required (T22), behavior verified.
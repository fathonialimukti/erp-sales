### Task 17: Settings UI — provider-agnostic SMTP form (host, port, encryption, user, key, from)

**User directive:** "I'm using Brevo here, and I might set different later. According to settings." → The Settings page must let the user configure **any** SMTP provider: host, port, encryption mode, username, key/password, from address. Switching provider later must be a UI-only change.

**Files:**
- Discover + Read/Modify: the Settings SMTP section (resolve in-context — e.g. `apps/client/src/pages/setting/**` or `components/settings/**`)
- Modify ONLY if a needed field is missing, not persisted, wrong-typed, or reloads incorrectly
- Test: alongside the settings component

**Interfaces:**
- Consumes (from Task 16 `## Produces` — copy verbatim at dispatch time): the exact settings keys including the new encryption-mode key (expected `smtp.secure` with values like `none|starttls|ssl`) and the existing `smtp.host|port|user|pass|from|domain`; the settings read/write tRPC namespace (confirm in-context)
- Produces: verified form fields, persistence path, any fix

**Reads (in your own context):**
- `AGENTS.md`
- This brief (`docs/plans/ai-email-log-settings/tasks/task-17-settings-ui-smtp.md`)
- `apps/client/src/pages/Region*.tsx` (form patterns only)
- The Settings page/components + its tRPC calls + `apps/client/src/routes.tsx` (Settings route is `/setting`)

**Frozen contract:**
- Settings route is `/setting` (entry lives in the user modal before Logout — do NOT touch sidebar/modal, another task owns that)
- **Provider-agnostic form:** no Brevo-named labels, no hardcoded provider defaults, no port list limited to Brevo's ports. Free-text host, numeric port, and an explicit encryption selector (`None` / `STARTTLS` / `SSL/TLS`) so any provider can be entered.
- Sensible defaults may be hinted (e.g. placeholder `465` / `587`) but must not force a provider value.
- **Secret handling:** the key/password field must NOT echo the stored value. Show a masked/configured state and only send a value when the user types one. Confirm current behavior; fix if it leaks the stored secret into the DOM.
- Client rules: tRPC vanilla only, semantic Tailwind tokens (no raw hex, no gray text), functional components, ALL strings via `intl.formatMessage` (add keys to `en.json` + `id.json` if new labels are needed)

```
Design law (FROZEN): docs/design-system
Tokens: apps/client/src/index.css
Motion: apps/client/src/lib/motion.ts
UI craft owner: frontend-engineer + ui-ux-pro-max
```

**Steps:**
- [ ] Step 1: Locate the SMTP settings section. Inventory which fields exist. Report MISSING ones explicitly — expected set: **host, port, encryption/secure, username, key/password, from address** (and domain if the backend consumes it).
- [ ] Step 2: Verify load — saved values fetched and populated on mount (port shows 2525; encryption control reflects the stored value; key masked, not plaintext).
- [ ] Step 3: Verify save — each field persists to the correct `appSetting` key with the correct type (**port is a NUMBER**, not a string), with visible success/error feedback and validation errors surfaced.
- [ ] Step 4: Confirm no Brevo-specific copy or forced defaults anywhere in the form (labels, placeholders, help text).
- [ ] Step 5: Note (do not necessarily build) a "test connection"/verify affordance as a gap.
- [ ] Step 6: Fix only proven defects (missing field, wrong type, not persisted, secret echoed, no feedback). Minimal change.
- [ ] Step 7: `bun run check-types` scoped to `apps/client`. Write tests; do NOT run the full suite.
- [ ] Step 8: Self-review — no sidebar/modal/route changes.

**Report back (mandatory):**
End with `## Produces`:
- Exact settings file(s)/component(s) + settings mutation used (namespace + procedure)
- Field inventory: exists / MISSING (esp. port, encryption, key)
- Load verdict (port populated? encryption reflects state? key masked?) and save verdict (persists, correct types, feedback)
- Any fix applied + files changed + new i18n keys
- Test file + names + exact run command (from `apps/client`)
- Remaining gaps (e.g. no test-connection button)
- **Provider-switch verdict from the UI:** can the user enter a different provider's host/port/encryption/user/key/from and save it? yes/no + why
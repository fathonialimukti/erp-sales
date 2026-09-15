### Task 7: Restart dev server with pm2 (pick up DEMO_LOGIN_ENABLED)

**Files:**
- Modify: none (ops only)
- Do NOT touch: `apps/server/src/routers/auth.ts`, schemas, client files, env files (T6 already set them)

**Interfaces:**
- Consumes (verbatim from T6 ## Produces):
  - Local demo enabled by: `apps/server/.env` (`DEMO_LOGIN_ENABLED=true`); restart dev server to apply.
  - Gate: `assertDemoLoginEnabled()` in `apps/server/src/routers/auth.ts` passes when `DEMO_LOGIN_ENABLED==='true'`
- Produces: pm2 process restarted + healthy, demo endpoints live

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- pm2 process list / ecosystem config / `apps/server` package.json dev script (locate in your own context)

**Frozen contract:**
- Action: `pm2 restart` the dev server process (use existing ecosystem name if present, else restart by name/path — report exact command used).
- Goal: pick up `DEMO_LOGIN_ENABLED=true` from `apps/server/.env` so `auth.listDemoUsers` stops throwing FORBIDDEN.
- Do NOT edit code or env files. Do NOT git add/commit/push. If pm2 is unavailable, report that verbatim with fallback command (`bun run dev`).
- Verify: `pm2 status` / `pm2 logs --lines 30` shows process online, no crash loop.

**Steps:**
- [ ] Step 1: Locate pm2 process for dev server
- [ ] Step 2: Restart it via pm2
- [ ] Step 3: Check status/logs healthy
- [ ] Step 4: Report back

**Report back (mandatory):**
End with `## Produces` listing exact pm2 command run, process name/status, and whether restart succeeded. If restart failed, give exact error + manual fallback.

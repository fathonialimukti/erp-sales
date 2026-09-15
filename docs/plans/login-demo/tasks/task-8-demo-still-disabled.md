### Task 8: Diagnose demo login still FORBIDDEN after pm2 restart

**Context:** T6 set `DEMO_LOGIN_ENABLED=true` in `apps/server/.env` + template. T7 ran `pm2 restart erp-server` (healthy boot, port 10022). User still sees "Demo login is disabled / turned off for this environment" (backend FORBIDDEN from `assertDemoLoginEnabled()`).

**Files (inspect in your own context — orchestrator provides no source):**
- `apps/server/src/routers/auth.ts` (gate `assertDemoLoginEnabled()` ~lines 46-50)
- `apps/server/.env`, root `.env` if present, `apps/server/.env.example`
- `ecosystem.config.js` (pm2 config — check `env:` / `env_production:` blocks that may pin the flag)
- dotenv loading in `apps/server` (which file it reads, override behavior)

**Interfaces:**
- Consumes (verbatim):
  - T6: Local demo enabled by `apps/server/.env` (`DEMO_LOGIN_ENABLED=true`); restart to apply.
  - T7: `pm2 restart erp-server` exit 0, online, port 10022. pm2 noted "Use --update-env to update environment variables".
  - T2: both procedures throw `FORBIDDEN` when `DEMO_LOGIN_ENABLED !== 'true'`.
- Produces: root cause + fix + live verification that `auth.listDemoUsers` no longer throws FORBIDDEN.

**Hypotheses to check in order (your own context):**
1. pm2 cached env: `restart` without `--update-env` keeps old process env, and dotenv does NOT override existing vars → flag never seen. Fix: `pm2 restart erp-server --update-env` (or delete+start). Check `pm2 show erp-server` / `pm2 env 0` to confirm which value the process actually sees.
2. Wrong env file: server may read root `.env`, not `apps/server/.env`. Check dotenv init + cwd (`apps/server`) + ecosystem `cwd`. Put the flag where the server actually reads (and mirror template).
3. Ecosystem pins the var: `ecosystem.config.js` `env:` block sets `DEMO_LOGIN_ENABLED=false` (or omits it while pm2 injects). Fix the ecosystem file if so.
4. Wrong server instance: client may hit a different backend (port/URL) than the restarted one. Check which port the client calls vs `Server listening on port 10022`.

**Frozen contract:**
- Keep gate logic as-is (strict `==='true'` check stays). Env wiring / pm2 invocation fix only.
- Never enable in production with real data — local/demo only.
- Do NOT touch schemas, client, routes. Never git add/commit/push.
- You MAY run read-only probes (pm2 show/status/logs, endpoint probe) — this is diagnosis, not the test suite (QE still owns vitest).

**Steps:**
- [ ] Step 1: Reproduce — confirm process env value (`pm2 show`/`env`) + probe `listDemoUsers` (curl/trpc) to see FORBIDDEN live
- [ ] Step 2: Identify which of H1–H4 is the cause
- [ ] Step 3: Apply minimal fix (correct env file + `restart --update-env` or ecosystem fix)
- [ ] Step 4: Verify live — probe returns user list, pm2 online, logs clean
- [ ] Step 5: Report back

**Report back (mandatory):**
End with `## Produces`: root cause (H1/H2/H3/H4 + evidence), exact fix commands + files changed (if any), live verification output (probe result + pm2 status), and restart instruction if user must do anything.

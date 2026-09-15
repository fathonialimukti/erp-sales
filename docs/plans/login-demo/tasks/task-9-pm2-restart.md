### Task 9: pm2 restart erp-server (user-requested restart)

**Files:** none (ops only)

**Interfaces:**
- Consumes: T8 fixed stale port orphan; `apps/server/.env` has `DEMO_LOGIN_ENABLED=true`; process `erp-server` serves port 10022.
- Produces: fresh pm2 restart, online + healthy.

**Reads (in your own context):** AGENTS.md, pm2 status/logs only.

**Frozen contract:**
- Command: `pm2 restart erp-server --update-env` (with `--update-env` so pm2 refreshes env).
- Verify: `pm2 status` online, logs show `Server listening on port 10022`, no crash loop. Confirm port owner is pm2 child (no orphan).
- No code/env edits. Never git add/commit/push. Read-only probes only besides restart.

**Steps:**
- [ ] Restart via pm2 with --update-env
- [ ] Verify status/logs + port owner
- [ ] Report back

**Report back (mandatory):** End with `## Produces` (exact command, process status, healthy yes/no).

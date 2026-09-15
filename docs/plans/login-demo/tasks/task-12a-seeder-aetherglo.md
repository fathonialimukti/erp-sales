### Task 12a: Seed real-world demo users @aetherglo.com (no report-only)

**Files:**
- Modify: `apps/server/src/prisma/seed.ts` (extend `PERMISSIONS` + `ROLES` + `seedUsers()` — owned by this task)
- Do NOT touch: `apps/server/src/routers/auth.ts` (owned by T12b), schemas, client, routes, PH seeder `seed/users.ts`

**Interfaces:**
- Consumes (from T10 research): legacy seeder creates admin/n8n/ai-system; PH seeder users have null roles; no inbound domain exists (43 models, none receiving-related); role→permissions via explicit lists.
- Produces: 5–6 demo users @aetherglo.com + roles + permissions for T13 card summaries + QE.

**Reads (in your own context — no context is provided):**
- `AGENTS.md`
- `apps/server/src/prisma/seed.ts` (PERMISSIONS, ROLES, seedUsers)
- `apps/server/src/routers/auth.ts` (how listDemoUsers maps role→capabilities)

**Frozen contract:**
- Resource: `auth` / `user` / `role` / `permission`
- Domain: **`@aetherglo.com`** (NOT luzonfoods.ph). Users (password `password`, dev-only):
  - `demo.admin@aetherglo.com` / Demo Admin → System Admin (`*`), full-access reference
  - `demo.manager@aetherglo.com` / Demo Manager → Demo Manager (new): sales-order read/create/update/validate/propose/approve, customer/outlet/region/area read, sku read, payment read/create, visit read/validate, programs read + approve-area, report read. NO user/role admin, NO settings@update, NO ai-admin, NO deletes.
  - `demo.supervisor@aetherglo.com` / Demo Supervisor (new): sales-order read/validate/propose (NO approve), visit read/create/validate, customer/outlet/sku/report read. NO deletes.
  - `demo.staff@aetherglo.com` / Demo Staff (new, salesperson): sales-order read/create/update, customer/outlet/sku read, visit read/create, payment read. NO validate/approve/delete, NO sku@update (pricing).
  - `demo.inbound@aetherglo.com` / Demo Inbound (new): `inbound@read/create` (NEW perms) + sku read + vendor read. Receiving-only: NO approve/delete, NO sales-order@*, NO payment@create.
- Real-world strategy (NOT one module): cover the sales → validate → approve chain (staff → supervisor → manager → admin) PLUS inbound receiving lane (inbound staff isolated from pricing/orders). Explicit permission arrays (pattern matcher too coarse for Manager/Supervisor).
- Add `inbound@read` ("Read goods receipts") + `inbound@create` ("Record goods receipts") to PERMISSIONS. Deliberately NO inbound@approve/delete yet.
- Upsert by email like admin block, `hashSync("password", 10)`. Leave PH seeder untouched.

**Steps:**
- [ ] Extend PERMISSIONS (2 inbound rows)
- [ ] Add/replace ROLES with explicit arrays (Demo Manager, Demo Supervisor, Demo Salesperson, Demo Inbound Staff)
- [ ] Append 5 upserts in seedUsers()
- [ ] Self-review only (no seed run, no tests — QE owns execution)
- [ ] Report back

**Report back (mandatory):** End with `## Produces`: exact roles created, exact permission arrays, exact user emails/names, file + line ranges. T13 consumes role names verbatim.

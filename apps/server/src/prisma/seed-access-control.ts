/**
 * Access-control intent for the database seed — the permissions the seed
 * creates and the roles it grants them to.
 *
 * Extracted from `seed.ts` so this module is IMPORTABLE. `seed.ts` invokes
 * `main()` at module top level, so anything that imported the ACL tables from
 * there would execute the entire destructive seed as a side effect of the
 * import. That made the tables untestable, which is how a permission could sit
 * in the seed and never reach the database with nothing to catch it.
 *
 * `planRolePermissions` is the single source of truth for "who is supposed to
 * get what". The seed writes it and `tests/prisma/seed-access-control.test.ts`
 * asserts the live database agrees, so the two cannot drift apart.
 */

export type SeedPermission = { name: string; description: string };

export type SeedRole = {
    name: string;
    description: string;
    pattern?: string;
    permissions?: string[];
};

export const PERMISSIONS: SeedPermission[] = [
  // User
  { name: "user@create", description: "Create users" },
  { name: "user@read", description: "Read users" },
  { name: "user@update", description: "Update users" },
  { name: "user@delete", description: "Delete users" },

  // Role
  { name: "role@create", description: "Create roles" },
  { name: "role@read", description: "Read roles" },
  { name: "role@update", description: "Update roles" },
  { name: "role@delete", description: "Delete roles" },

  // Permission
  { name: "permission@create", description: "Create permissions" },
  { name: "permission@read", description: "Read permissions" },
  { name: "permission@update", description: "Update permissions" },
  { name: "permission@delete", description: "Delete permissions" },

  // SKU
  { name: "sku@create", description: "Create SKUs" },
  { name: "sku@read", description: "Read SKUs" },
  { name: "sku@update", description: "Update SKUs" },
  { name: "sku@delete", description: "Delete SKUs" },

  // SKU Category
  { name: "skuCategory@read", description: "Read SKU categories" },
  { name: "skuCategory@create", description: "Create SKU categories" },
  { name: "skuCategory@update", description: "Update SKU categories" },
  { name: "skuCategory@delete", description: "Delete SKU categories" },

  // Activity Log
  { name: "activity_log@read", description: "Read activity logs" },
  { name: "applicationLog@read", description: "Read application logs (app_logs viewer)" },
  { name: "log@read", description: "Read system logs (server + client operational events)" },

  { name: "report@read", description: "Read reports" },

  // Notification
  { name: "notification@read", description: "View own notifications" },
  { name: "notification@update", description: "Mark own notifications as read" },
  { name: "notification@delete", description: "Delete own notifications + administer all notifications" },
  { name: "notification@broadcast", description: "Broadcast notifications to users" },

  // AI Admin
  { name: "ai-admin@access", description: "Access AI system administrator assistant with full read-write database access" },
  // Deliberately not `@read`: the AI SQL console selects from every table
  // (users incl. password hashes, revoked tokens, money tables), so it must not
  // be reachable through the Viewer's `@read` pattern fallback.
  { name: "ai@query", description: "Run read-only SQL through the AI assistant's database query tool" },

  // Settings
  { name: "settings@read", description: "Read app settings" },
  { name: "settings@update", description: "Update app settings" },
  { name: "settings@app@read", description: "Read key-value app settings" },
  { name: "settings@app@update", description: "Update key-value app settings" },
  { name: "settings@user@read", description: "Read key-value user settings" },
  { name: "settings@user@update", description: "Update key-value user settings" },

  // Knowledge Base
  { name: "knowledge-base@read", description: "Read knowledge base entries" },
  { name: "knowledge-base@create", description: "Create knowledge base entries" },
  { name: "knowledge-base@update", description: "Update knowledge base entries" },
  { name: "knowledge-base@delete", description: "Delete knowledge base entries" },

  // CRM
  { name: "region@read", description: "Read regions" },
  { name: "region@create", description: "Create regions" },
  { name: "region@update", description: "Update regions" },
  { name: "region@delete", description: "Delete regions" },

  { name: "area@read", description: "Read areas" },
  { name: "area@create", description: "Create areas" },
  { name: "area@update", description: "Update areas" },
  { name: "area@delete", description: "Delete areas" },

  { name: "customer@read", description: "Read customers" },
  { name: "customer@create", description: "Create customers" },
  { name: "customer@update", description: "Update customers" },
  { name: "customer@delete", description: "Delete customers" },

  { name: "outlet@read", description: "Read outlets" },
  { name: "outlet@create", description: "Create outlets" },
  { name: "outlet@update", description: "Update outlets" },
  { name: "outlet@delete", description: "Delete outlets" },

  { name: "sales-order@read", description: "Read sales orders" },
  { name: "sales-order@create", description: "Create sales orders" },
  { name: "sales-order@update", description: "Update sales orders" },
  { name: "sales-order@delete", description: "Delete sales orders" },
  { name: "sales-order@validate", description: "Validate sales orders" },
  { name: "sales-order@propose", description: "Propose sales orders" },
  { name: "sales-order@approve", description: "Approve sales orders" },

  { name: "action-program@read", description: "Read action programs" },
  { name: "action-program@create", description: "Create action programs" },
  { name: "action-program@update", description: "Update action programs" },
  { name: "action-program@delete", description: "Delete action programs" },
  { name: "action-program@validate", description: "Validate action programs" },
  { name: "action-program@approve-area", description: "Approve action programs at area level" },
  { name: "action-program@approve-region", description: "Approve action programs at region level" },
  { name: "action-program@approve-finance", description: "Approve action programs at finance level" },
  { name: "action-program@approve-director", description: "Approve action programs at director level" },

  { name: "event-proposal@read", description: "Read event proposals" },
  { name: "event-proposal@create", description: "Create event proposals" },
  { name: "event-proposal@update", description: "Update event proposals" },
  { name: "event-proposal@delete", description: "Delete event proposals" },
  { name: "event-proposal@validate", description: "Validate event proposals" },
  { name: "event-proposal@approve-area", description: "Approve event proposals at area level" },
  { name: "event-proposal@approve-region", description: "Approve event proposals at region level" },
  { name: "event-proposal@approve-finance", description: "Approve event proposals at finance level" },
  { name: "event-proposal@approve-director", description: "Approve event proposals at director level" },

  { name: "visit-log@read", description: "Read visit logs" },
  { name: "visit-log@create", description: "Create visit logs" },
  { name: "visit-log@delete", description: "Delete visit logs" },
  { name: "visit-log@validate", description: "Validate visit logs" },

  { name: "payment@read", description: "Read payments" },
  { name: "payment@create", description: "Create payments" },
  { name: "payment@delete", description: "Delete payments" },

  // Email CRM
  { name: "email-crm@read", description: "Read email CRM conversations" },
  { name: "email-crm@create", description: "Create email CRM conversations" },
  { name: "email-crm@update", description: "Update email CRM conversations and messages" },
  { name: "email-crm@delete", description: "Delete email CRM conversations" },

  // Budget
  { name: "budget@read", description: "Read budgets" },
  { name: "budget@create", description: "Create budgets" },
  { name: "budget@update", description: "Update budgets" },
  { name: "budget@delete", description: "Delete budgets" },

  // Budget Type
  { name: "budget-type@read", description: "Read budget types" },
  { name: "budget-type@create", description: "Create budget types" },
  { name: "budget-type@update", description: "Update budget types" },
  { name: "budget-type@delete", description: "Delete budget types" },

  // Budget Period
  { name: "budget-period@read", description: "Read budget periods" },
  { name: "budget-period@create", description: "Create budget periods" },
  { name: "budget-period@update", description: "Update budget periods" },
  { name: "budget-period@delete", description: "Delete budget periods" },

  // Budget Line
  { name: "budget-line@read", description: "Read budget lines" },
  { name: "budget-line@create", description: "Create budget lines" },
  { name: "budget-line@update", description: "Update budget lines" },
  { name: "budget-line@delete", description: "Delete budget lines" },

  // Action Type
  { name: "action-type@read", description: "Read action types" },
  { name: "action-type@create", description: "Create action types" },
  { name: "action-type@update", description: "Update action types" },
  { name: "action-type@delete", description: "Delete action types" },

  // Event Type
  { name: "event-type@read", description: "Read event types" },
  { name: "event-type@create", description: "Create event types" },
  { name: "event-type@update", description: "Update event types" },
  { name: "event-type@delete", description: "Delete event types" },

  // Vendor
  { name: "vendor@read", description: "Read vendors" },
  { name: "vendor@create", description: "Create vendors" },
  { name: "vendor@update", description: "Update vendors" },
  { name: "vendor@delete", description: "Delete vendors" },

  // Inbound (goods receiving lane — deliberately no approve/delete yet)
  { name: "inbound@read", description: "Read goods receipts" },
  { name: "inbound@create", description: "Record goods receipts" },

  // Backup. `backup@restore` is also the Express gate on POST /api/backups/upload
  // (routes/backup-upload.ts), and `withAuth` matches permission names exactly —
  // it does not honour the `*` / `resource@*` wildcards that tRPC's gate does
  // (lib/express-auth.ts:87 vs trpc.ts:34). So these are granted to System Admin
  // by name, like the rest of its list, and not left to a wildcard.
  { name: "backup@read", description: "Read backup history" },
  { name: "backup@create", description: "Create backups" },
  { name: "backup@delete", description: "Delete backups" },
  { name: "backup@restore", description: "Restore the database from a backup" },
];

export const ROLES: SeedRole[] = [
  {
    name: "System Admin",
    description: "Full system access",
    permissions: [
      "user@create", "user@read", "user@update", "user@delete",
      "role@create", "role@read", "role@update", "role@delete",
      "permission@create", "permission@read", "permission@update", "permission@delete",
      "sku@create", "sku@read", "sku@update", "sku@delete",
      "skuCategory@read", "skuCategory@create", "skuCategory@update", "skuCategory@delete",
      "activity_log@read", "applicationLog@read", "log@read",
      "report@read",
      "notification@read", "notification@update", "notification@delete", "notification@broadcast",
      "ai-admin@access",
      "ai@query",
      "settings@read", "settings@update",
      "settings@app@read", "settings@app@update",
      "settings@user@read", "settings@user@update",
      "knowledge-base@read", "knowledge-base@create", "knowledge-base@update", "knowledge-base@delete",
      "region@read", "region@create", "region@update", "region@delete",
      "area@read", "area@create", "area@update", "area@delete",
      "customer@read", "customer@create", "customer@update", "customer@delete",
      "outlet@read", "outlet@create", "outlet@update", "outlet@delete",
      "sales-order@read", "sales-order@create", "sales-order@update", "sales-order@delete",
      "sales-order@validate", "sales-order@propose", "sales-order@approve",
      "action-program@read", "action-program@create", "action-program@update", "action-program@delete",
      "action-program@validate", "action-program@approve-area", "action-program@approve-region",
      "action-program@approve-finance", "action-program@approve-director",
      "event-proposal@read", "event-proposal@create", "event-proposal@update", "event-proposal@delete",
      "event-proposal@validate", "event-proposal@approve-area", "event-proposal@approve-region",
      "event-proposal@approve-finance", "event-proposal@approve-director",
      "visit-log@read", "visit-log@create", "visit-log@delete", "visit-log@validate",
      "payment@read", "payment@create", "payment@delete",
      "email-crm@read", "email-crm@create", "email-crm@update", "email-crm@delete",
      "budget@read", "budget@create", "budget@update", "budget@delete",
      "budget-type@read", "budget-type@create", "budget-type@update", "budget-type@delete",
      "budget-period@read", "budget-period@create", "budget-period@update", "budget-period@delete",
      "budget-line@read", "budget-line@create", "budget-line@update", "budget-line@delete",
      "action-type@read", "action-type@create", "action-type@update", "action-type@delete",
      "event-type@read", "event-type@create", "event-type@update", "event-type@delete",
      "vendor@read", "vendor@create", "vendor@update", "vendor@delete",
      "inbound@read", "inbound@create",
      "backup@read", "backup@create", "backup@delete", "backup@restore",
    ],
  },
  { name: "Sales Manager", description: "Manage sales operations", pattern: "sales-order@*" },
  { name: "Salesperson", description: "Create and manage own sales orders", pattern: "sales-order@read" },
  { name: "Viewer", description: "Read-only access to most modules", pattern: "@read" },
  // Demo set (@aetherglo.com) — explicit arrays; pattern matcher too coarse for Manager/Supervisor.
  {
    name: "Demo Manager",
    description: "Demo: validate + approve sales chain, area-level program approval",
    permissions: [
      "sales-order@read",
      "sales-order@create",
      "sales-order@update",
      "sales-order@validate",
      "sales-order@propose",
      "sales-order@approve",
      "customer@read",
      "outlet@read",
      "region@read",
      "area@read",
      "sku@read",
      "payment@read",
      "payment@create",
      "visit-log@read",
      "visit-log@validate",
      "action-program@read",
      "action-program@approve-area",
      "event-proposal@read",
      "event-proposal@approve-area",
      "report@read",
    ],
  },
  {
    name: "Demo Supervisor",
    description: "Demo: validate sales orders and visits, no approve",
    permissions: [
      "sales-order@read",
      "sales-order@validate",
      "sales-order@propose",
      "visit-log@read",
      "visit-log@create",
      "visit-log@validate",
      "customer@read",
      "outlet@read",
      "sku@read",
      "report@read",
    ],
  },
  {
    name: "Demo Salesperson",
    description: "Demo: create orders and visits, no validate/approve, no pricing",
    permissions: [
      "sales-order@read",
      "sales-order@create",
      "sales-order@update",
      "customer@read",
      "outlet@read",
      "sku@read",
      "visit-log@read",
      "visit-log@create",
      "payment@read",
    ],
  },
  {
    name: "Demo Inbound Staff",
    description: "Demo: receiving-only lane, isolated from pricing/orders",
    permissions: ["inbound@read", "inbound@create", "sku@read", "vendor@read"],
  },
];

function normalizePermissionName(permission: string) {
  if (permission.includes("@")) return permission;
  return permission.replace(/_([^_]+)$/, "@$1");
}

function matchesPattern(permName: string, pattern: string): boolean {
  const normalizedPermission = normalizePermissionName(permName);
  const normalizedPattern = pattern.includes("@") ? pattern : normalizePermissionName(pattern);
  if (normalizedPattern === normalizedPermission) return true;
  if (normalizedPattern.endsWith("@*")) {
    const prefix = normalizedPattern.slice(0, -2);
    return normalizedPermission.startsWith(prefix + "@");
  }
  return false;
}

/**
 * The intended grant for every seeded role, given the permission names that
 * exist. Explicit `permissions` arrays win; `pattern` is the fallback that
 * keeps legacy roles (Sales Manager, Viewer) working.
 *
 * Both the seed writer and the database-agreement test call this, so the
 * assertion can never quietly encode different intent than the seed applies.
 */
export function planRolePermissions(permissionNames: string[]): Map<string, string[]> {
  const plan = new Map<string, string[]>();
  for (const role of ROLES) {
    const matched = role.permissions
      ? permissionNames.filter((name) => role.permissions!.includes(name))
      : permissionNames.filter((name) => matchesPattern(name, role.pattern!));
    plan.set(role.name, matched);
  }
  return plan;
}

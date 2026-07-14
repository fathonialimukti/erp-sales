import "dotenv/config";
import { hashSync } from "bcrypt";
import { faker } from "@faker-js/faker";
import { prisma } from "../lib/prisma.js";

const FAKER_SEED = Number(process.env.SEED_SEED) || 20260519;

// =============================================
// ACCESS CONTROL CONSTANTS
// =============================================

const PERMISSIONS = [
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

  // Activity Log
  { name: "activity_log@read", description: "Read activity logs" },

  { name: "report@read", description: "Read reports" },

  // Notification
  { name: "notification@read", description: "View notifications" },
  { name: "notification@delete", description: "Delete notifications" },
  { name: "notification@broadcast", description: "Broadcast notifications to users" },

  // AI Admin
  { name: "ai-admin@access", description: "Access AI system administrator assistant with full read-write database access" },

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
];

const ROLES = [
  { name: "System Admin", description: "Full system access", pattern: "*" as const },
  { name: "Sales Manager", description: "Manage sales operations", pattern: "sales-order@*" },
  { name: "Salesperson", description: "Create and manage own sales orders", pattern: "sales-order@read" },
  { name: "Viewer", description: "Read-only access to most modules", pattern: "@read" },
];

// =============================================
// ACCESS CONTROL FUNCTIONS
// =============================================

function normalizePermissionName(permission: string) {
  if (permission.includes("@")) return permission;
  return permission.replace(/_([^_]+)$/, "@$1");
}

function matchesPattern(permName: string, pattern: string): boolean {
  if (pattern === "*") return true;
  const normalizedPermission = normalizePermissionName(permName);
  const normalizedPattern = pattern.includes("@") ? pattern : normalizePermissionName(pattern);
  if (normalizedPattern === normalizedPermission) return true;
  if (normalizedPattern.endsWith("@*")) {
    const prefix = normalizedPattern.slice(0, -2);
    return normalizedPermission.startsWith(prefix + "@");
  }
  return false;
}

async function seedPermissionsAndRoles() {
  console.log("Cleaning existing permissions and roles...");
  // Unlink users from roles before deleting (FK constraint)
  await prisma.user.updateMany({ data: { roleId: null } });
  await prisma.roleHasPermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  console.log("✓ Cleaned existing permissions and roles");

  console.log("Seeding permissions...");
  for (const perm of PERMISSIONS) {
    await prisma.permission.create({ data: { name: perm.name, description: perm.description } });
  }
  console.log(`✓ ${PERMISSIONS.length} permissions seeded`);

  console.log("Seeding roles...");
  const roleIds: Record<string, string> = {};
  for (const role of ROLES) {
    const created = await prisma.role.create({ data: { name: role.name, description: role.description } });
    roleIds[role.name] = created.id;
  }
  console.log(`✓ ${ROLES.length} roles seeded`);

  console.log("Assigning permissions to roles...");
  const allPermissions = await prisma.permission.findMany();
  for (const role of ROLES) {
    const roleId = roleIds[role.name];
    if (!roleId) continue;
    const matched = allPermissions.filter((p) => matchesPattern(p.name, role.pattern));
    await prisma.roleHasPermission.createMany({
      data: matched.map((p) => ({ roleId, permissionId: p.id })),
    });
  }
  console.log("✓ Permissions assigned to roles");

  return roleIds;
}

// =============================================
// USER SEEDING
// =============================================

async function seedUsers(roleIds: Record<string, string>) {
  console.log("Ensuring admin user exists...");
  const hashedPassword = hashSync("password", 10);

  const existingUser = await prisma.user.findUnique({ where: { email: "admin@mail.com" } });
  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { name: "Admin", password: hashedPassword, roleId: roleIds["System Admin"] },
    });
    console.log("✓ Admin user updated");
  } else {
    await prisma.user.create({
      data: {
        email: "admin@mail.com",
        name: "Admin",
        password: hashedPassword,
        roleId: roleIds["System Admin"],
      },
    });
    console.log("✓ Admin user created");
  }
}

// =============================================
// CRM FAKE DATA
// =============================================

async function seedCrmData() {
  console.log("\n🌱 Seeding CRM data...");

  // Clean existing CRM data
  console.log("Cleaning existing CRM data...");
  await prisma.visitLog.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.actionProgramOutlet.deleteMany({});
  await prisma.actionProgramSku.deleteMany({});
  await prisma.actionProgramPayment.deleteMany({});
  await prisma.actionProgram.deleteMany({});
  await prisma.eventProposalSku.deleteMany({});
  await prisma.eventProposalPayment.deleteMany({});
  await prisma.eventProposal.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.customerContact.deleteMany({});
  await prisma.outlet.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.sku.deleteMany({});
  await prisma.skuCategory.deleteMany({});
  await prisma.area.deleteMany({});
  await prisma.region.deleteMany({});
  console.log("✓ Cleaned existing CRM data");

  // Regions
  const regionData = [
    { code: "JKT", name: "Jakarta" },
    { code: "BDG", name: "Bandung" },
    { code: "SBY", name: "Surabaya" },
  ];
  const regions = await Promise.all(regionData.map((r) => prisma.region.create({ data: r })));

  // Areas
  const areaData = [
    { code: "JKT-UT", name: "Jakarta Utara", regionId: regions[0]!.id },
    { code: "JKT-SL", name: "Jakarta Selatan", regionId: regions[0]!.id },
    { code: "BDG-TM", name: "Bandung Timur", regionId: regions[1]!.id },
    { code: "BDG-BR", name: "Bandung Barat", regionId: regions[1]!.id },
    { code: "SBY-PS", name: "Surabaya Pusat", regionId: regions[2]!.id },
    { code: "SBY-BR", name: "Surabaya Barat", regionId: regions[2]!.id },
  ];
  const areas = await Promise.all(areaData.map((a) => prisma.area.create({ data: a })));

  // SKU Categories
  const categories = await Promise.all([
    prisma.skuCategory.create({ data: { code: "BEV", name: "Beverages" } }),
    prisma.skuCategory.create({ data: { code: "SNK", name: "Snacks" } }),
    prisma.skuCategory.create({ data: { code: "PRD", name: "Personal Care" } }),
  ]);

  // SKUs
  const skuData = [
    { code: "BEV-TEA-01", name: "Green Tea 500ml", categoryId: categories[0]!.id, basePrice: 5000 },
    { code: "BEV-COF-01", name: "Instant Coffee 200g", categoryId: categories[0]!.id, basePrice: 25000 },
    { code: "BEV-JUI-01", name: "Orange Juice 1L", categoryId: categories[0]!.id, basePrice: 15000 },
    { code: "SNK-CHP-01", name: "Potato Chips 150g", categoryId: categories[1]!.id, basePrice: 12000 },
    { code: "SNK-CKY-01", name: "Chocolate Cookies 200g", categoryId: categories[1]!.id, basePrice: 18000 },
    { code: "SNK-NUT-01", name: "Mixed Nuts 100g", categoryId: categories[1]!.id, basePrice: 22000 },
    { code: "PRD-SHP-01", name: "Shampoo 250ml", categoryId: categories[2]!.id, basePrice: 20000 },
    { code: "PRD-SOP-01", name: "Bath Soap 100g", categoryId: categories[2]!.id, basePrice: 5000 },
    { code: "PRD-THP-01", name: "Toothpaste 150g", categoryId: categories[2]!.id, basePrice: 15000 },
  ];
  const skus = await Promise.all(skuData.map((s) => prisma.sku.create({ data: s })));

  // Customers
  const customerData = [
    { code: "CUST-001", name: "Makmur Sejahtera Retail", taxId: "01.234.567.8-901.000", paymentTerms: "NET30" },
    { code: "CUST-002", name: "Berkah Abadi Wholesale", taxId: "02.345.678.9-012.000", paymentTerms: "NET14" },
    { code: "CUST-003", name: "Sumber Rejeki Distribution", taxId: "03.456.789.0-123.000", paymentTerms: "NET30" },
    { code: "CUST-004", name: "Mitra Utama Trading", taxId: "04.567.890.1-234.000", paymentTerms: "NET45" },
    { code: "CUST-005", name: "Cahaya Nusantara Mart", taxId: "05.678.901.2-345.000", paymentTerms: "COD" },
  ];
  const customers = await Promise.all(customerData.map((c) => prisma.customer.create({ data: c })));

  // Outlets — 2-3 per customer, spread across different areas
  const outletSuffixes = ["Main Store", "Branch A", "Branch B"];
  let outletCount = 0;
  for (const customer of customers) {
    // Each customer gets outlets in 2-3 different areas
    const numOutlets = faker.number.int({ min: 2, max: 3 });
    // Shuffle areas and pick distinct ones for this customer
    const shuffled = faker.helpers.shuffle([...areas]);
    const assignedAreas = shuffled.slice(0, numOutlets);

    for (let i = 0; i < assignedAreas.length; i++) {
      const area = assignedAreas[i]!;
      outletCount++;
      await prisma.outlet.create({
        data: {
          customerId: customer.id,
          areaId: area.id,
          code: `OUT-${customer.code}-${String(i + 1).padStart(2, '0')}`,
          name: `${customer.name} - ${outletSuffixes[i] ?? `Store ${i + 1}`}`,
          address: faker.location.streetAddress(),
          contactName: faker.person.fullName(),
          contactPhone: faker.phone.number(),
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude(),
        },
      });
    }
  }

  console.log(
    `✓ CRM: ${regions.length} regions, ${areas.length} areas, ${categories.length} categories, ${skus.length} SKUs, ${customers.length} customers, ${outletCount} outlets`,
  );
}

// =============================================
// MAIN
// =============================================

async function main() {
  console.log("🚀 Starting database seed (CRM)...\n");

  try {
    const roleIds = await seedPermissionsAndRoles();
    await seedUsers(roleIds);

    faker.seed(FAKER_SEED);
    await seedCrmData();

    console.log("\n🎉 Database seeding completed successfully!");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

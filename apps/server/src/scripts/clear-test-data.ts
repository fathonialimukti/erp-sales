// =============================================
// CLEAR TEST DATA — keeps seeder data intact
// =============================================
// Removes leftover rows created by integration/e2e tests:
//   - TEST_ROLE-* roles
//   - *@example.com test users (budget-actor-*, budget-pic-*) + their activity logs/settings
//   - "…Test…" regions / areas / SKUs / customers / outlets / vendors (null-code rows)
//   - BT-* / BP-* / AT-* / ET-* test master data
//   - test email conversations (+messages)
//
// Usage (from apps/server): bun src/scripts/clear-test-data.ts

import "dotenv/config";
import { prisma } from "../lib/prisma.js";

async function main() {
  console.log("🧹 Clearing test data...\n");

  // 1. Email conversations (cascades email_messages)
  const convos = await prisma.emailConversation.deleteMany({});
  console.log(`✓ Email conversations: ${convos.count} deleted`);

  // 2. TEST_ROLE-* roles (unlink users first, role_has_permissions cascades)
  const testRoles = await prisma.role.findMany({ where: { name: { startsWith: "TEST_ROLE-" } }, select: { id: true } });
  const testRoleIds = testRoles.map((r) => r.id);
  if (testRoleIds.length > 0) {
    await prisma.user.updateMany({ where: { roleId: { in: testRoleIds } }, data: { roleId: null } });
    const deleted = await prisma.role.deleteMany({ where: { id: { in: testRoleIds } } });
    console.log(`✓ Test roles: ${deleted.count} deleted`);
  }

  // 3. Test users (@example.com) — cascades their activity logs
  const testUsers = await prisma.user.findMany({ where: { email: { endsWith: "@example.com" } }, select: { id: true } });
  const testUserIds = testUsers.map((u) => u.id);
  if (testUserIds.length > 0) {
    await prisma.userSetting.deleteMany({ where: { userId: { in: testUserIds } } });
    const deleted = await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    console.log(`✓ Test users: ${deleted.count} deleted (activity logs cascade)`);
  }

  // 4. Guard: drop budget lines pointing at test master data before deleting it
  const orphanLines = await prisma.budgetLine.deleteMany({
    where: {
      OR: [
        { budgetType: { code: { startsWith: "BT-" } } },
        { period: { code: { startsWith: "BP-" } } },
      ],
    },
  });
  if (orphanLines.count > 0) console.log(`✓ Orphan budget lines: ${orphanLines.count} deleted`);

  // 5. Test master data (BT-* / BP-* / AT-* / ET-*)
  const bt = await prisma.budgetType.deleteMany({ where: { code: { startsWith: "BT-" } } });
  const bp = await prisma.budgetPeriod.deleteMany({ where: { code: { startsWith: "BP-" } } });
  const at = await prisma.actionType.deleteMany({ where: { code: { startsWith: "AT-" } } });
  const et = await prisma.eventType.deleteMany({ where: { code: { startsWith: "ET-" } } });
  console.log(`✓ Test master data: ${bt.count} budget types, ${bp.count} periods, ${at.count} action types, ${et.count} event types`);

  // 6. Test vendors
  const vendors = await prisma.vendor.deleteMany({ where: { code: null, name: { contains: "Test Vendor" } } });
  console.log(`✓ Test vendors: ${vendors.count} deleted`);

  // 7. Test outlets (before customers/areas — Outlet FKs are Restrict)
  const outlets = await prisma.outlet.deleteMany({ where: { code: null, name: { contains: "Test Outlet" } } });
  console.log(`✓ Test outlets: ${outlets.count} deleted`);

  // 8. Test customers
  const customers = await prisma.customer.deleteMany({ where: { code: null, name: { contains: "Test Customer" } } });
  console.log(`✓ Test customers: ${customers.count} deleted`);

  // 9. Test SKUs
  const skus = await prisma.sku.deleteMany({ where: { code: null, name: { contains: "Test SKU" } } });
  console.log(`✓ Test SKUs: ${skus.count} deleted`);

  // 10. Test areas (before regions — Area.region is Restrict)
  const areas = await prisma.area.deleteMany({ where: { code: null, name: { contains: "Test Area" } } });
  console.log(`✓ Test areas: ${areas.count} deleted`);

  // 11. Test regions
  const regions = await prisma.region.deleteMany({ where: { code: null, name: { contains: "Test Region" } } });
  console.log(`✓ Test regions: ${regions.count} deleted`);

  // --- Final state ---
  console.log("\n📊 Remaining row counts:");
  const counts: Array<[string, Promise<number>]> = [
    ["users", prisma.user.count()],
    ["roles", prisma.role.count()],
    ["permissions", prisma.permission.count()],
    ["regions", prisma.region.count()],
    ["areas", prisma.area.count()],
    ["skuCategories", prisma.skuCategory.count()],
    ["skus", prisma.sku.count()],
    ["customers", prisma.customer.count()],
    ["outlets", prisma.outlet.count()],
    ["salesOrders", prisma.salesOrder.count()],
    ["payments", prisma.payment.count()],
    ["visitLogs", prisma.visitLog.count()],
    ["actionPrograms", prisma.actionProgram.count()],
    ["eventProposals", prisma.eventProposal.count()],
    ["budgetTypes", prisma.budgetType.count()],
    ["budgetPeriods", prisma.budgetPeriod.count()],
    ["budgetLines", prisma.budgetLine.count()],
    ["actionTypes", prisma.actionType.count()],
    ["eventTypes", prisma.eventType.count()],
    ["vendors", prisma.vendor.count()],
    ["emailConversations", prisma.emailConversation.count()],
    ["activityLogs", prisma.activityLog.count()],
    ["knowledgeChunks", prisma.knowledgeChunk.count()],
  ];
  for (const [name, p] of counts) console.log(`  ${name}: ${await p}`);

  console.log("\n🎉 Test data cleared. Seeder data preserved.");
}

main()
  .catch((e) => {
    console.error("\n❌ Cleanup failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

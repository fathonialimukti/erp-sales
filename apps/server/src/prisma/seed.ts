import "dotenv/config";
import { randomUUID } from "crypto";
import { hashSync } from "bcrypt";
import { faker } from "@faker-js/faker";
import { prisma } from "../lib/prisma.js";
import { seedAppSettings } from "../lib/seed-app-settings.js";
import { cartonCount } from "@repo/schemas/sales-order";
import { PERMISSIONS, ROLES, planRolePermissions } from "./seed-access-control.js";

const FAKER_SEED = Number(process.env.SEED_SEED) || 20260519;

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
  const allPermissions = await prisma.permission.findMany({ select: { id: true, name: true } });
  // Shared with the DB-agreement test, so the assertion and the writer can
  // never encode different intent.
  const plan = planRolePermissions(allPermissions.map((p) => p.name));
  for (const role of ROLES) {
    const roleId = roleIds[role.name];
    if (!roleId) continue;
    const granted = new Set(plan.get(role.name));
    const matched = allPermissions.filter((p) => granted.has(p.name));
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

  console.log("Ensuring integration user exists...");
  const integrationEmail = process.env.ERP_INTEGRATION_EMAIL ?? "n8n@mail.com";
  const integrationPassword = process.env.ERP_INTEGRATION_PASSWORD ?? "change-me";
  const hashedIntegrationPassword = hashSync(integrationPassword, 10);

  const existingIntegration = await prisma.user.findUnique({ where: { email: integrationEmail } });
  if (existingIntegration) {
    await prisma.user.update({
      where: { id: existingIntegration.id },
      data: { name: "Integration", password: hashedIntegrationPassword, roleId: roleIds["Viewer"] },
    });
    console.log("✓ Integration user updated");
  } else {
    await prisma.user.create({
      data: {
        email: integrationEmail,
        name: "Integration",
        password: hashedIntegrationPassword,
        roleId: roleIds["Viewer"],
      },
    });
    console.log("✓ Integration user created");
  }

  console.log("Ensuring AI system user exists...");
  const aiEmail = process.env.AI_SYSTEM_EMAIL ?? "ai-system@mail.com";

  const existingAi = await prisma.user.findUnique({ where: { email: aiEmail } });
  if (existingAi) {
    await prisma.user.update({
      where: { id: existingAi.id },
      data: { name: "AI System", roleId: roleIds["System Admin"] },
    });
    console.log("✓ AI system user updated");
  } else {
    // Random password — this user never logs in, it's an audit-trail marker only
    const aiUser = await prisma.user.create({
      data: {
        email: aiEmail,
        name: "AI System",
        password: hashSync(randomUUID(), 10),
        roleId: roleIds["System Admin"],
      },
    });
    console.log(`✓ AI system user created (id: ${aiUser.id})`);
  }

  console.log("Ensuring demo users exist...");
  const demoUsers = [
    {
      email: "demo.admin@aetherglo.com",
      name: "Demo Admin",
      role: "System Admin",
      description: "Full access to users, roles, and every workflow.",
    },
    {
      email: "demo.manager@aetherglo.com",
      name: "Demo Manager",
      role: "Demo Manager",
      description: "Runs the sales operation: reviews, validates, and approves team orders.",
    },
    {
      email: "demo.supervisor@aetherglo.com",
      name: "Demo Supervisor",
      role: "Demo Supervisor",
      description: "Supervises the team: proposes and validates orders, but never approves.",
    },
    {
      email: "demo.staff@aetherglo.com",
      name: "Demo Staff",
      role: "Demo Salesperson",
      description: "Field account: creates own sales orders and records visits.",
    },
    {
      email: "demo.inbound@aetherglo.com",
      name: "Demo Inbound",
      role: "Demo Inbound Staff",
      description: "Receiving only: records incoming goods, no pricing or sales orders.",
    },
  ];
  for (const demo of demoUsers) {
    const existing = await prisma.user.findUnique({ where: { email: demo.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: demo.name,
          password: hashedPassword,
          roleId: roleIds[demo.role],
          // ponytail: Demo Admin's description is user-owned — only set when missing
          // so a customized card text survives reseeding; the other demo accounts
          // re-sync to the seed texts on every run (matches the name/password/role
          // always-update convention).
          ...(demo.name === "Demo Admin" && existing.description
            ? {}
            : { description: demo.description }),
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email: demo.email,
          name: demo.name,
          password: hashedPassword,
          roleId: roleIds[demo.role],
          description: demo.description,
        },
      });
    }
  }
  console.log(`✓ ${demoUsers.length} demo users upserted`);
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

  // SKUs — `packSize` is pcs per carton (SPEC §Data model). A packSize of 1 is
  // the piece-only escape hatch; Mixed Nuts is the seeded degenerate path, the
  // rest ship in trade cartons.
  const skuData = [
    { code: "BEV-TEA-01", name: "Green Tea 500ml", categoryId: categories[0]!.id, basePrice: 5000, packSize: 20 },
    { code: "BEV-COF-01", name: "Instant Coffee 200g", categoryId: categories[0]!.id, basePrice: 25000, packSize: 12 },
    { code: "BEV-JUI-01", name: "Orange Juice 1L", categoryId: categories[0]!.id, basePrice: 15000, packSize: 12 },
    { code: "SNK-CHP-01", name: "Potato Chips 150g", categoryId: categories[1]!.id, basePrice: 12000, packSize: 24 },
    { code: "SNK-CKY-01", name: "Chocolate Cookies 200g", categoryId: categories[1]!.id, basePrice: 18000, packSize: 20 },
    { code: "SNK-NUT-01", name: "Mixed Nuts 100g", categoryId: categories[1]!.id, basePrice: 22000, packSize: 1 },
    { code: "PRD-SHP-01", name: "Shampoo 250ml", categoryId: categories[2]!.id, basePrice: 20000, packSize: 24 },
    { code: "PRD-SOP-01", name: "Bath Soap 100g", categoryId: categories[2]!.id, basePrice: 5000, packSize: 48 },
    { code: "PRD-THP-01", name: "Toothpaste 150g", categoryId: categories[2]!.id, basePrice: 15000, packSize: 12 },
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
  const seededOutlets: SeededOutlet[] = [];
  for (const customer of customers) {
    // Each customer gets outlets in 2-3 different areas
    const numOutlets = faker.number.int({ min: 2, max: 3 });
    // Shuffle areas and pick distinct ones for this customer
    const shuffled = faker.helpers.shuffle([...areas]);
    const assignedAreas = shuffled.slice(0, numOutlets);

    for (let i = 0; i < assignedAreas.length; i++) {
      const area = assignedAreas[i]!;
      outletCount++;
      const outlet = await prisma.outlet.create({
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
      seededOutlets.push({
        id: outlet.id,
        customerId: customer.id,
        areaId: area.id,
        paymentTerms: customer.paymentTerms,
      });
    }
  }

  const seededSkus: SeededSku[] = skus.map((s) => ({
    id: s.id,
    name: s.name,
    packSize: s.packSize,
    basePrice: s.basePrice ? s.basePrice.toNumber() : 0,
  }));

  console.log(
    `✓ CRM: ${regions.length} regions, ${areas.length} areas, ${categories.length} categories, ${skus.length} SKUs, ${customers.length} customers, ${outletCount} outlets`,
  );

  await seedSalesOrders(seededSkus, seededOutlets);
}

// =============================================
// SALES ORDERS — CARTON-MULTIPLE LINES
// =============================================
// SPEC §Line semantics: quantity is stored in pieces, the carton is the
// implicit order unit. Every seeded line is built as cartons × packSize, so
// the whole-carton rule (`quantity > 0 && quantity % packSize === 0`, SPEC
// §Validation) holds by construction, and the line's `packSize` snapshot is
// written explicitly — never left to the column default.

/** PPN (Indonesian VAT) applied to every seeded line. */
const SEED_TAX_PERCENT = 11;
/** Trade discount off list price, uniform across the demo catalog. */
const SEED_DISCOUNT_PERCENT = 5;
/** Carton counts drawn for carton SKUs (packSize > 1). */
const SEED_MAX_CARTONS = 8;

type SeededSku = { id: string; name: string; packSize: number; basePrice: number };
type SeededOutlet = { id: string; customerId: string; areaId: string; paymentTerms: string | null };
type SeedApprovalStatus = "DRAFT" | "PROPOSED" | "APPROVED";

/**
 * Piece quantity for one line. Carton SKUs draw a whole carton count and
 * convert to pieces; a piece-only SKU (packSize 1) degenerates to a plain
 * piece count, still a positive multiple of its pack size.
 */
function cartonMultipleQuantity(packSize: number): number {
  return packSize > 1
    ? faker.number.int({ min: 1, max: SEED_MAX_CARTONS }) * packSize
    : faker.number.int({ min: 1, max: 24 });
}

function roundMoney(value: number): number {
  return Math.round(value);
}

async function seedSalesOrders(skus: SeededSku[], outlets: SeededOutlet[]): Promise<void> {
  console.log("🧾 Seeding sales orders (carton-multiple lines)...");

  const createdBy = await prisma.user.findUnique({
    where: { email: "admin@mail.com" },
    select: { id: true },
  });
  if (!createdBy) throw new Error("Cannot seed sales orders: admin user is missing");

  // Run-scoped counter. The `SO-SEED-####` range is deliberately outside the
  // `SO-<YYYYMMDD>-####` range the router auto-generates, so a reseed can
  // never collide with today's live counter.
  let docSeq = 0;
  let orderCount = 0;
  let lineCount = 0;

  for (const outlet of outlets) {
    const ordersPerOutlet = faker.number.int({ min: 2, max: 3 });

    for (let o = 0; o < ordersPerOutlet; o++) {
      const date = faker.date.recent({ days: 45 });
      const picked = faker.helpers.arrayElements(skus, faker.number.int({ min: 1, max: 3 }));

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;
      let grandTotal = 0;

      const items = picked.map((sku, idx) => {
        const quantity = cartonMultipleQuantity(sku.packSize);
        const unitPrice = sku.basePrice;
        const lineSubtotal = unitPrice * quantity;
        const lineDiscount = (lineSubtotal * SEED_DISCOUNT_PERCENT) / 100;
        const lineTax = ((lineSubtotal - lineDiscount) * SEED_TAX_PERCENT) / 100;
        const lineTotal = roundMoney(lineSubtotal - lineDiscount + lineTax);

        subtotal += lineSubtotal;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
        grandTotal += lineTotal;

        return {
          sortOrder: idx,
          skuId: sku.id,
          quantity,
          unitPrice,
          discountPercent: SEED_DISCOUNT_PERCENT,
          taxPercent: SEED_TAX_PERCENT,
          lineTotal,
          // SPEC §Data model: freeze the SKU's pack size onto the line.
          packSize: sku.packSize,
        };
      });

      const roll = faker.number.int({ min: 0, max: 99 });
      const approvalStatus: SeedApprovalStatus = roll < 60 ? "APPROVED" : roll < 85 ? "PROPOSED" : "DRAFT";
      const approved = approvalStatus === "APPROVED";
      docSeq += 1;

      const order = await prisma.salesOrder.create({
        data: {
          documentNumber: `SO-SEED-${String(docSeq).padStart(4, "0")}`,
          date,
          outletId: outlet.id,
          customerId: outlet.customerId,
          areaId: outlet.areaId,
          currency: "IDR",
          paymentTerms: outlet.paymentTerms,
          source: "MANUAL",
          approvalStatus,
          createdById: createdBy.id,
          proposedAt: approvalStatus !== "DRAFT" ? date : null,
          approvedById: approved ? createdBy.id : null,
          approvedAt: approved ? date : null,
          subtotal: roundMoney(subtotal),
          discountTotal: roundMoney(discountTotal),
          taxTotal: roundMoney(taxTotal),
          grandTotal: roundMoney(grandTotal),
        },
      });

      await prisma.salesOrderItem.createMany({
        data: items.map((item) => ({ ...item, salesOrderId: order.id })),
      });

      orderCount += 1;
      lineCount += items.length;
    }
  }

  console.log(`✓ ${orderCount} sales orders, ${lineCount} carton-multiple lines`);
}

/**
 * Self-review pass: read every seeded line back and assert the same invariant
 * the server's create/update gate enforces (SPEC §Validation) — positive
 * quantity, exact multiple of the line's snapshot, and the snapshot matching
 * the SKU. A broken line would be rejected at write time by T4's check, so a
 * seed that ships one is a bug, not a warning.
 */
async function verifyCartonRule(): Promise<void> {
  const items = await prisma.salesOrderItem.findMany({
    select: {
      quantity: true,
      packSize: true,
      sku: { select: { name: true, packSize: true } },
    },
  });

  let cartons = 0;
  for (const item of items) {
    const quantity = item.quantity.toNumber();

    if (item.packSize !== item.sku.packSize) {
      throw new Error(
        `Seeded line for "${item.sku.name}" has packSize ${item.packSize}, expected the SKU snapshot ${item.sku.packSize}`,
      );
    }

    const lineCartons = cartonCount(quantity, item.packSize);
    if (quantity <= 0 || !Number.isInteger(lineCartons)) {
      throw new Error(
        `Seeded line for "${item.sku.name}" is ${quantity} pcs, not a positive multiple of its carton of ${item.packSize} pcs`,
      );
    }
    cartons += lineCartons;
  }

  console.log(`✓ Carton rule holds: ${items.length} lines, ${cartons} cartons, all packSize snapshots explicit`);
}

// =============================================
// BUDGETING MASTER DATA
// =============================================

async function seedBudgetingData() {
  console.log("\n🌱 Seeding budgeting data...");

  // Master data is upserted by unique code (idempotent). actionTypes/eventTypes
  // are referenced by existing action programs / event proposals with Restrict
  // FKs — never delete them, only upsert.
  const budgetTypes = await Promise.all(
    [
      { code: "TRADE_PROMO", name: "Trade Promotion", description: "Trade promotion activities" },
      { code: "EVENT", name: "Event", description: "Event activities" },
      { code: "DISPLAY_RENTAL", name: "Display Rental", description: "Display rental activities" },
      { code: "CONSUMER_PROMO", name: "Consumer Promotion", description: "Consumer promotion activities" },
    ].map((t) =>
      prisma.budgetType.upsert({
        where: { code: t.code },
        update: { name: t.name, description: t.description },
        create: t,
      }),
    ),
  );

  const budgetPeriods = await Promise.all(
    [
      { code: "2026-Q1", name: "Q1 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-03-31") },
      { code: "2026-Q2", name: "Q2 2026", startDate: new Date("2026-04-01"), endDate: new Date("2026-06-30") },
      { code: "2026-H1", name: "H1 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-06-30") },
      { code: "2026", name: "FY 2026", startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31") },
    ].map((p) =>
      prisma.budgetPeriod.upsert({
        where: { code: p.code },
        update: { name: p.name, startDate: p.startDate, endDate: p.endDate },
        create: { ...p, status: "OPEN" },
      }),
    ),
  );

  const actionTypes = await Promise.all(
    [
      { code: "CASHIER", name: "Cashier" },
      { code: "END_GONDOLA", name: "End Gondola" },
      { code: "SPECIAL_DISPLAY", name: "Special Display" },
      { code: "DISCOUNT", name: "Discount" },
      { code: "BUNDLE", name: "Bundle" },
      { code: "FREE_ITEM", name: "Free Item" },
      { code: "REBATE", name: "Rebate" },
      { code: "LOYALTY", name: "Loyalty" },
      { code: "DISPLAY_RENTAL", name: "Display Rental" },
    ].map((t) =>
      prisma.actionType.upsert({
        where: { code: t.code },
        update: { name: t.name },
        create: t,
      }),
    ),
  );

  const eventTypes = await Promise.all(
    [
      { code: "GRAND_OPENING", name: "Grand Opening" },
      { code: "SAMPLING", name: "Sampling" },
      { code: "BAZAAR", name: "Bazaar" },
      { code: "PRODUCT_LAUNCH", name: "Product Launch" },
      { code: "SPONSORSHIP", name: "Sponsorship" },
    ].map((t) =>
      prisma.eventType.upsert({
        where: { code: t.code },
        update: { name: t.name },
        create: t,
      }),
    ),
  );

  const vendors = await Promise.all(
    [
      { code: "ORG-001", name: "Event Organizer Pro", category: "ORGANIZER", status: "ACTIVE" },
      { code: "POS-001", name: "POS Material Supply", category: "POS_MATERIAL", status: "ACTIVE" },
      { code: "CAT-001", name: "Catering Nusantara", category: "CATERING", status: "ACTIVE" },
    ].map((v) =>
      prisma.vendor.upsert({
        where: { code: v.code },
        update: { name: v.name, category: v.category, status: v.status },
        create: v,
      }),
    ),
  );

  // Budget lines: no Restrict FKs point at them (budgetLineId FKs are SetNull),
  // so wipe + recreate fresh for a deterministic idempotent seed.
  await prisma.budgetLine.deleteMany({});

  const regions = await prisma.region.findMany({ where: { code: { in: ["JKT", "BDG", "SBY"] } } });
  const areas = await prisma.area.findMany({ where: { code: { in: ["JKT-UT", "JKT-SL", "BDG-TM"] } } });
  const regionIdByCode = new Map(regions.map((r) => [r.code, r.id]));
  const areaIdByCode = new Map(areas.map((a) => [a.code, a.id]));

  const lineData = [
    { budgetTypeCode: "TRADE_PROMO", periodCode: "2026-Q1", scope: "AREA", areaCode: "JKT-UT", amount: 250_000_000 },
    { budgetTypeCode: "TRADE_PROMO", periodCode: "2026-Q1", scope: "AREA", areaCode: "JKT-SL", amount: 200_000_000 },
    { budgetTypeCode: "TRADE_PROMO", periodCode: "2026-Q1", scope: "REGION", regionCode: "JKT", amount: 800_000_000 },
    { budgetTypeCode: "EVENT", periodCode: "2026-Q1", scope: "AREA", areaCode: "BDG-TM", amount: 150_000_000 },
    { budgetTypeCode: "DISPLAY_RENTAL", periodCode: "2026-H1", scope: "REGION", regionCode: "BDG", amount: 100_000_000 },
    { budgetTypeCode: "CONSUMER_PROMO", periodCode: "2026", scope: "REGION", regionCode: "SBY", amount: 300_000_000 },
  ];

  let lineCount = 0;
  for (const line of lineData) {
    const budgetType = budgetTypes.find((t) => t.code === line.budgetTypeCode);
    const period = budgetPeriods.find((p) => p.code === line.periodCode);
    if (!budgetType || !period) throw new Error(`Budget line references missing master data: ${JSON.stringify(line)}`);
    await prisma.budgetLine.create({
      data: {
        budgetTypeId: budgetType.id,
        periodId: period.id,
        scope: line.scope,
        regionId: line.regionCode ? (regionIdByCode.get(line.regionCode) ?? null) : null,
        areaId: line.areaCode ? (areaIdByCode.get(line.areaCode) ?? null) : null,
        amount: line.amount,
        currency: "IDR",
      },
    });
    lineCount++;
  }

  console.log(
    `✓ Budgeting: ${budgetTypes.length} budget types, ${budgetPeriods.length} periods, ${lineCount} budget lines, ${actionTypes.length} action types, ${eventTypes.length} event types, ${vendors.length} vendors`,
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
    const seeded = await seedAppSettings(prisma);
    console.log(`✓ ${seeded} app setting(s) seeded (insert-only)`);

    faker.seed(FAKER_SEED);
    await seedCrmData();
    await verifyCartonRule();
    await seedBudgetingData();

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

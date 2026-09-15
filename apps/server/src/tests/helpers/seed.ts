import { prisma } from '../../lib/prisma.js';

const randomName = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 10)}`;

export const seedPermission = async (name: string, description?: string) => {
  return prisma.permission.upsert({
    where: { name },
    create: { name, description: description ?? null },
    update: {},
  });
};

export const seedRoleWithPermissions = async (permissions: string[]) => {
  const role = await prisma.role.create({
    data: {
      name: randomName('TEST_ROLE'),
      description: 'Generated test role',
    },
  });

  for (const permissionName of permissions) {
    const permission = await seedPermission(permissionName);
    await prisma.roleHasPermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }

  return role;
};

export const seedTestActor = async (permissions: string[]) => {
  const role = await seedRoleWithPermissions(permissions);
  const user = await seedTestUser({
    roleId: role.id,
    email: `${randomName('actor')}@example.com`,
    name: 'Test Actor',
  });

  return { user, role };
};

export const deleteTestPermission = async (permissionId: string) => {
  await prisma.permission.delete({ where: { id: permissionId } });
};

export const seedTestUser = async (options: {
  roleId: string;
  email?: string;
  name?: string;
  password?: string;
  description?: string;
}) => {
  const user = await prisma.user.create({
    data: {
      name: options.name ?? randomName('TEST_USER'),
      email: options.email ?? `${randomName('TEST_USER')}@example.com`,
      password: options.password ?? 'Test1234!',
      roleId: options.roleId,
      description: options.description ?? null,
    },
  });

  return user;
};

export const seedTestSku = async () => {
  return prisma.sku.create({
    data: {
      name: randomName('TEST_SKU'),
      description: 'Test SKU for integration tests',
      baseUnit: 'kg',
    },
  });
};

export const deleteTestUser = async (userId: string) => {
  await prisma.user.delete({ where: { id: userId } });
};

export const deleteTestRole = async (roleId: string) => {
  await prisma.role.delete({ where: { id: roleId } });
};

export const deleteTestSku = async (skuId: string) => {
  await prisma.sku.delete({ where: { id: skuId } });
};

// --- CRM Helpers ---

export const seedTestRegion = async () => {
  return prisma.region.create({
    data: { name: randomName('TEST_REGION'), code: randomName('R') },
  });
};

export const deleteTestRegion = async (id: string) => {
  await prisma.region.delete({ where: { id } }).catch(() => {});
};

export const seedTestArea = async (regionId: string) => {
  return prisma.area.create({
    data: { name: randomName('TEST_AREA'), code: randomName('A'), regionId },
  });
};

export const deleteTestArea = async (id: string) => {
  await prisma.area.delete({ where: { id } }).catch(() => {});
};

export const seedTestCustomer = async () => {
  return prisma.customer.create({
    data: { name: randomName('TEST_CUSTOMER'), status: 'ACTIVE' },
  });
};

export const deleteTestCustomer = async (id: string) => {
  await prisma.customer.delete({ where: { id } }).catch(() => {});
};

export const seedTestOutlet = async (customerId: string, areaId: string) => {
  return prisma.outlet.create({
    data: { name: randomName('TEST_OUTLET'), customerId, areaId, status: 'ACTIVE' },
  });
};

export const deleteTestOutlet = async (id: string) => {
  await prisma.outlet.delete({ where: { id } }).catch(() => {});
};

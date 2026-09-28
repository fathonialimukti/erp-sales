import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../lib/prisma.js';
import { deleteTestRole, deleteTestUser, seedRoleWithPermissions, seedTestUser } from '../helpers/seed.js';

/**
 * What happens to a row when the user it points at is deleted.
 *
 * `Notification.createdById`, `SalesOrder.approvedById`, `VisitLog.approvedById`,
 * `User.roleId` and `User.areaId` are all optional references, so the intended
 * referential action is SET NULL — the row survives, the pointer clears. Prisma
 * applies that default silently, so the schema reads as if these columns had no
 * referential action at all, and reading `pg_constraint` is the only way to
 * confirm what is actually enforced. When the wrong action reaches the database
 * the failure is loud but rare: ~30 test teardowns call `prisma.user.delete`, and
 * a notification's creator is enough to block all of them.
 *
 * The schema now states `onDelete: SetNull` on all five (see `schema.prisma`), so
 * this file is the guard that the statement stays true. It reads the live
 * database, like `seed-access-control.test.ts`.
 */

/** The five optional user references, and the action each must enforce. */
const USER_REFERENCES = [
  { constraint: 'notifications_created_by_id_fkey', table: 'notifications' },
  { constraint: 'crm_sales_orders_approved_by_id_fkey', table: 'crm_sales_orders' },
  { constraint: 'crm_visit_logs_approved_by_id_fkey', table: 'crm_visit_logs' },
  { constraint: 'users_role_id_fkey', table: 'users' },
  { constraint: 'users_area_id_fkey', table: 'users' },
] as const;

type FkRow = { conname: string; delete_action: string };

async function deleteActionFor(constraint: string): Promise<string | null> {
  // confdeltype: a = NO ACTION, r = RESTRICT, c = CASCADE, n = SET NULL
  const rows = await prisma.$queryRaw<FkRow[]>`
    SELECT conname, CASE confdeltype
      WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'    WHEN 'n' THEN 'SET NULL'
      ELSE confdeltype::text END AS delete_action
    FROM pg_constraint
    WHERE conname = ${constraint} AND connamespace = current_schema()::regnamespace
  `;
  return rows[0]?.delete_action ?? null;
}

describe('optional user references are deleted with SET NULL', () => {
  it.each(USER_REFERENCES)('$constraint enforces SET NULL, not NO ACTION', async ({ constraint }) => {
    expect(await deleteActionFor(constraint)).toBe('SET NULL');
  });
});

describe('deleting a user who created a notification', () => {
  let roleId = '';
  let creatorId = '';
  let recipientId = '';
  let notificationId = '';

  beforeAll(async () => {
    const role = await seedRoleWithPermissions([]);
    roleId = role.id;
    const creator = await seedTestUser({ roleId, name: 'FK Test Creator' });
    const recipient = await seedTestUser({ roleId, name: 'FK Test Recipient' });
    creatorId = creator.id;
    recipientId = recipient.id;

    const notification = await prisma.notification.create({
      data: {
        userId: recipientId,
        createdById: creatorId,
        title: 'FK regression fixture',
        message: 'Deleted with its creator to prove SET NULL.',
      },
    });
    notificationId = notification.id;
  });

  afterAll(async () => {
    // Own-row teardown, no swallow: the notification cascades from the recipient,
    // but deleting it explicitly keeps the failure mode of a broken cascade loud.
    // `creatorId` is gone by design — the test deleted it.
    await prisma.notification.deleteMany({ where: { id: notificationId } });
    await deleteTestUser(recipientId);
    await deleteTestRole(roleId);
  });

  it('succeeds', async () => {
    await expect(prisma.user.delete({ where: { id: creatorId } })).resolves.toMatchObject({ id: creatorId });
  });

  it('leaves the notification in place with a null creator', async () => {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    expect(notification).not.toBeNull();
    expect(notification?.createdById).toBeNull();
    // The recipient's copy is untouched — only the author pointer cleared.
    expect(notification?.userId).toBe(recipientId);
  });
});

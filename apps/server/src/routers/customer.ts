import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildUpdateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { buildPaginationMeta, buildPaginationParams, buildTextSearchWhere } from '../lib/list-query.js';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../prisma/generated/client.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import * as z from 'zod';
import { createCustomerSchema, updateCustomerSchema, customerIdSchema } from '@repo/schemas/customer';
import { createCustomerContactSchema, updateCustomerContactSchema, customerContactIdSchema } from '@repo/schemas/customer-contact';

export const customerRouter = router({
  list: protectedProcedure
    .use(hasPermission('customer@read'))
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { page, limit, skip } = buildPaginationParams(input);
      const where: Prisma.CustomerWhereInput = buildTextSearchWhere(input?.search, ['name', 'code', 'taxId'] as const) || {};

      const [data, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { outlets: true, salesOrders: true, contacts: true } },
          },
        }),
        prisma.customer.count({ where }),
      ]);

      return { data, meta: buildPaginationMeta({ page, limit, total }) };
    }),

  detail: protectedProcedure
    .use(hasPermission('customer@read'))
    .input(customerIdSchema)
    .query(async ({ input }) => {
      const record = await prisma.customer.findUnique({
        where: { id: input.id },
        include: {
          outlets: {
            select: { id: true, name: true, code: true, area: { select: { id: true, name: true } } },
          },
          contacts: {
            select: { id: true, name: true, title: true, email: true, phone: true, isPrimary: true },
            orderBy: { isPrimary: 'desc' },
          },
        },
      });
      if (!record) throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found.' });
      return record;
    }),

  create: protectedProcedure
    .use(hasPermission('customer@create'))
    .input(createCustomerSchema)
    .mutation(async ({ input, ctx }) => {
      const created = await prisma.customer.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'customer',
        resourceId: created.id,
        message: `Created customer ${created.name}`,
        detail: buildCreateLogDetail(created),
      });

      return created;
    }),

  update: protectedProcedure
    .use(hasPermission('customer@update'))
    .input(updateCustomerSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.customer.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found.' });

      const updated = await prisma.customer.update({ where: { id: currentId }, data });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'customer',
        resourceId: updated.id,
        message: `Updated customer ${updated.name}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  delete: protectedProcedure
    .use(hasPermission('customer@delete'))
    .input(customerIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.customer.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found.' });

      await prisma.customer.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'customer',
        resourceId: existing.id,
        message: `Deleted customer ${existing.name}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),

  // --- Customer Contacts (nested) ---

  createContact: protectedProcedure
    .use(hasPermission('customer@create'))
    .input(createCustomerContactSchema)
    .mutation(async ({ input, ctx }) => {
      const contact = await prisma.customerContact.create({ data: input });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'customer_contact',
        resourceId: contact.id,
        message: `Added contact ${contact.name} for customer`,
        detail: buildCreateLogDetail(contact),
      });

      return contact;
    }),

  updateContact: protectedProcedure
    .use(hasPermission('customer@update'))
    .input(updateCustomerContactSchema)
    .mutation(async ({ input, ctx }) => {
      const { currentId, ...data } = input;
      const existing = await prisma.customerContact.findUnique({ where: { id: currentId } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found.' });

      const updated = await prisma.customerContact.update({ where: { id: currentId }, data });

      await logActivity(prisma, {
        action: 'UPDATE',
        userId: ctx.user.userId,
        resource: 'customer_contact',
        resourceId: updated.id,
        message: `Updated contact ${updated.name}`,
        detail: buildUpdateLogDetail(existing, updated),
      });

      return updated;
    }),

  deleteContact: protectedProcedure
    .use(hasPermission('customer@delete'))
    .input(customerContactIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.customerContact.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Contact not found.' });

      await prisma.customerContact.delete({ where: { id: input.id } });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'customer_contact',
        resourceId: existing.id,
        message: `Removed contact ${existing.name}`,
        detail: buildDeleteLogDetail(existing),
      });

      return { success: true };
    }),
});
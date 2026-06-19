import { TRPCError } from '@trpc/server';
import { logActivity } from '../lib/activity-log.js';
import { buildCreateLogDetail, buildDeleteLogDetail } from '../lib/log-detail.js';
import { prisma } from '../lib/prisma.js';
import { hasPermission, protectedProcedure, router } from '../trpc.js';
import { createPaymentSchema, paymentIdSchema } from '@repo/schemas/payment';

export const paymentRouter = router({
  create: protectedProcedure
    .use(hasPermission('payment@create'))
    .input(createPaymentSchema)
    .mutation(async ({ input, ctx }) => {
      const { date, ...rest } = input;

      const created = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: { ...rest, date: date ? new Date(date) : new Date() },
        });

        // Recalculate balance_due on the invoice
        const allPayments = await tx.payment.findMany({
          where: { invoiceId: input.invoiceId },
          select: { amount: true },
        });
        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId }, select: { grandTotal: true } });
        const balanceDue = invoice ? Number(invoice.grandTotal) - totalPaid : 0;

        await tx.invoice.update({
          where: { id: input.invoiceId },
          data: {
            balanceDue,
            status: balanceDue <= 0 ? 'PAID' : 'PARTIAL',
          },
        });

        return payment;
      });

      await logActivity(prisma, {
        action: 'CREATE',
        userId: ctx.user.userId,
        resource: 'payment',
        resourceId: created.id,
        message: `Recorded payment of ${created.amount}`,
        detail: buildCreateLogDetail(created as unknown as Record<string, unknown>),
      });

      return created;
    }),

  delete: protectedProcedure
    .use(hasPermission('payment@delete'))
    .input(paymentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.payment.findUnique({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found.' });

      await prisma.$transaction(async (tx) => {
        await tx.payment.delete({ where: { id: input.id } });

        // Recalculate balance_due
        const allPayments = await tx.payment.findMany({
          where: { invoiceId: existing.invoiceId },
          select: { amount: true },
        });
        const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const invoice = await tx.invoice.findUnique({ where: { id: existing.invoiceId }, select: { grandTotal: true } });
        const balanceDue = invoice ? Number(invoice.grandTotal) - totalPaid : 0;

        await tx.invoice.update({
          where: { id: existing.invoiceId },
          data: { balanceDue, status: balanceDue <= 0 ? 'PAID' : 'PARTIAL' },
        });
      });

      await logActivity(prisma, {
        action: 'DELETE',
        userId: ctx.user.userId,
        resource: 'payment',
        resourceId: existing.id,
        message: `Deleted payment of ${existing.amount}`,
        detail: buildDeleteLogDetail(existing as unknown as Record<string, unknown>),
      });

      return { success: true };
    }),
});
import { publicProcedure, router } from './trpc.js';
import { authRouter } from './routers/auth.js';
import { dashboardRouter } from './routers/dashboard.js';
import { landingRouter } from './routers/landing.js';
import { regionRouter } from './routers/region.js';
import { areaRouter } from './routers/area.js';
import { customerRouter } from './routers/customer.js';
import { outletRouter } from './routers/outlet.js';
import { skuCategoryRouter } from './routers/sku-category.js';
import { skuRouter } from './routers/sku.js';
import { salesOrderRouter } from './routers/sales-order.js';
import { visitLogRouter } from './routers/visit-log.js';
import { paymentRouter } from './routers/payment.js';
import { actionProgramRouter } from './routers/action-program.js';
import { eventProposalRouter } from './routers/event-proposal.js';
import { userRouter } from './routers/user.js';
import { accessControlRouter } from './routers/access-control.js';
import { activityLogRouter } from './routers/activity-log.js';
import { notificationRouter } from './routers/notification.js';

export const appRouter = router({
    hello: publicProcedure.query(() => ({ message: 'Hello World' })),
    auth: authRouter,
    dashboard: dashboardRouter,
    landing: landingRouter,
    region: regionRouter,
    area: areaRouter,
    customer: customerRouter,
    outlet: outletRouter,
    skuCategory: skuCategoryRouter,
    sku: skuRouter,
    salesOrder: salesOrderRouter,
    visitLog: visitLogRouter,
    payment: paymentRouter,
    actionProgram: actionProgramRouter,
    eventProposal: eventProposalRouter,
    user: userRouter,
    accessControl: accessControlRouter,
    activityLog: activityLogRouter,
    notification: notificationRouter,
});

export type AppRouter = typeof appRouter;

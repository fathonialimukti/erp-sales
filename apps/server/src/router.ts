import { publicProcedure, router } from './trpc.js';
import { authRouter } from './routers/auth.js';
import { dashboardRouter } from './routers/dashboard.js';
import { regionRouter } from './routers/region.js';
import { areaRouter } from './routers/area.js';
import { customerRouter } from './routers/customer.js';
import { outletRouter } from './routers/outlet.js';
import { skuCategoryRouter } from './routers/sku-category.js';
import { skuRouter } from './routers/sku.js';
import { salesOrderRouter } from './routers/sales-order.js';
import { visitLogRouter } from './routers/visit-log.js';
import { actionProgramRouter } from './routers/action-program.js';
import { eventProposalRouter } from './routers/event-proposal.js';
import { userRouter } from './routers/user.js';
import { accessControlRouter } from './routers/access-control.js';
import { activityLogRouter } from './routers/activity-log.js';
import { applicationLogRouter } from './routers/applicationLog.js';
import { systemLogRouter } from './routers/system-log.js';
import { notificationRouter } from './routers/notification.js';
import { reportingRouter } from './routers/reporting.js';
import { emailCrmRouter } from './routers/email-crm.js';
import { knowledgeBaseRouter } from './routers/knowledge-base.js';
import { settingsRouter, userSettingsRouter } from './routers/settings.js';
import { budgetTypeRouter } from './routers/budget-type.js';
import { budgetPeriodRouter } from './routers/budget-period.js';
import { budgetLineRouter } from './routers/budget-line.js';
import { budgetRouter } from './routers/budget.js';
import { actionTypeRouter } from './routers/action-type.js';
import { eventTypeRouter } from './routers/event-type.js';
import { vendorRouter } from './routers/vendor.js';
import { backupRouter } from './routers/backup.js';
import { aiChatRouter } from './routers/ai-chat.js';

export const appRouter = router({
    hello: publicProcedure.query(() => ({ message: 'Hello World' })),
    auth: authRouter,
    dashboard: dashboardRouter,
    region: regionRouter,
    area: areaRouter,
    customer: customerRouter,
    outlet: outletRouter,
    skuCategory: skuCategoryRouter,
    sku: skuRouter,
    salesOrder: salesOrderRouter,
    visitLog: visitLogRouter,
    actionProgram: actionProgramRouter,
    eventProposal: eventProposalRouter,
    user: userRouter,
    accessControl: accessControlRouter,
    activityLog: activityLogRouter,
    applicationLog: applicationLogRouter,
    systemLog: systemLogRouter,
    notification: notificationRouter,
    reporting: reportingRouter,
    emailCrm: emailCrmRouter,
    knowledgeBase: knowledgeBaseRouter,
    settings: settingsRouter,
    userSettings: userSettingsRouter,
    budgetType: budgetTypeRouter,
    budgetPeriod: budgetPeriodRouter,
    budgetLine: budgetLineRouter,
    budget: budgetRouter,
    actionType: actionTypeRouter,
    eventType: eventTypeRouter,
    vendor: vendorRouter,
    backup: backupRouter,
    aiChat: aiChatRouter,
});

export type AppRouter = typeof appRouter;

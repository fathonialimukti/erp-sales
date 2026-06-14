import { publicProcedure, router } from './trpc.js';
import { authRouter } from './routers/auth.js';
import { dashboardRouter } from './routers/dashboard.js';
import { landingRouter } from './routers/landing.js';

export const appRouter = router({
    hello: publicProcedure.query(() => ({ message: 'Hello World' })),
    auth: authRouter,
    dashboard: dashboardRouter,
    landing: landingRouter,
});

export type AppRouter = typeof appRouter;

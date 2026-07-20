import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import { createContext } from './context.js';
import { serveUpload } from './lib/upload-file.js';
import { appRouter } from './router.js';
import { aiChatHandler, aiChatResumeHandler, aiQueryDatabaseHandler, aiSummarizeHandler, aiDraftHandler } from './routes/ai.js';
import { aiAdminChatHandler, aiAdminChatResumeHandler } from './routes/ai-admin.js';
import { aiExtractSalesOrderHandler } from './routes/ai-extract.js';
import { customerAiChatHandler } from './routes/customer-ai.js';
import { salesOrderPdfHandler } from './routes/sales-order-pdf.js';
import { emailInboundHandler } from './routes/email-inbound.js';
import { emailAutoReplyHandler } from './routes/email-auto-reply.js';

const port = Number(process.env.PORT ?? 10022);
const corsOrigin = process.env.CORS_ORIGIN;
const isDev = process.env.NODE_ENV !== 'production';

const isAllowedDevOrigin = (origin: string) =>
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || origin === 'tauri://localhost';

console.log('Starting tRPC server on port', port);

const app = express();

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (corsOrigin && origin === corsOrigin) return callback(null, true);
            if (isDev && isAllowedDevOrigin(origin)) return callback(null, true);

            return callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: '10mb' }));
app.use(serveUpload);

app.use(
    '/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext,
    })
);

app.post('/api/ai/chat', aiChatHandler);
app.get('/api/ai/chat/:chatId/stream', aiChatResumeHandler);
app.post('/api/ai/query', aiQueryDatabaseHandler);
app.post('/api/ai/extract-sales-order', aiExtractSalesOrderHandler);
app.post('/api/ai/summarize', aiSummarizeHandler);
app.post('/api/ai/draft', aiDraftHandler);

app.post('/api/ai/admin/chat', aiAdminChatHandler);
app.get('/api/ai/admin/chat/:chatId/stream', aiAdminChatResumeHandler);

app.post('/api/ai/customer/chat', customerAiChatHandler);

app.post('/api/email/auto-reply', emailAutoReplyHandler);
app.post('/api/email/inbound', emailInboundHandler);

// Sales order PDF preview — streams inline so the browser's native
// PDF viewer renders it (preview + print + download).
app.get('/api/sales-order/:id/pdf', salesOrderPdfHandler);

app.listen(port, '0.0.0.0');
console.log(`✓ tRPC server listening on http://0.0.0.0:${port}/trpc/`);

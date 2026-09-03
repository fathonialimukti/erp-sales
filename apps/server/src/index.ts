import express from 'express';
import { randomUUID } from 'node:crypto';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import { createContext } from './context.js';
import { serveUpload } from './lib/upload-file.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';
import { healthHandler, readyHandler } from './routes/health.js';
import { appRouter } from './router.js';
import { aiChatHandler, aiChatResumeHandler, aiQueryDatabaseHandler, aiSummarizeHandler, aiDraftHandler } from './routes/ai.js';
import { aiAdminChatHandler, aiAdminChatResumeHandler } from './routes/ai-admin.js';
import { aiExtractSalesOrderHandler } from './routes/ai-extract.js';
import { aiFormFillHandler } from './routes/ai-form-fill.js';
import { aiVisitLogOrderHandler } from './routes/ai-visit-log-order.js';
import { aiSummarizeRecordHandler } from './routes/ai-summarize-record.js';
import { aiRejectionFixHandler } from './routes/ai-rejection-fix.js';
import { aiReportNarrateHandler } from './routes/ai-report-narrate.js';
import { aiCustomer360Handler } from './routes/ai-customer-360.js';
import { aiDuplicateCheckHandler } from './routes/ai-duplicate-check.js';
import { aiKbWriterHandler } from './routes/ai-kb-writer.js';
import { customerAiChatHandler } from './routes/customer-ai.js';
import { salesOrderPdfHandler } from './routes/sales-order-pdf.js';
import { emailInboundHandler } from './routes/email-inbound.js';
import { emailAutoReplyHandler } from './routes/email-auto-reply.js';
import { validateEnv } from './lib/env-validate.js';
import { checkMigrations } from './lib/migration-check.js';

const port = Number(process.env.PORT ?? 10022);
const corsOrigin = process.env.CORS_ORIGIN;
const isDev = process.env.NODE_ENV !== 'production';

const isAllowedDevOrigin = (origin: string) =>
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || origin === 'tauri://localhost';

const app = express();

app.use(
    cors({
        origin: (origin, callback) => {
            // No Origin header (curl, same-origin, server-to-server) → allow.
            if (!origin) return callback(null, true);
            if (corsOrigin && origin === corsOrigin) return callback(null, true);
            if (isAllowedDevOrigin(origin)) return callback(null, true);

            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
    })
);

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Request ID propagation
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id']?.toString() ?? randomUUID();
    res.setHeader('X-Request-Id', requestId);
    (req as any).requestId = requestId;
    next();
});

app.use('/api/ai/*', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(serveUpload);

app.use(
    '/trpc/v1',
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
app.post('/api/ai/form-fill', aiFormFillHandler);
app.post('/api/ai/visit-log-order', aiVisitLogOrderHandler);
app.post('/api/ai/summarize-record', aiSummarizeRecordHandler);
app.post('/api/ai/rejection-fix', aiRejectionFixHandler);
app.post('/api/ai/report-narrate', aiReportNarrateHandler);
app.post('/api/ai/customer-360', aiCustomer360Handler);
app.post('/api/ai/duplicate-check', aiDuplicateCheckHandler);
app.post('/api/ai/kb-writer', aiKbWriterHandler);

app.post('/api/ai/admin/chat', aiAdminChatHandler);
app.get('/api/ai/admin/chat/:chatId/stream', aiAdminChatResumeHandler);

app.post('/api/ai/customer/chat', customerAiChatHandler);

app.post('/api/email/auto-reply', emailAutoReplyHandler);
app.post('/api/email/inbound', emailInboundHandler);

// Sales order PDF preview — streams inline so the browser's native
// PDF viewer renders it (preview + print + download).
app.get('/api/sales-order/:id/pdf', salesOrderPdfHandler);

// Health check endpoints
app.get('/healthz', healthHandler);
app.get('/readyz', readyHandler);

validateEnv();
checkMigrations();

const server = app.listen(port, '0.0.0.0', () => {
    logger.info(`Server listening on port ${port}`);
});

server.requestTimeout = 30_000;
server.keepAliveTimeout = 65_000;

const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
        prisma.$disconnect().then(() => {
            logger.info('Server closed, Prisma disconnected');
            process.exit(0);
        });
    });
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

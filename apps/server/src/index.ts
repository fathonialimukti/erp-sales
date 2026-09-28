import express from 'express';
import { randomUUID } from 'node:crypto';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import cors from 'cors';
import compression from 'compression';
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
import { backupUploadErrorHandler, backupUploadHandler } from './routes/backup-upload.js';
import { emailInboundHandler } from './routes/email-inbound.js';
import { emailAutoReplyHandler } from './routes/email-auto-reply.js';
import { clientLogHandler } from './routes/client-log.js';
import { validateEnv } from './lib/env-validate.js';
import { checkMigrations } from './lib/migration-check.js';
import { startAppLogRetention, logApp } from './lib/app-log.js';
import { isOriginAllowed, parseAllowedOrigins } from './lib/cors-origin.js';

const app = express();

// Behind a reverse proxy (nginx/Cloudflare) so req IPs come from
// X-Forwarded-For instead of the proxy socket — keeps login rate
// limiting per real client.
app.set('trust proxy', 1);

// gzip/brotli JSON + tRPC responses (API payloads compress ~70-90%).
app.use(compression());

// CORS_ORIGIN may list multiple origins, comma-separated.
const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);

app.use(
    cors({
        origin: (origin, callback) => {
            if (isOriginAllowed(origin, allowedOrigins)) return callback(null, true);
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
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Lock down browser features we don't use.
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    // The API serves JSON/SSE/PDF only — deny everything scriptable.
    // This header covers the API origin only; the Vite/Tauri client is a
    // separate origin and needs its own CSP.
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    next();
});

// Uploaded files (including SVG) run in a sandboxed unique origin —
// mitigates stored XSS via crafted SVG/HTML uploads.
app.use('/uploads', (req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    next();
});

// Request ID propagation
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id']?.toString() ?? randomUUID();
    res.setHeader('X-Request-Id', requestId);
    (req as any).requestId = requestId;
    next();
});

// HTTP access log (stdout → pm2 file; high-volume, intentionally not in app_logs)
app.use((req, res, next) => {
    if (req.path === '/healthz' || req.path === '/readyz') return next();
    const start = Date.now();
    res.on('finish', () => {
        logger.info(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode}`, {
            requestId: (req as any).requestId,
            durationMs: Date.now() - start,
        });
    });
    next();
});

// Client-side error reports → app_logs (visible in System Logs viewer).
// Registered BEFORE the global 10mb parser so its own 16kb cap is effective.
app.post('/api/log/client', express.json({ limit: '16kb' }), clientLogHandler);

// Backup file upload — backup envelopes exceed the global 10mb cap, so it gets
// its own scoped 100mb parser. Registered BEFORE the global parser so the
// scoped limit applies to this route (same pattern as the client-log route).
app.post(
    '/api/backups/upload',
    express.json({ limit: '100mb' }),
    backupUploadHandler,
    backupUploadErrorHandler
);

app.use(/^\/api\/ai/, express.json({ limit: '1mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(serveUpload);

app.use(
    '/trpc/v1',
    createExpressMiddleware({
        router: appRouter,
        createContext,
        onError: ({ error, req }) => {
            // Expected client-side outcomes (NOT_FOUND, FORBIDDEN, …) stay on
            // stdout only — DB-logging them would flood the System Logs viewer.
            if (error.code === 'INTERNAL_SERVER_ERROR') {
                logApp({
                    level: 'ERROR',
                    module: 'trpc',
                    message: `${error.code}: ${error.message.slice(0, 500)}`,
                    requestId: (req as any).requestId,
                });
            } else {
                logger.info(`tRPC ${error.code}: ${error.message.slice(0, 300)}`, {
                    requestId: (req as any).requestId,
                });
            }
        },
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

// Fail fast on invalid configuration BEFORE binding the port.
const env = validateEnv();
checkMigrations();
startAppLogRetention();

const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Server listening on port ${env.PORT}`, { nodeEnv: env.NODE_ENV });
});

server.requestTimeout = 30_000;
server.keepAliveTimeout = 65_000;

// Crash the process on unexpected async failures instead of continuing in an
// undefined state — pm2 restarts and /readyz flips back once healthy.
process.on('uncaughtException', (error) => {
    logger.error('uncaughtException, shutting down', { error: error.stack ?? error.message });
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { error: reason instanceof Error ? reason.stack : String(reason) });
});

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

import type { Request, Response } from 'express';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import {
    streamText,
    createUIMessageStream,
    pipeUIMessageStreamToResponse,
    convertToModelMessages,
    stepCountIs,
    tool,
} from 'ai';
import * as z from 'zod';
import { chatModel } from '../lib/ai-provider.js';
import { retrieveRelevantChunks } from '../lib/rag.js';
import { clientTools, serverTools } from '../lib/ai-tools.js';
import { prisma } from '../lib/prisma.js';
import { getJwtSecret } from '../lib/jwt-secret.js';

const JWT_SECRET = getJwtSecret();

const ROUTE_CATALOG = `
- Dashboard: /dashboard
- Region: list /region, create /region/create, detail /region/:id, edit /region/:id/edit
- Area: list /area, create /area/create, detail /area/:id, edit /area/:id/edit
- Customer: list /customer, create /customer/create, detail /customer/:id, edit /customer/:id/edit
- Outlet: list /outlet, create /outlet/create, detail /outlet/:id, edit /outlet/:id/edit
- SKU Category: list /sku-category, create /sku-category/create, detail /sku-category/:id, edit /sku-category/:id/edit
- SKU: list /sku, create /sku/create, detail /sku/:id, edit /sku/:id/edit
- Sales Order: list /sales-order, create /sales-order/create, detail /sales-order/:id, edit /sales-order/:id/edit
- Visit Log: list /visit-log, create /visit-log/create, detail /visit-log/:id
- Action Program: list /action-program, create /action-program/create, detail /action-program/:id, edit /action-program/:id/edit
- Event Proposal: list /event-proposal, create /event-proposal/create, detail /event-proposal/:id, edit /event-proposal/:id/edit
- Users: list /users, create /users/create, detail /users/:id, edit /users/:id/edit
- Roles: list /access-control, create /access-control/create, detail /access-control/:id, edit /access-control/:id/edit
- Activity logs: list /activity-logs, detail /activity-logs/:id
- Notifications: list /notifications
`.trim();

const MAX_HISTORY_TURNS = 20;

// ---- DDL keywords blocked for admin queries ----
const BLOCKED_DDL_KEYWORDS = [
    'DROP TABLE',
    'ALTER TABLE',
    'CREATE TABLE',
    'TRUNCATE',
    'GRANT',
    'REVOKE',
    'CREATE INDEX',
    'DROP INDEX',
    'CREATE SCHEMA',
    'DROP SCHEMA',
    'CREATE DATABASE',
    'DROP DATABASE',
    'CREATE VIEW',
    'DROP VIEW',
    'CREATE FUNCTION',
    'DROP FUNCTION',
    'CREATE PROCEDURE',
    'DROP PROCEDURE',
    'CREATE TRIGGER',
    'DROP TRIGGER',
    'ALTER INDEX',
    'ALTER SCHEMA',
    'CREATE EXTENSION',
    'DROP EXTENSION',
    'VACUUM',
    'REINDEX',
    'CLUSTER',
    'ANALYZE',
];

function validateAdminSql(sql: string): { valid: boolean; reason?: string } {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    if (!upper) {
        return { valid: false, reason: 'SQL query is empty.' };
    }

    // Must start with SELECT, INSERT, UPDATE, DELETE, WITH, or EXPLAIN
    const allowedPrefixes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH', 'EXPLAIN'];
    const startsWithAllowed = allowedPrefixes.some(prefix => upper.startsWith(prefix));
    if (!startsWithAllowed) {
        return { valid: false, reason: 'Only SELECT, INSERT, UPDATE, DELETE, WITH (CTE), and EXPLAIN queries are allowed.' };
    }

    // Block comments
    if (trimmed.includes('--') || trimmed.includes('/*')) {
        return { valid: false, reason: 'Comments are not allowed in queries.' };
    }

    // Block multi-statement (semicolons outside string literals)
    const normalized = trimmed.replace(/;\s*$/, '');
    let inQuote = false;
    let semicolonCount = 0;
    for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] === "'" && (i === 0 || normalized[i - 1] !== '\\')) {
            inQuote = !inQuote;
        } else if (normalized[i] === ';' && !inQuote) {
            semicolonCount++;
        }
    }
    if (semicolonCount > 0) {
        return { valid: false, reason: 'Multiple statements are not allowed.' };
    }

    // Block DDL keywords
    const withoutStrings = trimmed.replace(/'(?:[^'\\]|\\.)*'/g, "''");
    const upperNoStrings = withoutStrings.toUpperCase();

    for (const keyword of BLOCKED_DDL_KEYWORDS) {
        if (upperNoStrings.includes(keyword)) {
            return { valid: false, reason: `DDL operation rejected: ${keyword} is not allowed.` };
        }
    }

    return { valid: true };
}

function formatAdminQueryResult(data: unknown, rowCount: number): string {
    return JSON.stringify(
        {
            success: true,
            rowCount,
            data,
        },
        (_key, value) => {
            if (value && typeof value === 'object' && typeof (value as any).toNumber === 'function') {
                return (value as any).toNumber();
            }
            if (typeof value === 'bigint') return value.toString();
            if (typeof value === 'string' && value.length > 500) {
                return value.slice(0, 500) + '... [truncated]';
            }
            return value;
        },
    );
}

const queryDatabaseAdmin = tool({
    description:
        'Execute a SQL query against the database with full read-write access. ' +
        'Supports SELECT, INSERT, UPDATE, and DELETE. ' +
        'DDL operations (DROP TABLE, ALTER TABLE, CREATE TABLE, TRUNCATE, etc.) are BLOCKED. ' +
        'WARNING: Write operations are IRREVERSIBLE. Always confirm with the user before executing INSERT/UPDATE/DELETE. ' +
        'Use PostgreSQL syntax with snake_case table and column names. ' +
        'Show the SQL to the user before calling this tool for any write operation. ' +
        'CRM tables use the prefix "crm_" (e.g. crm_sales_orders, crm_customers, crm_outlets). ' +
        'All IDs are ULID strings (26 characters).',
    inputSchema: z.object({
        sql: z
            .string()
            .describe(
                'SQL query (SELECT, INSERT, UPDATE, or DELETE). ' +
                'Use PostgreSQL syntax with snake_case identifiers. ' +
                'Example: UPDATE crm_sales_orders SET approval_status = \'APPROVED\' WHERE id = \'01J...\'',
            ),
    }),
    execute: async ({ sql }) => {
        const validation = validateAdminSql(sql);
        if (!validation.valid) {
            return { success: false, error: 'Query rejected', message: validation.reason };
        }

        try {
            const result = await prisma.$queryRawUnsafe(sql);
            const upper = sql.trim().toUpperCase();

            if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('EXPLAIN')) {
                const rows = Array.isArray(result) ? result : [];
                return JSON.parse(formatAdminQueryResult(rows, rows.length));
            }

            // For INSERT/UPDATE/DELETE, return affected row count
            const affectedRows = typeof result === 'number' ? result : (Array.isArray(result) ? result.length : 0);
            return {
                success: true,
                operation: upper.split(/\s+/)[0]!,
                affectedRows,
                message: `${upper.split(/\s+/)[0]} executed successfully. ${affectedRows} row(s) affected.`,
            };
        } catch (error) {
            return {
                success: false,
                error: 'Query failed',
                message: error instanceof Error ? error.message : 'Unknown error',
                hint: 'Check SQL syntax. Ensure table and column names match the database schema. Use snake_case for all identifiers.',
            };
        }
    },
});

const extractUserMessageText = (message: unknown): string => {
    if (!message || typeof message !== 'object') return '';
    const msg = message as { content?: unknown; parts?: unknown };

    if (typeof msg.content === 'string') return msg.content;

    if (Array.isArray(msg.content)) {
        const fromContent = msg.content
            .filter(
                (part): part is { type?: unknown; text?: unknown } =>
                    Boolean(part && typeof part === 'object')
            )
            .filter(part => part.type === 'text' && typeof part.text === 'string')
            .map(part => String(part.text))
            .join('\n')
            .trim();
        if (fromContent) return fromContent;
    }

    if (Array.isArray(msg.parts)) {
        return msg.parts
            .filter(
                (part): part is { type?: unknown; text?: unknown } =>
                    Boolean(part && typeof part === 'object')
            )
            .filter(part => part.type === 'text' && typeof part.text === 'string')
            .map(part => String(part.text))
            .join('\n')
            .trim();
    }

    return '';
};

function trimMessageHistory(messages: { role: string }[], maxTurns: number): typeof messages {
    const kept: typeof messages = [];
    let turnsCollected = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]!;
        if (msg.role === 'assistant') {
            kept.unshift(msg);
        } else if (msg.role === 'user') {
            if (turnsCollected < maxTurns) {
                kept.unshift(msg);
                turnsCollected++;
            }
        }
    }

    return kept;
}

function buildAdminSystemPrompt(
    userName: string,
    roleName: string,
    permissions: string[],
    context: string
): string {
    const permList =
        permissions.length > 0
            ? permissions.join(', ')
            : 'no permissions assigned';

    const contextSection = context
        ? `\n\n## Relevant Documentation\n${context}`
        : '';

    return `You are an AI System Administrator embedded in a Sales ERP (CRM + Sales Order) Management System.
You have FULL read-write access to the entire database (except DDL operations that change table structure).

⚠️ DANGER ZONE: You can INSERT, UPDATE, and DELETE data. These operations are IRREVERSIBLE.
ALWAYS ask the user for explicit confirmation before executing any write operation.
ALWAYS show the SQL query you plan to execute before running it.
NEVER execute a write query without the user's affirmative confirmation.

## Current User
- Name: ${userName}
- Role: ${roleName}
- Permissions: ${permList}

## Route Catalog (Authoritative)
${ROUTE_CATALOG}

## Instructions
- Use Markdown formatting for all responses — tables, bulleted/numbered lists, headings, and fenced code blocks are encouraged whenever they improve clarity.
- The current user's permissions are listed above. Do not ask the user for their permissions; use what is provided here.
- Be concise, practical, and step-by-step in your guidance.
- For read queries (SELECT), you may execute them immediately using queryDatabaseAdmin.
- For write queries (INSERT/UPDATE/DELETE), you MUST:
  1. Show the user the exact SQL you plan to execute in a fenced code block.
  2. Explain what the operation will do and how many rows it may affect.
  3. Ask for explicit confirmation (e.g., "Shall I proceed with this update?").
  4. Only execute after the user confirms.
- Permission format is always resource@action (e.g. sales-order@approve, region@create).
- Use snake_case for table and column names (e.g., crm_sales_orders, crm_outlets, skus).
- All IDs are ULID strings (26 characters).
- NEVER SELECT the password column from users table.
- Use the Route Catalog above to resolve navigation paths.
- Never mention or display raw route paths in your responses. Refer to destinations by their human-readable module name.
- For navigation requests, use the navigateTo tool.

## Knowledge vs Live Data
- Prefer **Relevant Documentation** (injected) for how-to, process, permission, navigation, form fields, and schema questions.
- Call **searchKnowledge** before answering documentation questions when injected context is empty, thin, or missing the topic.
- When answering from documentation or tool hits, cite the documentation **title** and **source**.
- Use **queryDatabaseAdmin** for live data reads/writes only — not for product documentation.
- Keep navigation/SQL tools available; do not refuse non-doc ERP tasks.

## Database Query Tool
You have access to queryDatabaseAdmin — a server-side SQL tool with full read-write access.
Use it for ALL live data operations: SELECT, INSERT, UPDATE, DELETE.
The tool will validate your SQL and block DDL operations.
Results are returned as JSON with row counts and affected row counts for write operations.${contextSection}`;
}

export async function aiAdminChatHandler(req: Request, res: Response) {
    // --- Auth ---
    let token: string | null = null;
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) token = cookies.access_token;
    }
    if (!token) {
        const auth = req.headers.authorization;
        if (auth?.startsWith('Bearer ')) token = auth.slice('Bearer '.length);
    }
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    let userId: string;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        if (!payload?.userId) throw new Error('Invalid token payload');
        userId = String(payload.userId);
    } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    // --- Permission check: admin role or ai-admin@access ---
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: { include: { permission: true } },
                },
            },
        },
    });

    const userPermissions = user?.role?.permissions.map(rp => rp.permission.name) ?? [];
    const isAdminRole = user?.role?.name === 'System Admin';
    const hasAdminPermission = userPermissions.includes('ai-admin@access');
    if (!isAdminRole && !hasAdminPermission) {
        res.status(403).json({
            error: 'Forbidden: admin access required',
            message: 'You must have the System Admin role or the ai-admin@access permission to use the AI System Administrator.',
        });
        return;
    }

    const userName = user?.name ?? user?.email ?? 'User';
    const roleName = user?.role?.name ?? 'Unknown';

    // --- Parse body ---
    const { messages, id: chatId } = req.body as { messages: unknown[]; id?: string };
    if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
    }

    // Extract last user message text for RAG query
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userText = extractUserMessageText(lastUserMsg);

    // --- Trim message history ---
    const trimmedMessages = trimMessageHistory(messages as any[], MAX_HISTORY_TURNS);

    // --- RAG ---
    const relevantContext = await retrieveRelevantChunks(userText);

    // --- Stream ---
    const modelMessages = await convertToModelMessages(trimmedMessages as any);

    const stream = createUIMessageStream({
        execute: ({ writer }) => {
            const result = streamText({
                model: chatModel,
                instructions: buildAdminSystemPrompt(userName, roleName, userPermissions, relevantContext),
                messages: modelMessages,
                temperature: 0,
                // serverTools.searchKnowledge executes on the server (docs chip).
                tools: {
                    ...clientTools,
                    ...serverTools,
                    queryDatabaseAdmin,
                },
                stopWhen: stepCountIs(5),
            });
            writer.merge(result.toUIMessageStream());
        },
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
}

export async function aiAdminChatResumeHandler(req: Request, res: Response) {
    // --- Auth ---
    let token: string | null = null;
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = parseCookie(cookieHeader);
        if (cookies.access_token) token = cookies.access_token;
    }
    if (!token) {
        const auth = req.headers.authorization;
        if (auth?.startsWith('Bearer ')) token = auth.slice('Bearer '.length);
    }
    if (!token) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    let userId: string;
    try {
        const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
        if (!payload?.userId) throw new Error('Invalid token payload');
        userId = String(payload.userId);
    } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }

    // --- Permission check: admin role or ai-admin@access ---
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            role: {
                include: {
                    permissions: { include: { permission: true } },
                },
            },
        },
    });

    const userPermissions = user?.role?.permissions.map(rp => rp.permission.name) ?? [];
    const isAdminRole = user?.role?.name === 'System Admin';
    const hasAdminPermission = userPermissions.includes('ai-admin@access');
    if (!isAdminRole && !hasAdminPermission) {
        res.status(403).json({
            error: 'Forbidden: admin access required',
            message: 'You must have the System Admin role or the ai-admin@access permission to use the AI System Administrator.',
        });
        return;
    }

    res.status(204).end();
}
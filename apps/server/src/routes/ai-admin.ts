import type { Request, Response } from 'express';
import {
    streamText,
    createUIMessageStream,
    pipeUIMessageStreamToResponse,
    convertToModelMessages,
} from 'ai';
import { getChatModel } from '../lib/ai-provider.js';
import { retrieveRelevantChunks } from '../lib/rag.js';
import { clientTools, serverTools } from '../lib/ai-tools.js';
import { prisma } from '../lib/prisma.js';
import { withAuth } from '../lib/express-auth.js';
import {
    createConfirmationTool,
    createFormInputTool,
    createWidgetStopCondition,
    isWidgetContinuationTurn,
    renderStructuredTurns,
} from '../lib/ai-widgets.js';
import {
    analyzeImageTool,
    hasImageParts,
    OnlyTextModelError,
} from '../lib/ai-multimodal.js';

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

// ---- SQL shape guard for the request_confirmation gate ----
// The direct-execute path (queryDatabaseAdmin) was removed in favour of the
// confirmation gate (SPEC §1/§5: ALL admin SQL goes through request_confirmation
// cards); these guardrails survive as the gate's validateSql hook so DDL and
// multi-statement proposals are rejected at card creation, before any gate row.
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
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(upperNoStrings)) {
            return { valid: false, reason: `DDL operation rejected: ${keyword} is not allowed.` };
        }
    }

    return { valid: true };
}

// M-1 (SPEC §5): ALL admin SQL goes through request_confirmation cards — the
// direct-execution queryDatabase client tool is deliberately not exposed here
// (it stays available to the general assistant in routes/ai.ts).
const { queryDatabase: _queryDatabase, ...adminClientTools } = clientTools;

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

⚠️ DANGER ZONE: You can propose INSERT, UPDATE, and DELETE. These operations are IRREVERSIBLE.
You NEVER run SQL yourself. Every SQL statement — read or write — must be sent through a
request_confirmation card; the server executes it only after the user confirms the card.

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
- ALWAYS call request_confirmation before ANY SQL (reads and writes alike). Never run SQL through any other path and never re-emit SQL for execution yourself — the server executes exactly the confirmed snapshot.
- Exactly ONE SQL statement per confirmation card. If you need multiple statements, emit a sequence of separate confirmation cards, one per statement.
- Set readOnly: true only for SELECT/EXPLAIN/WITH...SELECT. Everything else is a write with readOnly: false — the card will require the user to acknowledge the backup.
- Describe what the SQL will do in the card title/description; the card itself shows the exact SQL.
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
- Use **request_confirmation** cards for live data reads/writes only — not for product documentation.
- Keep navigation/SQL tools available; do not refuse non-doc ERP tasks.

## SQL Gate & Result Feedback
- Live data SQL (SELECT/INSERT/UPDATE/DELETE) goes ONLY through request_confirmation cards; execution is performed by the server after the user confirms the card. DDL operations are blocked.
- After an action_result turn ALWAYS restate and analyze the outcome: say what ran, interpret the row count and the sample rows, and flag surprises (e.g. 0 rows affected may mean your WHERE clause matched nothing — offer to inspect). For writes, suggest a verification SELECT; that SELECT needs its own new confirmation card.
- NEVER claim success without a matching action_result. Emitting a card is not an execution — only the action_result tells you what actually happened.
- The request_form_input tool renders an inline form card for structured user input (several related values, a choice from a list, a date, a number). Field labels must already be written in the user's language; select fields MUST include options.
- A widget card ENDS your turn: stop and wait — the user's response arrives as a structured form_response / confirmation / action_result turn, and you continue from there.${contextSection}`;
}

export const aiAdminChatHandler = withAuth(
    { permission: 'ai-admin@access', aiRateLimit: true },
    async (req: Request, res: Response, user) => {
    const userName = user.name ?? user.email ?? 'User';
    const roleName = user.roleName ?? 'Unknown';
    const userPermissions = user.permissions;

    // --- Parse body ---
    const { messages, id: chatId } = req.body as { messages: unknown[]; id?: string };
    if (!Array.isArray(messages)) {
        res.status(400).json({ error: 'messages must be an array' });
        return;
    }

    // --- Pause enforcement (SPEC §5.2) ---
    // A widget tool call ended the previous turn; the client's
    // sendAutomaticallyWhen fires a continuation POST once the widget output is
    // available. That continuation must not generate anything — wait for the
    // user's structured response instead.
    if (isWidgetContinuationTurn(messages)) {
        res.status(204).end();
        return;
    }

    // Extract last user message text for RAG query
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userText = extractUserMessageText(lastUserMsg);

    // --- Trim message history ---
    const trimmedMessages = trimMessageHistory(messages as any[], MAX_HISTORY_TURNS);

    // --- Multimodal ---
    // Whether the conversation carries image parts (from the original, untrimmed
    // messages so trimming can't hide an image attachment).
    const hasImages = hasImageParts(messages);

    // --- RAG ---
    const relevantContext = await retrieveRelevantChunks(userText);

    // --- Stream ---
    // Structured widget turns (form_response / confirmation / action_result
    // metadata) render as tagged JSON blocks in the model context (SPEC §5.3/§8).
    const preparedMessages = renderStructuredTurns(trimmedMessages);
    const modelMessages = await convertToModelMessages(preparedMessages as any);

    // Only expose the image-analysis tool when the conversation actually contains
    // image parts, so the model cannot call it gratuitously on text-only chats.
    // Graceful degradation: if no multimodal model is configured,
    // analyzeImageTool's execute throws OnlyTextModelError — wrap execute so the
    // tool resolves to a friendly error string instead of killing the stream
    // (other errors still propagate to the AI SDK's tool-error path).
    const imageTool = hasImages ? analyzeImageTool(prisma) : null;
    const tools = {
        ...adminClientTools,
        ...serverTools,
        // Server-executed widget tools (SPEC §8): the model supplies the payload,
        // the server assigns the widget id/status/confirmationId. The SQL gate
        // keeps the old direct-execution guardrails via validateAdminSql — DDL and
        // multi-statement proposals are rejected at card creation.
        request_form_input: createFormInputTool(),
        request_confirmation: createConfirmationTool({
            db: prisma,
            userId: user.userId,
            chatId: chatId ?? '',
            validateSql: validateAdminSql,
        }),
        ...(imageTool
            ? {
                  analyzeImage: {
                      ...imageTool,
                      execute: async (args: any, options: any) => {
                          try {
                              return (await imageTool.execute!(args, options)) as string;
                          } catch (error) {
                              if (error instanceof OnlyTextModelError) {
                                  return `[Image analysis unavailable: ${error.message}]`;
                              }
                              throw error;
                          }
                      },
                  },
              }
            : {}),
    };

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            const result = streamText({
                model: await getChatModel(prisma),
                instructions: buildAdminSystemPrompt(userName, roleName, userPermissions, relevantContext),
                messages: modelMessages,
                temperature: 0,
                // serverTools.searchKnowledge executes on the server (docs chip).
                // clientTools stay client-executed via onToolCall.
                tools,
                // A widget tool call ends the generation turn (SPEC §5.2).
                stopWhen: createWidgetStopCondition(),
            });
            writer.merge(result.toUIMessageStream());
        },
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
    }
);

export const aiAdminChatResumeHandler = withAuth(
    { permission: 'ai-admin@access' },
    async (_req: Request, res: Response) => {
    res.status(204).end();
    }
);
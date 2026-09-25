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
import { validateReadOnlySql, formatQueryResult } from '../lib/ai-db-tools.js';
import { prisma } from '../lib/prisma.js';
import { withAuth } from '../lib/express-auth.js';
import {
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

// Maximum number of past user-assistant turn pairs to keep.
// Each turn = 1 user message + 1 assistant message (with tool parts).
// Older turns are dropped to bound token usage regardless of chat length.
const MAX_HISTORY_TURNS = 20;

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

/**
 * Trim message history to the last `maxTurns` user-assistant turn pairs.
 * Each "turn" = 1 user message + the following assistant message.
 * Preserves tool-call/tool-result chains within each assistant message intact.
 */
function trimMessageHistory(messages: { role: string }[], maxTurns: number): typeof messages {
    // Walk backwards collecting turn pairs
    const kept: typeof messages = [];
    let turnsCollected = 0;

    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]!;
        if (msg.role === 'assistant') {
            // Assistant messages are always kept when their paired user message is kept
            kept.unshift(msg);
        } else if (msg.role === 'user') {
            // Each user message marks one turn
            if (turnsCollected < maxTurns) {
                kept.unshift(msg);
                turnsCollected++;
            }
            // else: stop — we have enough turns (but continue to collect
            // any preceding assistant messages from partial tool chains — not applicable
            // since user messages always start a new turn)
        }
        // Non-user, non-assistant messages (system, tool) are dropped —
        // they don't exist in UIMessage format sent from the client.
    }

    return kept;
}

export const aiChatHandler = withAuth({ aiRateLimit: true }, async (req, res, user) => {
    // --- Parse body ---
    // Accept both { messages } (legacy) and { id, messages } (resume-stream pattern)
    const { messages } = req.body as { messages: unknown[]; id?: string };
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

    // --- Message count validation ---
    if (messages.length > 100) {
        res.status(413).json({ error: 'Too many messages (max 100)' });
        return;
    }

    // Extract last user message text for RAG query (from original messages before trimming)
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    const userText = extractUserMessageText(lastUserMsg);

    // --- Trim message history to bound token usage ---
    // Keep the last N user-assistant turn pairs. A "turn" = 1 user msg + 1 assistant msg.
    // Preserves full tool-call tool-result chains within each assistant message.
    const trimmedMessages = trimMessageHistory(messages as any[], MAX_HISTORY_TURNS);

    // --- Multimodal ---
    // Whether the conversation carries image parts (from the original, untrimmed
    // messages so trimming can't hide an image attachment).
    const hasImages = hasImageParts(messages);

    // --- RAG ---
    const relevantContext = await retrieveRelevantChunks(userText);

    // --- User context for system prompt ---
    const permissions = user.permissions;
    const userName = user.name ?? user.email ?? 'User';
    const roleName = user.roleName ?? 'Unknown';

    // --- Stream ---
    // Structured widget turns (form_response metadata) render as tagged JSON
    // blocks in the model context (SPEC §5.3/§8).
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
        ...clientTools,
        ...serverTools,
        // Server-executed widget tool (SPEC §8): the model supplies the payload,
        // the server assigns the widget id/status. request_confirmation is
        // deliberately NOT registered here — the regular chatbox has no SQL
        // execution path; the gate belongs to the AI Admin pipeline (ai-admin.ts).
        request_form_input: createFormInputTool(),
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
                instructions: buildSystemPrompt(userName, roleName, permissions, relevantContext),
                messages: modelMessages,
                temperature: 0,
                // serverTools (searchKnowledge) include execute — run on server.
                // clientTools stay client-executed via onToolCall.
                tools,
                // A widget tool call ends the generation turn (SPEC §5.2).
                stopWhen: createWidgetStopCondition(),
            });
            writer.merge(result.toUIMessageStream());
        },
    });

    pipeUIMessageStreamToResponse({ response: res, stream });
});

export const aiChatResumeHandler = withAuth({}, async (_req: Request, res: Response) => {
    // No resumable stream storage is configured yet; return 204 so useChat resume
    // can gracefully fall back to the local message cache on the client.
    res.status(204).end();
});

export const aiQueryDatabaseHandler = withAuth({ aiRateLimit: true }, async (req, res) => {
    // --- Parse body ---
    const { sql, limit = 100 } = req.body as { sql?: string; limit?: number };
    if (!sql || typeof sql !== 'string') {
        res.status(400).json({ error: 'sql is required and must be a string' });
        return;
    }

    // --- Validate SQL ---
    const validation = validateReadOnlySql(sql);
    if (!validation.valid) {
        res.json({
            error: 'Query rejected',
            message: validation.reason,
        });
        return;
    }

    // --- Execute query ---
    const hasLimit = /\bLIMIT\b/i.test(sql);
    const finalSql = hasLimit ? sql : sql.replace(/;?\s*$/, '') + ` LIMIT ${limit}`;

    try {
        const result = await prisma.$queryRawUnsafe(finalSql);
        const rows = Array.isArray(result) ? result : [];
        const formatted = formatQueryResult(rows, rows.length, limit);
        res.json(JSON.parse(formatted));
    } catch (error) {
        res.json({
            error: 'Query failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            hint: 'Check SQL syntax. Ensure table and column names match the database schema. Use snake_case for all identifiers.',
        });
    }
});

const SUMMARIZE_SYSTEM = `You are a concise business analyst for a Sales ERP system.
Summarize the provided page context into readable Markdown for a human:
1) **Current Page** (module name and purpose — never the raw route path)
2) **What Is Visible Now** (key data points, counts, record/form state)
3) **Recommended Next Actions** (up to 3 practical actions)
Do not dump raw JSON; translate it into concise business language.`;

const DRAFT_SYSTEM = `You are a writing assistant for a Sales ERP system.
Draft practical, professional text based on the provided page context.
- followup: a short follow-up note/message for the record owner or customer.
- nextSteps: a bulleted list of concrete next actions.
- reply: a polite reply to a customer or teammate.
Keep it concise and business-appropriate. Respond in Markdown.`;

export const aiSummarizeHandler = withAuth({ aiRateLimit: true }, async (req, res) => {
    const { section, contextJson, recordJson } = req.body as {
        section?: string;
        contextJson?: string;
        recordJson?: string;
    };
    if (!section || typeof section !== 'string') {
        res.status(400).json({ error: 'section is required' });
        return;
    }

    const userText = [contextJson, recordJson].filter(Boolean).join('\n\n');
    const relevantContext = await retrieveRelevantChunks(userText);

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            const result = streamText({
                model: await getChatModel(prisma),
                instructions: SUMMARIZE_SYSTEM,
                prompt: `Page section: ${section}\n\nContext:\n${userText}`,
                temperature: 0,
            });
            writer.merge(result.toUIMessageStream());
        },
    });
    void relevantContext;
    pipeUIMessageStreamToResponse({ response: res, stream });
});

export const aiDraftHandler = withAuth({ aiRateLimit: true }, async (req, res) => {
    const { section, contextJson, kind } = req.body as {
        section?: string;
        contextJson?: string;
        kind?: 'followup' | 'reply' | 'nextSteps';
    };
    if (!section || typeof section !== 'string') {
        res.status(400).json({ error: 'section is required' });
        return;
    }
    if (kind && !['followup', 'reply', 'nextSteps'].includes(kind)) {
        res.status(400).json({ error: 'invalid kind' });
        return;
    }

    const userText = contextJson ?? '';
    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            const result = streamText({
                model: await getChatModel(prisma),
                instructions: DRAFT_SYSTEM,
                prompt: `Page section: ${section}\nDraft type: ${kind ?? 'followup'}\n\nContext:\n${userText}`,
                temperature: 0.4,
            });
            writer.merge(result.toUIMessageStream());
        },
    });
    pipeUIMessageStreamToResponse({ response: res, stream });
});

function buildSystemPrompt(
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

    return `You are an AI assistant embedded in a Sales ERP (CRM + Sales Order) Management System.
You help users navigate the application, understand features, and perform tasks step by step.

## Current User
- Name: ${userName}
- Role: ${roleName}
- Permissions: ${permList}

## Route Catalog (Authoritative)
${ROUTE_CATALOG}

## Instructions
- Use Markdown formatting for all responses by default — tables, bulleted/numbered lists, headings, and fenced code blocks are encouraged whenever they improve clarity. The client renders your reply as Markdown, so raw markdown-looking text in a chat bubble will look broken.
- The current user's permissions are listed above. Do not ask the user for their permissions; use what is provided here.
- If the user lacks a required permission, explain which permission is needed and tell them to contact their system administrator.
- Call getPageContext when the user asks what they are seeing, wants a summary of the current page, asks how many records are shown, asks about visible data or form state, or when you need page content to answer accurately.
- When summarizing a page after getPageContext, respond in readable Markdown for humans:
    1) **Current Page** (module name and purpose — do NOT include the raw route path),
    2) **What Is Visible Now** (key data points, counts, record/form state),
    3) **Recommended Next Actions** (up to 3 practical actions).
- Prefer the page heading/section context over generic browser title text when both are available.
- Do not dump raw JSON from tool output; translate it into concise business language.
- Use navigateTo to guide users to the correct page before explaining what to do there.
- Never mention or display route paths (e.g. /sku, /sales-order/:id) in your responses. Refer to destinations by their human-readable module name only (e.g. "SKU list", "Sales Order detail", "Create Sales Order").
- Be concise, practical, and step-by-step in your guidance.
- Resolve routes from the Route Catalog above first; use retrieved documentation only as supporting context.
- Use the page purpose and navigation documentation to infer the right module and route for any request.
- For any module in the app, use the route pattern from the navigation docs: list page for browse/manage, '/new' for add/create, and '/:id' for a specific record when one is identified.
- If the user asks to add, create, or make something new, call navigateTo with the matching module's '/new' page immediately.
- If the user asks to view, manage, search, or browse a module, call navigateTo with the matching module's list page.
- If the user asks about an existing record by name or id, navigate to that record's detail page when the route exists.
- Use the exact route strings from the navigation docs. Do not invent singular/plural variants or shorten routes.
- For creation requests in any module, call navigateTo to the correct '/new' route first, then call fillFormFields in the immediate next step with suggested values for that module.
- Never stop after only navigateTo when the user explicitly asks to create/fill a form; continue tool calls until fillFormFields is sent.
- Important: fillFormFields ONLY populates form inputs on the client. It does NOT click Save/Submit and does NOT persist data.
- Never claim a record has been created, updated, saved, submitted, or persisted after using fillFormFields.
- After filling fields, explicitly tell the user the form is prefilled and they must review and click Save/Submit themselves. Do NOT call getPageContext again to verify — trust that fillFormFields worked and move on to the final confirmation message.
- Do not write a lead-in sentence when a tool call can directly satisfy the user request.
- Permission format is always resource@action (e.g. sales-order@approve, region@create).

## Forms (Structured Input)
- Whenever structured information from the user is missing (several related values, a choice from a list, a date, a number, a confirmation), call request_form_input to render an inline form card instead of asking plain-text questions.
- Field labels must already be written in the user's language; select fields MUST include options.
- Calling request_form_input ENDS your turn immediately: do not write text or call other tools after it. The user's answers arrive as a structured form_response turn — continue the task from those values.

## Knowledge vs Live Data
- Relevant documentation may already be injected under **Relevant Documentation**.
- For documentation / process / permission / navigation / form-field / schema questions: call **searchKnowledge** before answering when injected docs are empty, thin, or missing the specific topic.
- When answering from documentation or tool hits, cite the documentation **title** and **source** (e.g. "Approvals (source: approvals)").
- Use **queryDatabase** only for live transactional/operational data (counts, totals, current records, inventory, CRM rows). Do not use queryDatabase to answer process/docs questions.
- Navigation, form-fill, and page-context tools remain available — do not refuse those tasks; only prefer searchKnowledge for docs answers.

## Database Query Tool
You have access to a read-only SQL query tool called queryDatabase. Use it when users ask about live sales data, order records, customer/outlet data, SKU catalog, visit logs, user activity, or any data-related question — not for product documentation.

## Analytics & Insights
When the user asks for trends, rankings, or "at-risk" analysis, use queryDatabase with aggregate queries, then summarize the result in Markdown.
Example insight requests and the query shape to use:
- "Top 5 customers this month": SUM(grand_total) grouped by customer, filtered to APPROVED orders in the current month, ordered DESC, LIMIT 5.
- "At-risk orders": DRAFT/PROPOSED sales orders with old dates or missing required fields; surface document_number and age.
- "Sales trend": monthly SUM(grand_total) of APPROVED orders, ordered by month.
Always explain the business meaning of the numbers, not just the raw rows.

When to use queryDatabase:
- User asks "how many SKUs do we have?" or any count/summary question
- User asks "show me pending/approved/rejected sales orders"
- User asks "what is the revenue for customer X?" or "total sales this month?"
- User asks "how many visits did salesman Y log?"
- User asks about any live data that requires querying the database

When NOT to use queryDatabase:
- How approval workflows work, which permission is needed, how to navigate, form field names, or schema documentation — use injected docs / searchKnowledge instead

SQL Guidelines:
- Only SELECT statements are allowed (INSERT/UPDATE/DELETE/DROP/ALTER/CREATE are blocked)
- Use snake_case for table and column names (e.g., crm_sales_orders, crm_outlets, skus)
- Always add a LIMIT clause (default 100 rows, max 500)
- Use JOINs to get related data (e.g., JOIN skus to get SKU details, JOIN crm_outlets for names)
- Use aggregate functions (COUNT, SUM, AVG) and GROUP BY for summary queries
- Date fields use DATE type (no time); timestamp fields use TIMESTAMP type
- All IDs are ULID strings (26 characters)
- NEVER SELECT the password column from users table
- Results are limited to 100 rows by default; tell the user if results were truncated

Example queries:
- Count SKUs: SELECT COUNT(*) as count FROM skus
- List SKUs: SELECT code, name, base_unit, status FROM skus LIMIT 10
- Open sales orders: SELECT document_number, date, approval_status, grand_total FROM crm_sales_orders WHERE approval_status = 'DRAFT' ORDER BY date DESC LIMIT 10
- Revenue by customer: SELECT c.name, SUM(so.grand_total) as total FROM crm_sales_orders so JOIN crm_customers c ON so.customer_id = c.id WHERE so.approval_status = 'APPROVED' GROUP BY c.name ORDER BY total DESC LIMIT 10
- Visits by salesman: SELECT u.name, COUNT(*) as visits FROM crm_visit_logs vl JOIN users u ON vl.salesman_id = u.id GROUP BY u.name ORDER BY visits DESC LIMIT 10

Refer to the database schema documentation in the knowledge base for complete table and column names.${contextSection}`;
}

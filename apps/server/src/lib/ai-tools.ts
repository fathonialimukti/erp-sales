import { tool } from 'ai';
import { z } from 'zod';


/**
 * Client-side tools — NO `execute`. These are returned as tool calls in the stream
 * and handled by `onToolCall` in the frontend useChat hook.
 */
export const clientTools = {
    navigateTo: tool({
        description:
            'Navigate the user to a specific exact application route from the navigation docs. Use the precise list, create, detail, or edit route string and do not invent singular/plural variants.',
        inputSchema: z.object({
            path: z.string().describe('The app route path, e.g. /receiving-transactions'),
            reason: z.string().describe('Why navigating to this page'),
        }),
    }),
    fillFormFields: tool({
        description:
            'Fill one or more fields in the currently visible form with recommended values. ' +
            'Use this after navigating to a create/edit page. ' +
            'This ONLY pre-fills input values in the UI and does NOT click Save/Submit or persist data. ' +
            'Each key must match a known field name for the current form (see knowledge base for field names per route). ' +
            'Provide realistic, complete values based on the user\'s request.',
        inputSchema: z.object({
            fields: z
                .record(z.string(), z.unknown())
                .describe(
                    'Map of field names to values. E.g. { skuCode: "SKU-PB-001", skuName: "Plastic Bottle 500ml", baseUnit: "pcs", description: "Clear PET plastic bottle 500ml" }'
                ),
        }),
    }),
    getPageContext: tool({
        description:
            'Get structured context about what is currently shown on the user\'s screen. ' +
            'Call this when the user asks what they are seeing, wants a summary of the current page, ' +
            'asks questions about visible data (e.g. how many rows, which fields are filled, what record is open), ' +
            'or needs page content to answer a question. ' +
            'Returns the current route, page title, and annotated section data including record counts, visible rows, and form state.',
        inputSchema: z.object({
            reason: z.string().optional().describe('Why you need the page context'),
        }),
    }),
    summarizeCurrentPage: tool({
        description:
            'Request a concise Markdown summary of the current page from the backend. ' +
            'Use when the user asks "summarize this page", "what does this show", or wants a quick brief. ' +
            'The backend uses the current page context to produce the summary.',
        inputSchema: z.object({
            reason: z.string().optional().describe('Why a summary is needed'),
        }),
    }),
    draftFollowUp: tool({
        description:
            'Draft a follow-up note or message based on the current page context. ' +
            'Use when the user asks to "draft a follow-up", "write a note", or "prepare a message" for the open record. ' +
            'The backend streams a Markdown draft back to the chat.',
        inputSchema: z.object({
            kind: z
                .enum(['followup', 'reply', 'nextSteps'])
                .describe('Type of draft: followup note, reply, or next-steps list'),
            reason: z.string().optional().describe('Why the draft is needed'),
        }),
    }),
    suggestNextSteps: tool({
        description:
            'Suggest concrete next actions for the current record or page. ' +
            'Use when the user asks "what should I do next", "recommend next steps", or "what actions are available". ' +
            'The backend returns a Markdown list of practical next actions.',
        inputSchema: z.object({
            reason: z.string().optional().describe('Why next steps are needed'),
        }),
    }),
    queryDatabase: tool({
        description:
            'Execute a read-only SQL query against the CRM database. ' +
            'Use this when the user asks about inventory levels, transaction records, stock movements, ' +
            'pallet information, warehouse capacity, supplier data, user activity, ' +
            'sales orders, customers, outlets, invoices, payments, action programs, event proposals, or visit logs. ' +
            'Only SELECT statements are allowed (no INSERT/UPDATE/DELETE). ' +
            'Use PostgreSQL syntax with snake_case table and column names. ' +
            'CRM tables use the prefix "crm_" (e.g. crm_sales_orders, crm_customers, crm_outlets). ' +
            'Warehouse tables have no prefix (e.g. skus, pallets, receiving_transactions). ' +
            'Refer to the database schema documentation for table and column names. ' +
            'Always include a LIMIT clause for safety.',
        inputSchema: z.object({
            sql: z
                .string()
                .describe(
                    "SQL SELECT query using PostgreSQL syntax. Table and column names are snake_case. " +
                    "CRM tables: crm_sales_orders, crm_customers, crm_outlets, crm_areas, crm_regions, " +
                    "crm_invoices, crm_payments, crm_action_programs, crm_event_proposals, crm_visit_logs. " +
                    "Warehouse tables: skus, pallets, receiving_transactions, shipments, stock_movements, etc. " +
                    "Example: SELECT so.document_number, so.date, so.grand_total, c.name as customer_name " +
                    "FROM crm_sales_orders so JOIN crm_customers c ON so.customer_id = c.id " +
                    "WHERE so.approval_status = 'APPROVED' ORDER BY so.date DESC LIMIT 10",
                ),
            limit: z
                .number()
                .int()
                .min(1)
                .max(500)
                .default(100)
                .optional()
                .describe(
                    'Maximum rows to return (1-500, default 100). Also add LIMIT to your SQL.',
                ),
        }),
    }),
};

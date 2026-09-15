import { describe, expect, it, vi } from 'vitest';
import { chatWidgetSchema } from '@repo/schemas/chatWidget';
import type { DbClient } from '../lib/prisma.js';
import {
    classifySqlReadOnly,
    confirmationInputSchema,
    createConfirmationTool,
    createFormInputTool,
    createWidgetStopCondition,
    formWidgetInputSchema,
    isWidgetContinuationTurn,
    renderStructuredTurns,
    WIDGET_TOOL_NAMES,
} from '../lib/ai-widgets.js';

/**
 * Task 4 — AI pipeline widget tools (SPEC §5, §8, §11).
 *
 * Unit tests: the widget tools are dependency-injected with a fake db handle,
 * so no test database is needed. The tool name = the key each handler registers
 * it under in the `tools` object (see routes/ai.ts + routes/ai-admin.ts).
 */

const ULID_RE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

// 26-char Crockford ULID (no I/L/O/U) — must satisfy z.string().ulid().
const GATE_ULID = '01JGW1DGETGATE00000000000A';
const createMock = vi.fn().mockResolvedValue({ id: GATE_ULID });
// logActivity(db, …) writes the gate CREATE entry (SPEC §10) — stub it too.
const fakeDb = {
    aiActionConfirmation: { create: createMock },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
} as unknown as DbClient;

// tool.execute's options shape is SDK-internal; keep the helper loose.
const runTool = (
    t: { execute?: (input: any, options: any) => unknown },
    input: unknown,
): Promise<unknown> => Promise.resolve(t.execute!(input, { toolCallId: 'test-call', messages: [] }));

describe('widget tool registration', () => {
    it('exposes exactly the two contract tool names', () => {
        expect(WIDGET_TOOL_NAMES).toEqual(['request_form_input', 'request_confirmation']);
    });

    it('both tools are server-executed (have execute)', () => {
        expect(typeof createFormInputTool().execute).toBe('function');
        expect(
            typeof createConfirmationTool({
                db: fakeDb,
                userId: 'user-1',
                chatId: 'chat-1',
            }).execute,
        ).toBe('function');
    });
});

describe('request_form_input', () => {
    it('returns a valid form-request widget with a server-assigned ULID id and pending status', async () => {
        const widget = (await runTool(createFormInputTool(), {
            title: 'Create outlet',
            description: 'Details for the new outlet',
            fields: [
                { key: 'name', label: 'Outlet name', type: 'text', required: true },
                { key: 'region', label: 'Region', type: 'select', options: ['Jakarta', 'Bandung'] },
            ],
        })) as Record<string, unknown>;

        // The tool output IS the widget JSON that lands on the assistant message.
        const parsed = chatWidgetSchema.parse(widget); // throws when invalid
        expect(parsed.type).toBe('form-request');
        expect(parsed.status).toBe('pending');
        expect(widget.id).toMatch(ULID_RE); // server assigns id — the model never picks ids
    });

    it('rejects malformed payloads at the tool-input layer (SDK feeds a retryable error)', () => {
        // empty fields array
        expect(formWidgetInputSchema.safeParse({ title: 'T', fields: [] }).success).toBe(false);
        // select without options (SPEC §3 refine)
        expect(
            formWidgetInputSchema.safeParse({
                title: 'T',
                fields: [{ key: 'r', label: 'Region', type: 'select' }],
            }).success,
        ).toBe(false);
        // missing title
        expect(
            formWidgetInputSchema.safeParse({
                fields: [{ key: 'a', label: 'A', type: 'text' }],
            }).success,
        ).toBe(false);
    });

    it('execute throws instead of ever returning an invalid widget (never persist an invalid widget)', async () => {
        // Simulate a payload that bypassed the input schema.
        await expect(
            runTool(createFormInputTool(), { title: 'T', description: undefined, fields: [] }),
        ).rejects.toThrow();
    });
});

describe('request_confirmation — the SQL gate row', () => {
    it('creates a pending gate row with the exact SQL snapshot + chatId + createdBy and logs it', async () => {
        const sql = "UPDATE crm_regions SET name = 'x' WHERE id = 'r1'";
        const widget = (await runTool(
            createConfirmationTool({ db: fakeDb, userId: 'user-1', chatId: 'chat-1' }),
            { title: 'Update region', sql, readOnly: false },
        )) as Record<string, unknown>;

        expect(createMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                widgetId: expect.stringMatching(ULID_RE),
                sqlText: sql, // exact SQL snapshot the user will see
                readOnly: false,
                backupAck: false,
                status: 'pending',
                chatId: 'chat-1',
                createdBy: 'user-1',
            }),
        });

        const parsed = chatWidgetSchema.parse(widget); // valid widget → tool output on assistant message
        expect(parsed.type).toBe('confirm-action');
        expect(parsed.status).toBe('pending');
        expect(widget.confirmationId).toBe(GATE_ULID); // server-assigned from the gate row
        expect(widget.id).toMatch(ULID_RE);
        // SPEC §3 refine: requiresBackupAck = !readOnly (writes demand the backup ack)
        expect(widget.requiresBackupAck).toBe(true);
    });

    it('read-only SQL gets requiresBackupAck: false', async () => {
        const widget = (await runTool(
            createConfirmationTool({ db: fakeDb, userId: 'user-1', chatId: 'chat-1' }),
            { title: 'Count regions', sql: 'SELECT COUNT(*) FROM crm_regions', readOnly: true },
        )) as Record<string, unknown>;
        expect(widget.requiresBackupAck).toBe(false);
        expect(widget.action).toMatchObject({ kind: 'run-sql', readOnly: true });
    });

    it('rejects malformed payloads at the tool-input layer', () => {
        expect(confirmationInputSchema.safeParse({ title: 'T', sql: '', readOnly: true }).success).toBe(false);
        expect(confirmationInputSchema.safeParse({ title: 'T', sql: 'SELECT 1' }).success).toBe(false); // readOnly missing
        expect(confirmationInputSchema.safeParse({ sql: 'SELECT 1', readOnly: true }).success).toBe(false); // title missing
    });

    it('a rejected SQL statement (validateSql hook) throws before any gate row is created', async () => {
        const createMock2 = vi.fn().mockResolvedValue({ id: GATE_ULID });
        const tool = createConfirmationTool({
            db: { aiActionConfirmation: { create: createMock2 } } as unknown as DbClient,
            userId: 'user-1',
            chatId: 'chat-1',
            validateSql: (sql) => (sql.includes('DROP') ? { valid: false, reason: 'DDL blocked' } : { valid: true }),
        });
        await expect(
            runTool(tool, { title: 'T', sql: 'DROP TABLE crm_regions', readOnly: false }),
        ).rejects.toThrow('DDL blocked');
        expect(createMock2).not.toHaveBeenCalled();
    });
});

describe('request_confirmation — server classification is authoritative (I-1)', () => {
    // Fresh mock per test so gate-row assertions stay isolated.
    const freshTool = () => {
        const createGate = vi.fn().mockResolvedValue({ id: GATE_ULID });
        const tool = createConfirmationTool({
            db: {
                aiActionConfirmation: { create: createGate },
                activityLog: { create: vi.fn().mockResolvedValue({}) },
            } as unknown as DbClient,
            userId: 'user-1',
            chatId: 'chat-1',
        });
        return { createGate, tool };
    };

    it('a write labeled readOnly: true is stored as a write (backup ack enforced)', async () => {
        const { createGate, tool } = freshTool();
        const sql = "UPDATE crm_regions SET name = 'x' WHERE id = 'r1'";
        const widget = (await runTool(tool, { title: 'Update region', sql, readOnly: true })) as Record<string, unknown>;

        // The gate row + widget carry the SERVER's classification, not the model's flag.
        expect(createGate).toHaveBeenCalledWith({
            data: expect.objectContaining({ sqlText: sql, readOnly: false }),
        });
        expect(widget.action).toMatchObject({ kind: 'run-sql', sql, readOnly: false });
        expect(widget.requiresBackupAck).toBe(true);
    });

    it('a SELECT labeled readOnly: false is stored as a read (no backup ack)', async () => {
        const { createGate, tool } = freshTool();
        const sql = 'SELECT COUNT(*) FROM crm_regions';
        const widget = (await runTool(tool, { title: 'Count regions', sql, readOnly: false })) as Record<string, unknown>;

        expect(createGate).toHaveBeenCalledWith({
            data: expect.objectContaining({ sqlText: sql, readOnly: true }),
        });
        expect(widget.action).toMatchObject({ kind: 'run-sql', sql, readOnly: true });
        expect(widget.requiresBackupAck).toBe(false);
    });
});

describe('classifySqlReadOnly — first-keyword classifier', () => {
    it('classifies SELECT and EXPLAIN as reads', () => {
        expect(classifySqlReadOnly('SELECT 1')).toBe(true);
        expect(classifySqlReadOnly('  select id from crm_regions limit 5')).toBe(true);
        expect(classifySqlReadOnly('EXPLAIN SELECT 1')).toBe(true);
        expect(classifySqlReadOnly('explain analyze select 1')).toBe(true);
    });

    it('classifies writes — and bare WITH — as writes', () => {
        expect(classifySqlReadOnly("UPDATE crm_regions SET name = 'x' WHERE id = 'r1'")).toBe(false);
        expect(classifySqlReadOnly('DELETE FROM crm_regions')).toBe(false);
        expect(classifySqlReadOnly("INSERT INTO crm_regions (name) VALUES ('x')")).toBe(false);
        // Data-modifying CTEs make `WITH ...` untrustworthy — bare WITH is a write.
        expect(classifySqlReadOnly('WITH moved AS (DELETE FROM t RETURNING *) SELECT * FROM moved')).toBe(false);
        // Even a pure-read CTE is treated as a write (conservative ruling).
        expect(classifySqlReadOnly('WITH top AS (SELECT 1) SELECT * FROM top')).toBe(false);
    });

    it('strips leading whitespace and comments before reading the first keyword', () => {
        expect(classifySqlReadOnly('-- note\nUPDATE crm_regions SET name = 1')).toBe(false);
        expect(classifySqlReadOnly('/* header */\n\n  SELECT 1')).toBe(true);
        expect(classifySqlReadOnly('-- one\n-- two\n/* three */\nSELECT 1')).toBe(true);
        expect(classifySqlReadOnly('\n\t UPDATE t SET x = 1')).toBe(false);
    });
});

describe('pause — widget tool call ends the generation turn', () => {
    const stop = createWidgetStopCondition();
    const step = (toolName: string) => ({ toolCalls: [{ toolName }] }) as never;
    const steps = (...names: string[]) => names.map(step);

    it('stops right after a step that called a widget tool', () => {
        expect(stop({ steps: steps('navigateTo', 'request_form_input') })).toBe(true);
        expect(stop({ steps: steps('request_confirmation') })).toBe(true);
    });

    it('keeps generating after non-widget tool calls (base condition still applies)', () => {
        expect(stop({ steps: steps('navigateTo') })).toBe(false);
        // stepCountIs(5) still terminates runaway loops
        expect(stop({ steps: steps('navigateTo', 'navigateTo', 'navigateTo', 'navigateTo', 'navigateTo') })).toBe(true);
    });
});

describe('structured turns reach the model context', () => {
    it('renders form_response metadata as a structured block (not free text)', () => {
        const out = renderStructuredTurns([
            {
                id: 'm1',
                role: 'user',
                parts: [{ type: 'text', text: 'unused display copy' }],
                metadata: {
                    form_response: { widgetId: 'w1', values: { region: 'Jakarta', count: 3, active: true } },
                },
            },
        ]);
        const text = (out[0]!.parts![0] as { type: string; text: string }).text;
        expect(out[0]!.role).toBe('user');
        expect(text.startsWith('[form_response]')).toBe(true);
        const payload = JSON.parse(text.replace('[form_response]\n', '')) as {
            widgetId: string;
            values: Record<string, unknown>;
        };
        expect(payload).toEqual({ widgetId: 'w1', values: { region: 'Jakarta', count: 3, active: true } });
    });

    it('renders confirmation decision as a structured block', () => {
        const out = renderStructuredTurns([
            {
                id: 'm2',
                role: 'user',
                parts: [],
                metadata: {
                    confirmation: { widgetId: 'w2', confirmationId: 'g2', decision: 'confirm' },
                },
            },
        ]);
        const text = (out[0]!.parts![0] as { type: string; text: string }).text;
        expect(text.startsWith('[confirmation]')).toBe(true);
        expect(text).toContain('"decision":"confirm"');
    });

    it('caps action_result rows at the FIRST 20 with a truncated note (row-cap seam)', () => {
        const rows = Array.from({ length: 35 }, (_, i) => ({ id: i }));
        const out = renderStructuredTurns([
            {
                id: 'm3',
                role: 'user',
                parts: [],
                metadata: {
                    action_result: {
                        confirmationId: 'g3',
                        status: 'executed',
                        sql: 'SELECT id FROM crm_regions',
                        rows,
                        truncated: false,
                        durationMs: 12,
                    },
                },
            },
        ]);
        const text = (out[0]!.parts![0] as { type: string; text: string }).text;
        expect(text.startsWith('[action_result]')).toBe(true);
        const payload = JSON.parse(text.replace('[action_result]\n', '')) as {
            rows: unknown[];
            truncated: boolean;
        };
        expect(payload.rows).toHaveLength(20);
        expect((payload.rows[0] as { id: number }).id).toBe(0); // first rows, not the last ones
        expect(payload.truncated).toBe(true);
    });

    it('passes through non-structured and invalid-payload messages untouched', () => {
        const plain = { id: 'm4', role: 'user', parts: [{ type: 'text', text: 'hello' }] };
        const invalid = {
            id: 'm5',
            role: 'user',
            parts: [{ type: 'text', text: 'x' }],
            metadata: { form_response: { widgetId: 42 } }, // malformed → treated as a plain message
        };
        const out = renderStructuredTurns([plain, invalid]);
        expect(out[0]).toBe(plain);
        expect(out[1]).toBe(invalid);
    });
});

describe('pause — widget continuation POST is a server-side no-op', () => {
    const widgetOutputPart = (state: string) => ({
        type: 'tool-request_form_input',
        state,
        input: {},
        output: {},
    });

    it('detects an assistant message whose last step ended with a widget tool call', () => {
        expect(
            isWidgetContinuationTurn([
                { role: 'assistant', parts: [{ type: 'step-start' }, widgetOutputPart('output-available')] },
            ]),
        ).toBe(true);
        expect(
            isWidgetContinuationTurn([
                {
                    role: 'assistant',
                    parts: [{ type: 'tool-request_confirmation', state: 'output-available', input: {}, output: {} }],
                },
            ]),
        ).toBe(true);
        // A failed (malformed → output-error) widget call also pauses.
        expect(
            isWidgetContinuationTurn([
                { role: 'assistant', parts: [{ type: 'step-start' }, widgetOutputPart('output-error')] },
            ]),
        ).toBe(true);
    });

    it('ignores client-tool chains, plain text, user messages and empty threads', () => {
        // client-executed tool chains must keep auto-continuing (navigate → fill)
        expect(
            isWidgetContinuationTurn([
                {
                    role: 'assistant',
                    parts: [{ type: 'step-start' }, { type: 'tool-navigateTo', state: 'output-available', output: 'ok' }],
                },
            ]),
        ).toBe(false);
        // widget call in an EARLIER step but the turn continued with text afterwards
        expect(
            isWidgetContinuationTurn([
                {
                    role: 'assistant',
                    parts: [
                        { type: 'step-start' },
                        widgetOutputPart('output-available'),
                        { type: 'step-start' },
                        { type: 'text', text: 'final text' },
                    ],
                },
            ]),
        ).toBe(false);
        expect(isWidgetContinuationTurn([{ role: 'user', parts: [] }])).toBe(false);
        expect(isWidgetContinuationTurn([{ role: 'assistant', parts: [{ type: 'text', text: 'hi' }] }])).toBe(false);
        expect(isWidgetContinuationTurn([])).toBe(false);
        expect(isWidgetContinuationTurn(undefined)).toBe(false);
    });
});

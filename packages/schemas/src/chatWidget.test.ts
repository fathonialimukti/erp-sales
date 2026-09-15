import { describe, expect, it } from 'vitest';
import {
  chatActionResultSchema,
  chatConfirmActionWidgetSchema,
  chatConfirmationSchema,
  chatFormRequestWidgetSchema,
  chatFormResponseSchema,
  chatWidgetFieldSchema,
  chatWidgetSchema,
} from './chatWidget';

const ULID_A = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const ULID_B = '01J8Z3NDEKTSV4RRFFQ69G5FAV';

describe('chatWidgetFieldSchema', () => {
  it('parses a valid text field (required defaults to false)', () => {
    const parsed = chatWidgetFieldSchema.parse({ key: 'name', label: 'Name', type: 'text' });
    expect(parsed.key).toBe('name');
    expect(parsed.required).toBe(false);
  });

  it('parses a select field with options', () => {
    const parsed = chatWidgetFieldSchema.parse({
      key: 'region',
      label: 'Region',
      type: 'select',
      options: ['west', 'east'],
    });
    expect(parsed.options).toEqual(['west', 'east']);
  });

  it('rejects a select field without options', () => {
    expect(() =>
      chatWidgetFieldSchema.parse({ key: 'region', label: 'Region', type: 'select' }),
    ).toThrow();
  });

  it('rejects a select field with empty options', () => {
    expect(() =>
      chatWidgetFieldSchema.parse({ key: 'region', label: 'Region', type: 'select', options: [] }),
    ).toThrow();
  });

  it('accepts a non-select field without options', () => {
    const parsed = chatWidgetFieldSchema.parse({
      key: 'qty',
      label: 'Quantity',
      type: 'number',
      required: true,
    });
    expect(parsed.required).toBe(true);
    expect(parsed.options).toBeUndefined();
  });
});

describe('chatFormRequestWidgetSchema', () => {
  const validWidget = {
    type: 'form-request' as const,
    id: ULID_A,
    title: 'Contact details',
    fields: [{ key: 'name', label: 'Name', type: 'text' as const }],
  };

  it('parses a valid form-request and defaults status to pending', () => {
    const parsed = chatFormRequestWidgetSchema.parse(validWidget);
    expect(parsed.status).toBe('pending');
    expect(parsed.fields).toHaveLength(1);
  });

  it('accepts an explicit status', () => {
    const parsed = chatFormRequestWidgetSchema.parse({ ...validWidget, status: 'submitted' });
    expect(parsed.status).toBe('submitted');
  });

  it('rejects an empty fields array', () => {
    expect(() => chatFormRequestWidgetSchema.parse({ ...validWidget, fields: [] })).toThrow();
  });

  it('rejects a non-ulid id', () => {
    expect(() => chatFormRequestWidgetSchema.parse({ ...validWidget, id: 'not-a-ulid' })).toThrow();
  });
});

describe('chatConfirmActionWidgetSchema', () => {
  const baseWidget = {
    type: 'confirm-action' as const,
    id: ULID_A,
    title: 'Run SQL',
    action: { kind: 'run-sql' as const, sql: 'SELECT 1', readOnly: true },
    requiresBackupAck: false,
    confirmationId: ULID_B,
  };

  it('parses a valid read-only confirm-action and defaults status to pending', () => {
    const parsed = chatConfirmActionWidgetSchema.parse(baseWidget);
    expect(parsed.status).toBe('pending');
    expect(parsed.action.kind).toBe('run-sql');
  });

  it('parses a write confirm-action with backup ack', () => {
    const parsed = chatConfirmActionWidgetSchema.parse({
      ...baseWidget,
      action: { kind: 'run-sql', sql: 'DELETE FROM "sku"', readOnly: false },
      requiresBackupAck: true,
    });
    expect(parsed.requiresBackupAck).toBe(true);
  });

  it('rejects requiresBackupAck: false with readOnly: false', () => {
    expect(() =>
      chatConfirmActionWidgetSchema.parse({
        ...baseWidget,
        action: { kind: 'run-sql', sql: 'DELETE FROM "sku"', readOnly: false },
        requiresBackupAck: false,
      }),
    ).toThrow();
  });

  it('rejects an empty sql', () => {
    expect(() =>
      chatConfirmActionWidgetSchema.parse({
        ...baseWidget,
        action: { kind: 'run-sql', sql: '', readOnly: true },
      }),
    ).toThrow();
  });
});

describe('chatWidgetSchema', () => {
  it('parses a form-request member', () => {
    const parsed = chatWidgetSchema.parse({
      type: 'form-request',
      id: ULID_A,
      title: 'Contact details',
      fields: [{ key: 'name', label: 'Name', type: 'text' }],
    });
    expect(parsed.type).toBe('form-request');
  });

  it('parses a confirm-action member', () => {
    const parsed = chatWidgetSchema.parse({
      type: 'confirm-action',
      id: ULID_A,
      title: 'Run SQL',
      action: { kind: 'run-sql', sql: 'SELECT 1', readOnly: true },
      requiresBackupAck: false,
      confirmationId: ULID_B,
    });
    expect(parsed.type).toBe('confirm-action');
  });

  it('rejects an unknown widget type', () => {
    expect(() => chatWidgetSchema.parse({ type: 'unknown', id: ULID_A })).toThrow();
  });
});

describe('chatFormResponseSchema', () => {
  it('parses mixed string/number/boolean values', () => {
    const parsed = chatFormResponseSchema.parse({
      widgetId: ULID_A,
      values: { name: 'Budi', quantity: 3, confirmed: true },
    });
    expect(parsed.values.name).toBe('Budi');
    expect(parsed.values.quantity).toBe(3);
    expect(parsed.values.confirmed).toBe(true);
  });

  it('rejects a non-primitive value', () => {
    expect(() =>
      chatFormResponseSchema.parse({ widgetId: ULID_A, values: { name: { nested: true } } }),
    ).toThrow();
  });
});

describe('chatConfirmationSchema', () => {
  it('parses a confirm decision', () => {
    const parsed = chatConfirmationSchema.parse({
      widgetId: ULID_A,
      confirmationId: ULID_B,
      decision: 'confirm',
    });
    expect(parsed.decision).toBe('confirm');
  });

  it('rejects an unknown decision', () => {
    expect(() =>
      chatConfirmationSchema.parse({ widgetId: ULID_A, confirmationId: ULID_B, decision: 'maybe' }),
    ).toThrow();
  });
});

describe('chatActionResultSchema', () => {
  it('parses an executed write result with rowCount', () => {
    const parsed = chatActionResultSchema.parse({
      confirmationId: ULID_B,
      status: 'executed',
      sql: 'DELETE FROM "sku"',
      rowCount: 3,
      truncated: false,
      durationMs: 42,
    });
    expect(parsed.rowCount).toBe(3);
    expect(parsed.error).toBeUndefined();
  });

  it('parses a failed read result with rolledBack error and rows', () => {
    const parsed = chatActionResultSchema.parse({
      confirmationId: ULID_B,
      status: 'failed',
      sql: 'SELECT * FROM "sku"',
      rows: [{ id: 1 }],
      truncated: true,
      error: { message: 'relation does not exist', rolledBack: true },
      durationMs: 10,
    });
    expect(parsed.error?.rolledBack).toBe(true);
    expect(parsed.truncated).toBe(true);
  });

  it('rejects an intermediate status (executed|failed only)', () => {
    expect(() =>
      chatActionResultSchema.parse({
        confirmationId: ULID_B,
        status: 'confirmed',
        sql: 'SELECT 1',
        truncated: false,
        durationMs: 1,
      }),
    ).toThrow();
  });

  it('rejects rolledBack: false in the error snapshot', () => {
    expect(() =>
      chatActionResultSchema.parse({
        confirmationId: ULID_B,
        status: 'failed',
        sql: 'SELECT 1',
        truncated: false,
        durationMs: 1,
        error: { message: 'boom', rolledBack: false },
      }),
    ).toThrow();
  });

  it('rejects a missing durationMs', () => {
    expect(() =>
      chatActionResultSchema.parse({
        confirmationId: ULID_B,
        status: 'executed',
        sql: 'SELECT 1',
        truncated: false,
      }),
    ).toThrow();
  });
});

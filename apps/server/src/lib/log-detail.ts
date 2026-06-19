import type { Prisma } from '../prisma/generated/client';

type JsonCompatible = Prisma.InputJsonValue;

/**
 * Build a log detail object for a CREATE action.
 * Captures the full created record for audit trail.
 */
export function buildCreateLogDetail(record: Record<string, unknown>): JsonCompatible {
  return { created: record } as unknown as JsonCompatible;
}

/**
 * Build a log detail object for an UPDATE action.
 * Captures original values and changed values, plus the list of changed field names.
 */
export function buildUpdateLogDetail(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): JsonCompatible {
  const changedFields: string[] = [];
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(after)) {
    const beforeVal = before[key];
    const afterVal = after[key];

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changedFields.push(key);
      changes[key] = { from: beforeVal, to: afterVal };
    }
  }

  return {
    before: { id: before.id, name: (before as { name?: string }).name },
    after: { id: after.id, name: (after as { name?: string }).name },
    changedFields,
    changes,
  } as unknown as JsonCompatible;
}

/**
 * Build a log detail object for a DELETE action.
 * Captures what was deleted.
 */
export function buildDeleteLogDetail(record: Record<string, unknown>): JsonCompatible {
  return { deleted: { id: record.id, name: (record as { name?: string }).name } } as unknown as JsonCompatible;
}
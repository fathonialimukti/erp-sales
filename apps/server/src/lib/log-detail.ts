import type { Prisma } from '../prisma/generated/client';

type JsonCompatible = Prisma.InputJsonValue;

/**
 * Build a log detail object for a CREATE action.
 * Captures the full created record for audit trail.
 */
export function buildCreateLogDetail(record: object): JsonCompatible {
  return { created: record } as unknown as JsonCompatible;
}

/**
 * Build a log detail object for an UPDATE action.
 * Captures original values and changed values, plus the list of changed field names.
 */
export function buildUpdateLogDetail(
  before: object,
  after: object,
): JsonCompatible {
  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(afterObj)) {
    const beforeVal = beforeObj[key];
    const afterVal = afterObj[key];

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes[key] = { from: beforeVal, to: afterVal };
    }
  }

  return {
    before: { id: beforeObj.id, name: beforeObj.name as string | undefined },
    after: { id: afterObj.id, name: afterObj.name as string | undefined },
    changes,
  } as unknown as JsonCompatible;
}

/**
 * Build a log detail object for a DELETE action.
 * Captures what was deleted.
 */
export function buildDeleteLogDetail(record: object): JsonCompatible {
  const r = record as Record<string, unknown>;
  return { deleted: { id: r.id, name: r.name as string | undefined } } as unknown as JsonCompatible;
}

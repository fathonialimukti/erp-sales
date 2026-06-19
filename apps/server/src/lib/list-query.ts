import type { Prisma } from '../prisma/generated/client';

export type PaginationInput = {
  page?: number;
  limit?: number;
  search?: string | undefined;
};

export function buildPaginationParams(input: PaginationInput | undefined) {
  const page = Math.max(1, input?.page ?? 1);
  const limit = Math.max(1, Math.min(100, input?.limit ?? 10));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta({
  page,
  limit,
  total,
}: {
  page: number;
  limit: number;
  total: number;
}) {
  return {
    total,
    totalPages: Math.ceil(total / limit),
    page,
    limit,
  };
}

export function buildTextSearchWhere<T extends readonly string[]>(
  search: string | undefined,
  fields: T,
): Record<string, unknown> | undefined {
  if (!search || search.trim().length === 0) return undefined;
  const trimmed = search.trim();

  if (fields.length === 1) {
    const result: Record<string, unknown> = {};
    result[fields[0] as string] = { contains: trimmed, mode: 'insensitive' };
    return result;
  }

  return {
    OR: fields.map((field) => {
      const clause: Record<string, unknown> = {};
      clause[field as string] = { contains: trimmed, mode: 'insensitive' };
      return clause;
    }),
  } as Record<string, unknown>;
}

// Export the createListInputSchema from @repo/schemas
export { createListInputSchema } from '@repo/schemas/common';
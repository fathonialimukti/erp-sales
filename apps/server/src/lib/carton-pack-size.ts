import { TRPCError } from '@trpc/server';
import {
  assertCartonMultiple,
  cartonCount,
  cartonErrorMessage,
  nearestCartonMultiples,
} from '@repo/schemas/sales-order';
import { type DbClient, prisma } from './prisma.js';

/**
 * Whole-carton gate for sales-order lines (SPEC §Validation — server, source of
 * truth). Resolves each line's pack size, rejects any line whose piece quantity
 * is not a positive whole multiple of it, and returns the lines with the
 * `packSize` snapshot attached ready to persist.
 *
 * One gate covers every write path: the SO create/update procedures, AI
 * extraction (whose non-throwing twin, {@link checkCartonLines}, turns the
 * pack-size failure into the buyer reply) and any future import.
 *
 * @param db           Prisma client or transaction client.
 * @param lines        Order lines as they arrive on the wire — quantity in pieces.
 * @param existing     Existing line snapshots keyed by skuId. When a line keeps
 *                     its sku, validate and keep its own snapshot; a swapped sku
 *                     falls through to the live Sku.packSize and re-snapshots.
 *                     Omit for create.
 */
export async function resolveCartonLines<T extends { skuId: string; quantity: number }>(
  db: DbClient = prisma,
  lines: T[],
  existing: Map<string, number> = new Map(),
): Promise<Array<T & { packSize: number }>> {
  const result = await checkCartonLines(db, lines, existing);
  if (result.ok) return result.lines;
  if (result.kind === 'unknown_sku') {
    throw new TRPCError({ code: 'NOT_FOUND', message: result.message });
  }
  throw new TRPCError({ code: 'BAD_REQUEST', message: result.rejection.message });
}

/**
 * Carton rejection for a single line (SPEC §2.1). Everything the agent needs to
 * write the buyer-facing reply: the sku, its pack size, the requested quantity,
 * and the two nearest valid multiples with their carton counts.
 */
export type CartonRejection = {
  skuName: string;
  packSize: number;
  requestedQuantity: number;
  lowerMultiple: number;
  upperMultiple: number;
  lowerCartons: number;
  upperCartons: number;
  message: string;
};

export function buildCartonRejection(
  quantity: number,
  packSize: number,
  skuName: string,
): CartonRejection {
  const { lower, upper } = nearestCartonMultiples(quantity, packSize);
  return {
    skuName,
    packSize,
    requestedQuantity: quantity,
    lowerMultiple: lower,
    upperMultiple: upper,
    lowerCartons: cartonCount(lower, packSize),
    upperCartons: cartonCount(upper, packSize),
    message: cartonErrorMessage(skuName, packSize),
  };
}

/**
 * Outcome of a carton check that reports instead of throwing. Agent tools
 * (SPEC §Email CRM agent prompt) return it to the model so a broken carton
 * becomes the buyer-facing reply instead of a failed run.
 *
 * - `unknown_sku` — failure isolation: the pack size could not be resolved, so
 *   the agent asks the buyer to clarify. It must never guess a multiple.
 * - `carton_multiple` — the line is not a whole carton; `rejection` holds the
 *   two nearest valid multiples to quote.
 */
export type CartonCheckResult<T> =
  | { ok: true; lines: Array<T & { packSize: number }> }
  | { ok: false; kind: 'unknown_sku'; message: string }
  | { ok: false; kind: 'carton_multiple'; rejection: CartonRejection };

/**
 * Non-throwing twin of {@link resolveCartonLines}. Same lookup, same gate, same
 * snapshots — but a bad line reports instead of raising, so an agent run stays
 * open and replies. The thrown twin is what a tRPC procedure wants; this is what
 * an agent tool wants.
 */
export async function checkCartonLines<T extends { skuId: string; quantity: number }>(
  db: DbClient = prisma,
  lines: T[],
  existing: Map<string, number> = new Map(),
): Promise<CartonCheckResult<T>> {
  if (lines.length === 0) return { ok: true, lines: [] };

  const skuIds = lines.map((line) => line.skuId);
  const skus = await db.sku.findMany({
    where: { id: { in: skuIds } },
    select: { id: true, name: true, packSize: true },
  });
  const skuById = new Map(skus.map((sku) => [sku.id, sku]));

  const missing = [...new Set(skuIds)].filter((skuId) => !skuById.has(skuId));
  if (missing.length > 0) {
    return {
      ok: false,
      kind: 'unknown_sku',
      message: `Product not found: ${missing.join(', ')}`,
    };
  }

  for (const line of lines) {
    const sku = skuById.get(line.skuId)!;
    const packSize = existing.get(line.skuId) ?? sku.packSize;
    try {
      assertCartonMultiple(line.quantity, packSize, sku.name);
    } catch (error) {
      // Re-throw anything that is not the carton rule so a real lookup failure
      // still surfaces; the carton rule becomes the reportable rejection.
      if (!(error instanceof TRPCError) || error.code !== 'BAD_REQUEST') throw error;
      return {
        ok: false,
        kind: 'carton_multiple',
        rejection: buildCartonRejection(line.quantity, packSize, sku.name),
      };
    }
  }

  return {
    ok: true,
    lines: lines.map((line) => {
      const sku = skuById.get(line.skuId)!;
      return { ...line, packSize: existing.get(line.skuId) ?? sku.packSize };
    }),
  };
}

/**
 * Flat `{ kind, message }` of a failed check — for run state and logs, where
 * the union shape of {@link CartonCheckResult} is not wanted.
 */
export function cartonBlockedSummary(
  result: Exclude<CartonCheckResult<unknown>, { ok: true }>,
): { kind: string; message: string } {
  return result.kind === 'unknown_sku'
    ? { kind: result.kind, message: result.message }
    : { kind: result.kind, message: result.rejection.message };
}

/**
 * The payload an agent tool returns when the carton gate refuses an order, worded
 * so the model writes the SPEC §2.1 reply without freestyling the numbers.
 */
export function cartonToolError(result: Exclude<CartonCheckResult<unknown>, { ok: true }>) {
  if (result.kind === 'unknown_sku') {
    return {
      error: 'unknown_sku' as const,
      message: result.message,
      action:
        'Do NOT create the order. You could not resolve this product from the product master, so you cannot know its pack size. Ask the buyer to confirm the exact product code and quantity. Never guess or round a quantity on the buyer\'s behalf.',
    };
  }
  const rejection = result.rejection;
  return {
    error: 'carton_multiple' as const,
    message: rejection.message,
    skuName: rejection.skuName,
    packSize: rejection.packSize,
    requestedQuantity: rejection.requestedQuantity,
    lowerMultiple: rejection.lowerMultiple,
    upperMultiple: rejection.upperMultiple,
    lowerCartons: rejection.lowerCartons,
    upperCartons: rejection.upperCartons,
    action:
      'Do NOT create the order — no draft, no partial line. Reply to the buyer in their own language using exactly these numbers: name the product, state the pack size, give the two nearest valid quantities with their carton counts, and ask which one they want. Create the draft only once the buyer confirms one of them.',
  };
}

/** Max product rows injected into an agent prompt — keeps the system prompt small. */
const MAX_PROMPT_SKUS = 30;

/**
 * SPEC §Email CRM agent prompt: pack sizes are injected from live `Sku` records
 * at prompt-build time — never hardcoded, never KB-looked-up — so a repack can
 * never leave the agent quoting a stale pack size. Only products the buyer
 * actually named in `threadText` are injected, so a long catalog cannot bloat
 * the prompt and unrelated products stay out of the reply.
 *
 * Returns the whole instruction block (rule + live pack-size table), ready to
 * splice into the system prompt. Pure formatting: every fact in it came from the
 * query, nothing is embedded in this code.
 */
export async function buildCartonPromptContext(
  db: DbClient = prisma,
  threadText: string,
): Promise<string> {
  const skus = await db.sku.findMany({
    where: { status: 'ACTIVE' },
    select: { code: true, name: true, packSize: true },
    take: 500,
  });

  const haystack = threadText.toLowerCase();
  const mentioned = skus
    .filter((sku) => {
      const byCode = sku.code ? haystack.includes(sku.code.toLowerCase()) : false;
      const byName = sku.name.length >= 3 && haystack.includes(sku.name.toLowerCase());
      return byCode || byName;
    })
    .slice(0, MAX_PROMPT_SKUS);

  const table = mentioned.map((sku) => {
    const label = sku.code ? `${sku.name} (${sku.code})` : sku.name;
    return sku.packSize > 1
      ? `- ${label}: ${sku.packSize} pcs per carton`
      : `- ${label}: sold per piece (pack size 1)`;
  });

  return [
    'CARTON RULES (whole-carton sales — these are the selling model, not a suggestion):',
    '- Every product is sold per carton only. Each product has a pack size (pcs per carton); an order line quantity must be a positive whole multiple of that pack size. A pack size of 1 means the product is sold per piece and any quantity is valid.',
    '- If a requested quantity is NOT a carton multiple, you must NOT create the order — not even a draft. createDraftOrder refuses it and tells you why. Reply naming the product, its pack size, and the two nearest valid quantities (in pieces and cartons), and ask the buyer which one they want. Create the draft only once the buyer confirms a valid multiple.',
    '- If you cannot resolve a product\'s pack size (unknown product, tool error, product not listed below), ask the buyer to confirm the exact product code and quantity. Never guess, round, or adjust a quantity on the buyer\'s behalf.',
    '- Reply in the buyer\'s language — including the carton question above.',
    '- The pack sizes below are read live from the product master for this run. A product can be repacked at any time, so trust the createDraftOrder / listProducts result over this table when they disagree.',
    '',
    'PRODUCT PACK SIZES (live from the product master):',
    table.length > 0
      ? table.join('\n')
      : '(None of the products in the thread matched the product master. Call listProducts to identify them, and never assume a pack size.)',
  ].join('\n');
}

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import {
  buildCartonPromptContext,
  buildCartonRejection,
  cartonBlockedSummary,
  cartonToolError,
  checkCartonLines,
  resolveCartonLines,
} from '../../lib/carton-pack-size.js';
import { createEmailConciergeTools, type ConciergeRunState } from '../../lib/email-concierge-tools.js';
import { AGENT_STATUS_AWAITING_BUYER_CONFIRMATION } from '../../lib/email-concierge.js';
import { prisma } from '../../lib/prisma.js';

// SPEC §2.1: an email order whose quantity is not a whole carton must create no
// sales order at all — the gate reports to the agent, which replies to the buyer
// with the two nearest valid multiples, and the conversation waits for the
// buyer's confirmation instead of entering the order book.

const suffix = randomUUID();
let regionId: string;
let areaId: string;
let customerId: string;
let outletId: string;
let cartonSkuId: string;
let pieceSkuId: string;
let conversationId: string;
let conversationIds: string[] = [];

beforeAll(async () => {
  const region = await prisma.region.create({
    data: { name: `Carton region ${suffix}`, code: `CR-${suffix.slice(0, 8)}` },
  });
  regionId = region.id;
  const area = await prisma.area.create({
    data: { name: `Carton area ${suffix}`, code: `CA-${suffix.slice(0, 8)}`, regionId },
  });
  areaId = area.id;
  const customer = await prisma.customer.create({
    data: { name: `Carton customer ${suffix}`, status: 'ACTIVE' },
  });
  customerId = customer.id;
  const outlet = await prisma.outlet.create({
    data: { name: `Carton outlet ${suffix}`, customerId, areaId, status: 'ACTIVE' },
  });
  outletId = outlet.id;

  const cartonSku = await prisma.sku.create({
    data: {
      name: `Carton Test Product A ${suffix}`,
      code: `CTPA-${suffix.slice(0, 8)}`,
      baseUnit: 'pcs',
      packSize: 20,
      status: 'ACTIVE',
    },
  });
  cartonSkuId = cartonSku.id;
  const pieceSku = await prisma.sku.create({
    data: {
      name: `Carton Test Product B ${suffix}`,
      code: `CTPB-${suffix.slice(0, 8)}`,
      baseUnit: 'pcs',
      packSize: 1,
      status: 'ACTIVE',
    },
  });
  pieceSkuId = pieceSku.id;

  const conversation = await prisma.emailConversation.create({
    data: { email: `carton-${suffix}@example.com`, subject: 'Order' },
  });
  conversationId = conversation.id;
  conversationIds.push(conversationId);
});

afterAll(async () => {
  // Order book first: the whole point is that no order was written, but a
  // regression would leak rows, so clean them up before the parents go.
  await prisma.salesOrder.deleteMany({ where: { emailConversationId: { in: conversationIds } } });
  for (const id of conversationIds) {
    await prisma.emailConversation.delete({ where: { id } }).catch(() => {});
  }
  await prisma.sku.deleteMany({ where: { id: { in: [cartonSkuId, pieceSkuId] } } }).catch(() => {});
  await prisma.outlet.deleteMany({ where: { id: outletId } }).catch(() => {});
  await prisma.customer.deleteMany({ where: { id: customerId } }).catch(() => {});
  await prisma.area.deleteMany({ where: { id: areaId } }).catch(() => {});
  await prisma.region.deleteMany({ where: { id: regionId } }).catch(() => {});
});

describe('checkCartonLines', () => {
  it('accepts a whole-carton quantity and snapshots the pack size', async () => {
    const result = await checkCartonLines(prisma, [
      { skuId: cartonSkuId, quantity: 60 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines).toEqual([{ skuId: cartonSkuId, quantity: 60, packSize: 20 }]);
    }
  });

  it('accepts any quantity for a piece-only sku', async () => {
    const result = await checkCartonLines(prisma, [
      { skuId: pieceSkuId, quantity: 7 },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lines[0]?.packSize).toBe(1);
  });

  it('reports a non-multiple with the two nearest valid multiples', async () => {
    const result = await checkCartonLines(prisma, [
      { skuId: cartonSkuId, quantity: 50 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok && result.kind === 'carton_multiple') {
      expect(result.rejection).toEqual({
        skuName: expect.stringContaining('Carton Test Product A'),
        packSize: 20,
        requestedQuantity: 50,
        lowerMultiple: 40,
        upperMultiple: 60,
        lowerCartons: 2,
        upperCartons: 3,
        message: `${result.rejection.skuName} is only sold per carton of 20 pcs`,
      });
    }
  });

  it('keeps the line snapshot when one is supplied (edit-after-repack)', async () => {
    const result = await checkCartonLines(
      prisma,
      [{ skuId: cartonSkuId, quantity: 40 }],
      new Map([[cartonSkuId, 20]]),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lines[0]?.packSize).toBe(20);
  });

  it('isolates unknown skus instead of guessing a multiple', async () => {
    const result = await checkCartonLines(prisma, [
      { skuId: '01UNKNOWN000000000000000000', quantity: 60 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.kind).toBe('unknown_sku');
  });

  it('is the non-throwing twin of resolveCartonLines', async () => {
    const check = await checkCartonLines(prisma, [{ skuId: cartonSkuId, quantity: 50 }]);
    expect(check.ok).toBe(false);
    await expect(
      resolveCartonLines(prisma, [{ skuId: cartonSkuId, quantity: 50 }]),
    ).rejects.toThrow('is only sold per carton of 20 pcs');

    const unknown = await checkCartonLines(prisma, [
      { skuId: '01UNKNOWN000000000000000001', quantity: 60 },
    ]);
    expect(unknown.ok).toBe(false);
    await expect(
      resolveCartonLines(prisma, [{ skuId: '01UNKNOWN000000000000000001', quantity: 60 }]),
    ).rejects.toThrow('Product not found');
  });
});

describe('cartonToolError', () => {
  it('turns a rejection into the buyer-facing instruction for the agent', () => {
    const rejection = buildCartonRejection(50, 20, 'Product A');
    const payload = cartonToolError({ ok: false, kind: 'carton_multiple', rejection });
    expect(payload).toMatchObject({
      error: 'carton_multiple',
      message: 'Product A is only sold per carton of 20 pcs',
      skuName: 'Product A',
      packSize: 20,
      requestedQuantity: 50,
      lowerMultiple: 40,
      upperMultiple: 60,
      lowerCartons: 2,
      upperCartons: 3,
    });
    expect(payload.action).toContain('Do NOT create the order');
  });

  it('forbids guessing when the pack size is unknown', () => {
    const payload = cartonToolError({
      ok: false,
      kind: 'unknown_sku',
      message: 'Product not found: 01UNKNOWN',
    });
    expect(payload.error).toBe('unknown_sku');
    expect(payload.action).toContain('Never guess');
    expect(cartonBlockedSummary({ ok: false, kind: 'unknown_sku', message: 'm' })).toEqual({
      kind: 'unknown_sku',
      message: 'm',
    });
  });
});

describe('email concierge createDraftOrder gate', () => {
  // The AI SDK's execute takes (input, options); only the input matters here.
  const execOptions = {} as never;

  const toolsForRun = () =>
    createEmailConciergeTools({
      conversationId,
      customerId,
      state: { createdOrderDocNumbers: [] },
    });

  it('creates no order on a non-carton quantity and reports the multiples', async () => {
    const tools = toolsForRun();
    const result = await tools.createDraftOrder.execute(
      {
        customerId,
        outletId,
        items: [{ skuId: cartonSkuId, quantity: 50, unitPrice: 100 }],
      },
      execOptions,
    );

    expect(result).toMatchObject({
      error: 'carton_multiple',
      packSize: 20,
      requestedQuantity: 50,
      lowerMultiple: 40,
      upperMultiple: 60,
      lowerCartons: 2,
      upperCartons: 3,
    });

    // The invariant: nothing entered the order book.
    const created = await prisma.salesOrder.count({
      where: { emailConversationId: conversationId },
    });
    expect(created).toBe(0);
  });

  it('records the block so the conversation waits on the buyer', async () => {
    const state: ConciergeRunState = { createdOrderDocNumbers: [] };
    const tools = createEmailConciergeTools({
      conversationId,
      customerId,
      state,
    });
    await tools.createDraftOrder.execute(
      {
        customerId,
        outletId,
        items: [{ skuId: cartonSkuId, quantity: 25, unitPrice: 100 }],
      },
      execOptions,
    );
    expect(state.cartonBlocked?.kind).toBe('carton_multiple');
    // SPEC §2.1 step 3: awaiting buyer confirmation, not a new mechanism.
    expect(AGENT_STATUS_AWAITING_BUYER_CONFIRMATION).toBe('AWAITING_BUYER_CONFIRMATION');
  });

  it('creates no order and does not guess when the sku is unknown', async () => {
    const tools = toolsForRun();
    const result = await tools.createDraftOrder.execute(
      {
        customerId,
        outletId,
        items: [{ skuId: '01UNKNOWN000000000000000002', quantity: 60, unitPrice: 100 }],
      },
      execOptions,
    );
    expect(result).toMatchObject({ error: 'unknown_sku' });
    const created = await prisma.salesOrder.count({
      where: { emailConversationId: conversationId },
    });
    expect(created).toBe(0);
  });
});

describe('buildCartonPromptContext', () => {
  it('injects live pack sizes for the products the buyer named', async () => {
    const thread = `Please send 50 pcs of CTPA-${suffix.slice(0, 8)} to our outlet.`;
    const context = await buildCartonPromptContext(prisma, thread);
    expect(context).toContain('CARTON RULES');
    expect(context).toContain(`CTPA-${suffix.slice(0, 8)}`);
    expect(context).toContain('20 pcs per carton');
    // Piece-only sku is not in the thread, so it must not leak in.
    expect(context).not.toContain(`CTPB-${suffix.slice(0, 8)}`);
  });

  it('carries the rule even when no product matches', async () => {
    const context = await buildCartonPromptContext(prisma, 'a product nobody sells');
    expect(context).toContain('CARTON RULES');
    expect(context).toContain('never assume a pack size');
  });
});

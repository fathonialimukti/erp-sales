import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PassThrough } from 'node:stream';

// JWT_SECRET is read at express-auth module init — must exist before any import runs.
vi.hoisted(() => {
  process.env.JWT_SECRET ??= 'test-sales-order-pdf-secret';
});

// The PDF route and the auth middleware share one Prisma client module —
// mock it once so both the permission gate and the record load are stubbed.
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    salesOrder: { findUnique: vi.fn() },
    revokedToken: { findUnique: vi.fn(async () => null) },
  },
}));

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { salesOrderPdfHandler } from '../../routes/sales-order-pdf.js';
import { prisma } from '../../lib/prisma.js';

const SECRET = process.env.JWT_SECRET as string;
const USER_ID = '01HZX3WKY5Q8T2R4N9MCV6B7AE';
const ORDER_ID = '01HZX3WKY5Q8T2R4N9MCV6B7AD';

const SALES_ORDER_ROW = {
  id: ORDER_ID,
  documentNumber: 'SO/2026 #12',
  date: new Date('2026-09-01T00:00:00Z'),
  currency: 'IDR',
  paymentTerms: 'Net 30',
  approvalStatus: 'APPROVED',
  subtotal: '1000000',
  discountTotal: '0',
  taxTotal: '110000',
  grandTotal: '1110000',
  notes: 'Terima kasih',
  expectedDeliveryDate: null,
  customer: { id: 'c1', name: 'PT Maju Jaya' },
  outlet: null,
  area: { id: 'a1', name: 'Jakarta' },
  createdBy: { id: 'u1', name: 'Ada' },
  approvedBy: null,
  items: [
    {
      id: 'i1',
      sku: { id: 's1', name: 'Kopi Bubuk 200g', code: 'KPI-200', baseUnit: 'PCS' },
      quantity: '10',
      unitPrice: '100000',
      discountPercent: null,
      taxPercent: '11',
      lineTotal: '1110000',
      notes: null,
      sortOrder: 0,
    },
  ],
};

interface Harness {
  res: PassThrough & Response;
  headers: Record<string, string>;
  statusCode: number;
  body: Buffer;
}

function makeStreamRes(): Harness {
  const res = new PassThrough() as PassThrough & Response;
  const headers: Record<string, string> = {};
  const state = { statusCode: 200 };
  (res as unknown as Record<string, unknown>).setHeader = (name: string, value: string) => {
    headers[name] = value;
  };
  (res as unknown as Record<string, unknown>).status = (code: number) => {
    state.statusCode = code;
    return res;
  };
  (res as unknown as Record<string, unknown>).json = (payload: unknown) => {
    chunks.push(Buffer.from(JSON.stringify(payload)));
    res.end();
    return res;
  };
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  const harness = { res, headers, get statusCode() { return state.statusCode; }, body: Buffer.alloc(0) };
  res.on('end', () => {
    harness.body = Buffer.concat(chunks);
  });
  return harness;
}

async function callHandler(
  options: { locale?: string; roleNamePermissions?: string[]; orderRow?: unknown } = {},
): Promise<Harness> {
  const permissions = options.roleNamePermissions ?? ['sales-order@read'];
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: USER_ID,
    email: 'pdf-user@example.com',
    name: 'PDF User',
    role: { permissions: permissions.map((name) => ({ permission: { name } })) },
  } as never);
  vi.mocked(prisma.salesOrder.findUnique).mockResolvedValue(
    (options.orderRow === undefined ? SALES_ORDER_ROW : options.orderRow) as never,
  );

  const token = jwt.sign({ userId: USER_ID, email: 'pdf-user@example.com', name: 'PDF User' }, SECRET, {
    expiresIn: '1h',
  });
  const req = {
    params: { id: ORDER_ID },
    query: options.locale === undefined ? {} : { locale: options.locale },
    headers: { authorization: `Bearer ${token}` },
  } as unknown as Request;

  const harness = makeStreamRes();
  await salesOrderPdfHandler(req, harness.res);
  await new Promise((resolve) => harness.res.on('end', resolve));
  return harness;
}

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

afterAll(async () => {
  vi.restoreAllMocks();
});

describe('GET /api/sales-order/:id/pdf', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const req = { params: { id: ORDER_ID }, query: {}, headers: {} } as unknown as Request;
    const harness = makeStreamRes();
    await salesOrderPdfHandler(req, harness.res);
    expect(harness.statusCode).toBe(401);
  });

  it('rejects requests without sales-order@read with 403', async () => {
    const harness = await callHandler({ roleNamePermissions: ['region@read'] });
    expect(harness.statusCode).toBe(403);
  });

  it('returns 404 for an unknown sales order', async () => {
    const harness = await callHandler({ orderRow: null });
    expect(harness.statusCode).toBe(404);
  });

  it('streams an inline PDF with a sanitized ASCII filename (?locale=en)', async () => {
    const harness = await callHandler({ locale: 'en' });
    expect(harness.statusCode).toBe(200);
    expect(harness.headers['Content-Type']).toBe('application/pdf');
    // documentNumber 'SO/2026 #12' must not leak '#' or '/' into the header.
    expect(harness.headers['Content-Disposition']).toBe('inline; filename="SO-2026-12.pdf"');
    expect(harness.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('defaults a missing or invalid locale to en and still streams a PDF', async () => {
    for (const locale of [undefined, 'fr']) {
      const harness = await callHandler(locale === undefined ? {} : { locale });
      expect(harness.statusCode).toBe(200);
      expect(harness.headers['Content-Type']).toBe('application/pdf');
      expect(harness.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    }
  });

  it('accepts the id locale (?locale=id)', async () => {
    const harness = await callHandler({ locale: 'id' });
    expect(harness.statusCode).toBe(200);
    expect(harness.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});

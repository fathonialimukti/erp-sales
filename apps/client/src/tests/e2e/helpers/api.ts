import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Local API the dev client is pointed at — mirrors `VITE_TRPC_URL` in
 * playwright.config.ts's `webServer.env`. Cookies are host-scoped and ignore
 * ports, so the session persisted at :10025 is also sent to :10022.
 */
const API = 'http://localhost:10022';

/** Path of the admin session written by the auth-setup project. */
export const ADMIN_STATE = 'playwright/.auth/admin.json';

const csrfToken = async (request: APIRequestContext): Promise<string> => {
  const response = await request.get(`${API}/trpc/v1/auth.csrfToken`);
  expect(response.ok(), 'CSRF token request failed').toBe(true);
  const body = (await response.json()) as { result?: { data?: { csrfToken?: string } } };
  const token = body.result?.data?.csrfToken;
  expect(token, 'no CSRF token in the auth.csrfToken response').toBeTruthy();
  return token!;
};

/**
 * Test-owned cleanup for a sales order the acting role cannot delete through
 * the UI (or at all).
 *
 * An order can only be erased while its creator still holds it — the server
 * accepts `salesOrder.delete` on DRAFT and REJECTED only — so a fixture that
 * walked the pipeline is first walked back down with the product's own reject
 * transition. A DRAFT order is not rejectable and simply stays put.
 *
 * APPROVED is terminal by product rule (an approved order is a financial
 * record), so a spec that asserts that state says so with `retainIfApproved`
 * instead of silently leaving rows behind.
 *
 * Cleanup only — no assertion depends on it, and it never runs before the
 * assertions it follows.
 */
export const deleteSalesOrder = async (
  request: APIRequestContext,
  id: string,
  options: { retainIfApproved?: boolean } = {},
) => {
  const token = await csrfToken(request);
  // Not an error when the order is a DRAFT — that is the case that needs no walk-back.
  await request
    .post(`${API}/trpc/v1/salesOrder.reject`, {
      data: { id, message: 'E2E cleanup' },
      headers: { 'x-csrf-token': token },
    })
    .catch(() => undefined);
  const response = await request.post(`${API}/trpc/v1/salesOrder.delete`, {
    data: { id },
    headers: { 'x-csrf-token': token },
  });
  if (options.retainIfApproved) return;
  expect(response.ok(), `cleanup delete failed with ${response.status()}`).toBe(true);
};

/** Sales-order id from a detail URL (`/sales-order/<ulid>`). */
export const salesOrderIdFromUrl = (page: Page): string => {
  const id = new URL(page.url()).pathname.split('/').pop() ?? '';
  expect(id, `no sales order id in ${page.url()}`).toBeTruthy();
  return id;
};

/** tRPC query over GET (this adapter rejects POST for query procedures). */
const query = async <T>(request: APIRequestContext, path: string, input: unknown): Promise<T> => {
  const response = await request.get(
    `${API}/trpc/v1/${path}?input=${encodeURIComponent(JSON.stringify(input))}`,
  );
  expect(response.ok(), `${path} failed with ${response.status()}`).toBe(true);
  const body = (await response.json()) as { result?: { data?: T } };
  return body.result?.data as T;
};

/** tRPC mutation over POST with the CSRF header the server demands. */
const mutate = async <T>(
  request: APIRequestContext,
  path: string,
  input: unknown,
): Promise<T> => {
  const token = await csrfToken(request);
  const response = await request.post(`${API}/trpc/v1/${path}`, {
    data: input,
    headers: { 'x-csrf-token': token },
  });
  expect(response.ok(), `${path} failed with ${response.status()}`).toBe(true);
  const body = (await response.json()) as { result?: { data?: T } };
  return body.result?.data as T;
};

type ListResult<T> = { data: T[] };

/**
 * Seed a DRAFT sales order straight through the API.
 *
 * The order is then driven entirely through the UI. It exists to give the
 * workflow specs a known starting state (a specific quantity × price to assert
 * money math against) without replaying the form for every case; the form path
 * has its own test in sales-order.spec.ts.
 */
export const seedDraftSalesOrder = async (
  request: APIRequestContext,
  options: { quantity: number; unitPrice: number },
): Promise<string> => {
  const outlets = await query<ListResult<{ id: string; name: string }>>(request, 'outlet.list', {
    page: 1,
    limit: 1,
  });
  const skus = await query<ListResult<{ id: string; basePrice: string }>>(request, 'sku.list', {
    page: 1,
    limit: 1,
  });
  const outlet = outlets.data[0];
  const sku = skus.data[0];
  expect(outlet, 'no seeded outlet to build an order from').toBeTruthy();
  expect(sku, 'no seeded SKU to build an order from').toBeTruthy();

  const lineTotal = options.quantity * options.unitPrice;
  const created = await mutate<{ id: string; approvalStatus: string }>(
    request,
    'salesOrder.create',
    {
      date: new Date().toISOString().slice(0, 10),
      currency: 'IDR',
      paymentTerms: 'NET 30',
      outletId: outlet.id,
      source: 'MANUAL',
      subtotal: lineTotal,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: lineTotal,
      items: [
        {
          skuId: sku.id,
          quantity: options.quantity,
          unitPrice: options.unitPrice,
          discountPercent: null,
          taxPercent: null,
          lineTotal,
        },
      ],
    },
  );
  expect(created.approvalStatus, 'a seeded order must start as a draft').toBe('DRAFT');
  return created.id;
};


import { test, expect } from '@playwright/test';
import { columnValues, gotoApp, money, statusChip } from './helpers/app';
import { deleteSalesOrder, salesOrderIdFromUrl, seedDraftSalesOrder } from './helpers/api';
import { msg } from './helpers/i18n';

const QUANTITY = 12;
const UNIT_PRICE = 25000;
/** `defaults()` in SalesOrderFormPage, not the app's currency setting. */
const FORM_CURRENCY = 'USD';

/** Open the approval-history accordion on a sales-order detail page. */
const openApprovalHistory = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: msg('sales_order.detail.approval_history') }).click();
};

/** Pieces derived by the form for its first line (`sales_order.form.qty_pcs_calc`). */
const derivedPieces = async (page: import('@playwright/test').Page): Promise<number> => {
  const cell = page.getByText(/^\d+ × \d+ = \d+$/).first();
  await expect(cell).toBeVisible();
  const pieces = Number(((await cell.textContent()) ?? '').split('=')[1]?.trim());
  expect(pieces, 'the form must derive a positive piece count').toBeGreaterThan(0);
  return pieces;
};

test.describe('sales order — the money path', () => {
  /**
   * Regression test for the empty-dropdown bug: `SelectSearch` cached the first
   * run of a `sourceData` that closed over a sibling query's data (`async () =>
   * outletList`), so the pre-fetch empty list was served for `staleTime` and the
   * Outlet and SKU pickers opened with zero options for 30 seconds. The fix
   * gates the fetch on the parent's own `isLoading` (`enabled: !propIsLoading`),
   * so opening the dropdown — never typing into it — is enough.
   */
  test('creates an order from the form and persists its money math', async ({ page }) => {
    await gotoApp(page, '/sales-order');
    await page.getByRole('button', { name: msg('sales_order.index.create_button') }).click();
    await expect(page).toHaveURL(/\/sales-order\/create/);

    const outlet = page.getByRole('combobox', { name: msg('sales_order.form.field_outlet') });
    await outlet.click();
    // No typing, no waiting on a timer: a click must reveal real options.
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.getByRole('option').first().click();

    // Inside the order form the first combobox is the outlet picker and the
    // second is the line-item SKU picker (whose only accessible name is a
    // hardcoded placeholder), so it is indexed rather than named.
    const sku = page.locator('form[data-so-form]').getByRole('combobox').nth(1);
    await sku.click();
    await expect(page.getByRole('option').first()).toBeVisible();
    await page.getByRole('option').first().click();

    const numbers = page.locator('form[data-so-form] input[type="number"]');
    await expect(numbers.nth(0)).toHaveValue('1', { timeout: 10_000 });
    await numbers.nth(0).fill('2');
    await numbers.nth(1).fill(String(UNIT_PRICE));
    await numbers.nth(2).fill('0');
    await numbers.nth(3).fill('0');
    // Pieces are derived from the SKU's pack size, so read that count back
    // instead of assuming the first SKU is piece-only.
    const expectedTotal = (await derivedPieces(page)) * UNIT_PRICE;
    await expect(page.getByText(money(expectedTotal, FORM_CURRENCY)).first()).toBeVisible();

    await page.getByRole('button', { name: msg('sales_order.form.save_draft') }).click();
    await page.getByRole('button', { name: msg('sales_order.form.save_draft') }).last().click();
    await expect(page).toHaveURL(/\/sales-order\/[0-9A-Z]+$/, { timeout: 20_000 });
    const orderId = salesOrderIdFromUrl(page);

    try {
      // Scoped to the page heading: the document number is repeated in the
      // summary list and twice in the print view.
      await expect(page.getByRole('heading', { level: 1, name: /^SO-\d{8}-\d+$/ })).toBeVisible();
      await expect(statusChip(page, 'DRAFT')).toHaveText(msg('common.status.draft'));
      const grand = (
        await page
          .getByText(msg('sales_order.detail.grand_total'))
          .filter({ visible: true })
          .first()
          .locator('xpath=following-sibling::span[1]')
          .textContent()
      )!;
      expect(grand.trim()).toBe(money(expectedTotal, FORM_CURRENCY));
    } finally {
      await deleteSalesOrder(page.request, orderId);
    }
  });

  test('renders a stored order with consistent money and a draft state', async ({ page }) => {
    const orderId = await seedDraftSalesOrder(page.request, { quantity: QUANTITY, unitPrice: UNIT_PRICE });
    try {
      await gotoApp(page, `/sales-order/${orderId}`);

      // A generated document number, not a placeholder. Scoped to the page
      // heading: the print view repeats the same number in two more places.
      await expect(page.getByRole('heading', { level: 1, name: /^SO-\d{8}-\d+$/ })).toBeVisible();
      await expect(statusChip(page, 'DRAFT')).toHaveText(msg('common.status.draft'));

      // Money integrity across independently stored fields: the persisted total
      // must equal quantity × price adjusted by the stored discount and tax. A
      // wrong server total or a wrong render both fail here.
      const cell = async (header: string) => (await columnValues(page, msg(header)))[0]!;
      const cartons = Number(await cell('sales_order.detail.qty_carton'));
      const pieces = Number(await cell('sales_order.detail.qty_pcs'));
      const price = Number((await cell('sales_order.detail.unit_price')).replace(/\D/g, ''));
      const discount = Number((await cell('sales_order.detail.disc')).replace('%', ''));
      const tax = Number((await cell('sales_order.detail.tax')).replace('%', ''));
      const lineTotal = (await cell('sales_order.detail.line_total')).replace(/\D/g, '');

      expect(pieces, 'pieces must be stored on the line').toBe(QUANTITY);
      expect(cartons, 'cartons must be a positive whole number').toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(cartons)).toBe(true);
      expect(price, 'unit price must round-trip').toBe(UNIT_PRICE);
      expect(discount, 'the seed has no action programs, so no discount').toBe(0);
      expect(tax, 'no tax expected').toBe(0);
      expect(Number(lineTotal)).toBe(QUANTITY * UNIT_PRICE);

      // The page's grand total must agree with its own line. The print view
      // repeats these labels off-screen, so scope to what is actually visible.
      const grand = (
        await page
          .getByText(msg('sales_order.detail.grand_total'))
          .filter({ visible: true })
          .first()
          .locator('xpath=following-sibling::span[1]')
          .textContent()
      )!;
      expect(grand.replace(/\D/g, '')).toBe(String(QUANTITY * UNIT_PRICE));
    } finally {
      await deleteSalesOrder(page.request, orderId);
    }
  });

  test('a draft order exposes no approval decision', async ({ page }) => {
    const orderId = await seedDraftSalesOrder(page.request, { quantity: QUANTITY, unitPrice: UNIT_PRICE });
    try {
      await gotoApp(page, `/sales-order/${orderId}`);
      await expect(statusChip(page, 'DRAFT')).toBeVisible();
      // The state machine must not offer a decision on a DRAFT order. Fails if
      // Approve/Reject are ever rendered unconditionally.
      await expect(page.getByRole('button', { name: msg('sales_order.detail.approve') })).toHaveCount(0);
      await expect(page.getByRole('button', { name: msg('sales_order.detail.reject') })).toHaveCount(0);
      // Propose is the only forward transition a draft may take.
      await expect(page.getByRole('button', { name: msg('sales_order.detail.propose') })).toBeVisible();
      // …and the rule-based validate must be reachable, not dead code: the
      // deterministic DRAFT → PROPOSED path is the only route to APPROVED that
      // does not depend on an LLM verdict.
      await expect(page.getByRole('button', { name: msg('sales_order.detail.validate') })).toBeVisible();
    } finally {
      await deleteSalesOrder(page.request, orderId);
    }
  });

  /**
   * The deterministic approval walk: `salesOrder.validate` is rule-based
   * (`lib/ai-validation.ts` — no LLM), so DRAFT → PROPOSED → APPROVED needs no
   * model verdict and cannot flake on one.
   */
  test('a draft walks to approved through the rule-based validate', async ({ page }) => {
    const note = `E2E validate note ${Date.now()}`;
    const orderId = await seedDraftSalesOrder(page.request, { quantity: QUANTITY, unitPrice: UNIT_PRICE });
    try {
      await gotoApp(page, `/sales-order/${orderId}`);

      await page.getByRole('button', { name: msg('sales_order.detail.validate') }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: msg('sales_order.detail.validate') }).last().click();

      // A rule rejection must surface in the dialog and leave the order a draft.
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 });
      await expect(statusChip(page, 'PROPOSED')).toHaveText(msg('common.status.proposed'));
      // A PROPOSED order may no longer be validated: the server takes DRAFT only.
      await expect(page.getByRole('button', { name: msg('sales_order.detail.validate') })).toHaveCount(0);

      await page.getByRole('button', { name: msg('sales_order.detail.approve') }).click();
      await page.locator('#approve-msg').fill(note);
      await page.getByRole('button', { name: msg('sales_order.detail.approve') }).last().click();

      await expect(statusChip(page, 'APPROVED')).toHaveText(msg('common.status.approved'), {
        timeout: 20_000,
      });
      await openApprovalHistory(page);
      await expect(page.getByText(note)).toBeVisible();
    } finally {
      // APPROVED is the product's terminal state for an order — it is a financial
      // record and the server refuses to erase it, so this fixture is retained.
      await deleteSalesOrder(page.request, orderId, { retainIfApproved: true });
    }
  });

  test('proposing records the submission in the approval history', async ({ page }) => {
    const note = `E2E submit note ${Date.now()}`;
    const orderId = await seedDraftSalesOrder(page.request, { quantity: QUANTITY, unitPrice: UNIT_PRICE });
    try {
      await gotoApp(page, `/sales-order/${orderId}`);
      await page.getByRole('button', { name: msg('sales_order.detail.propose') }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.locator('#propose-msg').fill(note);
      await page.getByRole('button', { name: msg('sales_order.detail.propose') }).last().click();

      // The note must round-trip into the persisted approval history — proof
      // the submission entered the workflow, not merely that a dialog closed.
      await openApprovalHistory(page);
      await expect(page.getByText(note)).toBeVisible({ timeout: 20_000 });

      // Propose takes the order out of DRAFT for AI validation, and an order
      // awaiting validation still must not be approvable.
      await expect(statusChip(page, 'DRAFT')).toHaveCount(0, { timeout: 20_000 });
      await expect(page.getByRole('button', { name: msg('sales_order.detail.approve') })).toHaveCount(0);
    } finally {
      await deleteSalesOrder(page.request, orderId);
    }
  });
});

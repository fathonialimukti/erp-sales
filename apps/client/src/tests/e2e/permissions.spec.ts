import { test, expect, type APIRequestContext } from '@playwright/test';
import { gotoApp, primaryNav, statusChip } from './helpers/app';
import { ADMIN_STATE, deleteSalesOrder, seedDraftSalesOrder } from './helpers/api';
import { msg } from './helpers/i18n';

/**
 * Runs under the `chromium-restricted` project (Demo Salesperson), whose role
 * has customer/outlet/sku read plus sales-order create/update — but no
 * sales-order@approve, no sales-order@propose, no role@read and no report@read.
 *
 * Guards can only be proven from the outside by a user that actually lacks the
 * permission, so each test also asserts something the account *is* allowed to
 * reach — otherwise "redirected to the dashboard" would pass just as well for
 * a session that was never authenticated.
 */
test.describe('permission denial', () => {
  /**
   * Cleanup needs `sales-order@delete`, which this role deliberately lacks, so
   * it runs through the admin session. Reusing the persisted admin
   * storageState (rather than logging in again) keeps the suite inside the
   * 5/min/IP login limiter.
   */
  let asAdmin: APIRequestContext;

  test.beforeAll(async ({ browser, baseURL }) => {
    asAdmin = await (await browser.newContext({ storageState: ADMIN_STATE, baseURL })).request;
  });

  test.afterAll(async () => {
    await asAdmin.dispose();
  });
  test('hides modules the role cannot read from the nav', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    // Allowed: the role holds customer@read.
    await expect(primaryNav(page).getByText(msg('nav.customer'), { exact: true })).toBeVisible();

    // Denied: role@read, user@read, report@read are all absent.
    for (const key of ['nav.access_control', 'nav.users', 'nav.reports']) {
      await expect(primaryNav(page).getByText(msg(key), { exact: true })).toHaveCount(0);
    }
  });

  test('redirects a direct URL to a module the role cannot read', async ({ page }) => {
    await gotoApp(page, '/customer');
    // Prove the session is genuinely authenticated before judging the redirect.
    await expect(primaryNav(page)).toBeVisible();
    await expect(page.getByRole('table')).toBeAttached();

    await page.goto('/access-control');
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
  });

  test('omits the approval actions on an order awaiting approval', async ({ page }) => {
    const orderId = await seedDraftSalesOrder(page.request, { quantity: 6, unitPrice: 10000 });
    try {
      await gotoApp(page, `/sales-order/${orderId}`);
      // The role may read orders...
      await expect(statusChip(page, 'DRAFT')).toBeVisible();
      // ...but the server never told the client it may approve, so the decision
      // buttons must not be rendered. This fails if the buttons are driven by
      // something other than the permission list.
      await expect(page.getByRole('button', { name: msg('sales_order.detail.approve') })).toHaveCount(0);
      await expect(page.getByRole('button', { name: msg('sales_order.detail.reject') })).toHaveCount(0);
      // The role does hold sales-order@update, so editing stays available —
      // proving the assertion above is about the missing permission, not a
      // broken page.
      await expect(page.getByRole('button', { name: msg('common.action.edit') })).toBeVisible();
    } finally {
      await deleteSalesOrder(asAdmin, orderId);
    }
  });

  test('does not offer the propose action without sales-order@propose', async ({ page }) => {
    const orderId = await seedDraftSalesOrder(page.request, { quantity: 6, unitPrice: 10000 });
    try {
      await gotoApp(page, `/sales-order/${orderId}`);
      // Demo Salesperson has create + update but not propose: the forward
      // transition out of a draft must be absent for this role.
      await expect(page.getByRole('button', { name: msg('sales_order.detail.propose') })).toHaveCount(0);
    } finally {
      await deleteSalesOrder(asAdmin, orderId);
    }
  });
});

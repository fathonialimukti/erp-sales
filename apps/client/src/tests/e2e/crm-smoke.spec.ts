import { test, expect } from '@playwright/test';
import { gotoApp, primaryNav } from './helpers/app';

// Session comes from the auth-setup project's storageState — no per-test
// login (keeps the suite under the login rate limit).
//
// The rest of the old route-ping suite has been replaced by behavioural specs
// (customer.spec, sales-order.spec, locale.spec, theme.spec, permissions.spec,
// mobile.spec). What is left is the cheap regression net for route wiring and
// lazy chunks: a renamed export or a broken `lazyNamed` fails here in seconds,
// which is the only thing these three were ever good for.
test.describe('route wiring', () => {
  test('dashboard resolves', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    await expect(primaryNav(page)).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('sales order list resolves', async ({ page }) => {
    await gotoApp(page, '/sales-order');
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
  });

  test('access control resolves', async ({ page }) => {
    await gotoApp(page, '/access-control');
    await expect(page.getByRole('table')).toBeAttached({ timeout: 15_000 });
  });
});

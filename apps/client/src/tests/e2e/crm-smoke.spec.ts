import { test, expect } from '@playwright/test';

test.describe('CRM smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@mail.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('main')).toBeAttached({ timeout: 15000 });
  });

  test('dashboard loads', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('main')).toBeAttached();
  });

  test('region page loads and shows table', async ({ page }) => {
    await page.goto('/region');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('area page loads', async ({ page }) => {
    await page.goto('/area');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('customer page loads', async ({ page }) => {
    await page.goto('/customer');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('outlet page loads', async ({ page }) => {
    await page.goto('/outlet');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('sku category page loads', async ({ page }) => {
    await page.goto('/sku-category');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('sku page loads', async ({ page }) => {
    await page.goto('/sku');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('sales order page loads', async ({ page }) => {
    await page.goto('/sales-order');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('invoice page loads', async ({ page }) => {
    await page.goto('/invoice');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('visit log page loads', async ({ page }) => {
    await page.goto('/visit-log');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('action program page loads', async ({ page }) => {
    await page.goto('/action-program');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('event proposal page loads', async ({ page }) => {
    await page.goto('/event-proposal');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('users page loads', async ({ page }) => {
    await page.goto('/users');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('roles page loads', async ({ page }) => {
    await page.goto('/roles');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });

  test('activity logs page loads', async ({ page }) => {
    await page.goto('/activity-logs');
    await expect(page.locator('table')).toBeAttached({ timeout: 10000 });
  });
});
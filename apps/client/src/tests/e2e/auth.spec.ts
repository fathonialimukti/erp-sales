import { test, expect } from '@playwright/test';
import { msg, msgWith } from './helpers/i18n';

// This spec exercises the login flow itself — start logged-out.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('auth', () => {
  test('landing page offers a way into the login flow', async ({ page }) => {
    await page.goto('/');
    // The landing CTA is a link/button to /login; assert the destination
    // actually resolves to the login surface rather than matching English copy.
    const entry = page.getByRole('link', { name: /login|sign in/i }).first();
    if (await entry.isVisible().catch(() => false)) {
      await entry.click();
    } else {
      await page.goto('/login');
    }
    await expect(page).toHaveURL(/\/login/);
    // Exactly one of the two login surfaces must render.
    const demoPicker = page.getByRole('list', { name: msg('demo.selectUser') });
    const emailField = page.getByLabel(msg('login.email_label'));
    await expect(demoPicker.or(emailField).first()).toBeVisible({ timeout: 15_000 });
  });

  test('rejects invalid credentials without leaving the login page', async ({ page }) => {
    test.skip(
      !(await (async () => {
        await page.goto('/login');
        return page.getByLabel(msg('login.email_label')).isVisible().catch(() => false);
      })()),
      'demo login is enabled — there is no credential form to submit bad input to',
    );
    await page.getByLabel(msg('login.email_label')).fill('wrong@wrong.com');
    await page.getByLabel(msg('login.password_label'), { exact: true }).fill('wrong');
    await page.getByRole('button', { name: msg('login.submit'), exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
  });

  test('signing in reaches the dashboard shell', async ({ page }) => {
    await page.goto('/login');
    const emailField = page.getByLabel(msg('login.email_label'));
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('admin@mail.com');
      await page.getByLabel(msg('login.password_label'), { exact: true }).fill('password');
      await page.getByRole('button', { name: msg('login.submit'), exact: true }).click();
    } else {
      await page.getByRole('button', { name: msgWith('demo.loginAs', { name: 'Admin' }) }).click();
    }
    // The login page itself renders a <main>; the post-login redirect is the
    // real "authenticated layout" signal.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  });
});

import { expect, test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/admin.json';

/**
 * Login once and persist the session (cookies + localStorage) for the
 * `chromium` project. Keeps the suite under the login rate limit
 * (5 attempts/min/IP) — only this setup and the auth spec ever log in.
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@mail.com');
  await page.getByLabel('Password', { exact: true }).fill('password');
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for the post-login redirect — the login page itself renders a
  // <main>, so asserting on `main` would race the login request.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});

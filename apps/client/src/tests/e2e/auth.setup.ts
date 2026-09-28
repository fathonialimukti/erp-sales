import { expect, test as setup } from '@playwright/test';
import { ADMIN, loginAs } from './helpers/app';

const authFile = 'playwright/.auth/admin.json';

/**
 * Login once and persist the session (cookies + localStorage) for the
 * `chromium` project. Keeps the suite under the login rate limit
 * (5 attempts/min/IP) — only the setup projects and the auth spec ever
 * authenticate.
 */
setup('authenticate as admin', async ({ page }) => {
  await loginAs(page, ADMIN);

  // The login page itself renders a <main>, so asserting on `main` would race
  // the login request; `loginAs` already waited for the post-login redirect.
  expect(page.url()).toMatch(/\/dashboard/);
  await page.context().storageState({ path: authFile });
});

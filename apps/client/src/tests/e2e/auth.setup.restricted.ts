import { expect, test as setup } from '@playwright/test';
import { RESTRICTED, loginAs } from './helpers/app';

const authFile = 'playwright/.auth/restricted.json';

/**
 * A second persisted session for a *low-privilege* account, so the
 * permission-denial spec can prove the guards instead of asserting they are
 * present. Same pattern as the admin setup — one login per project, never one
 * per test — which keeps the suite at 4 login attempts inside the
 * 5/min/IP limiter (admin setup, restricted setup, and the two in auth.spec).
 */
setup('authenticate as a restricted user', async ({ page }) => {
  await loginAs(page, RESTRICTED);
  expect(page.url()).toMatch(/\/dashboard/);
  await page.context().storageState({ path: authFile });
});

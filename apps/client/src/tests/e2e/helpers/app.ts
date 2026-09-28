import { expect, type Locator, type Page } from '@playwright/test';
import { msg, msgWith } from './i18n';

/** Admin login card on the demo picker / credentials on the classic form. */
export const ADMIN = { email: 'admin@mail.com', password: 'password', name: 'Admin' };
/** Demo Salesperson — read/create/update orders, never approve or propose. */
export const RESTRICTED = {
  email: 'demo.staff@aetherglo.com',
  password: 'password',
  name: 'Demo Staff',
};

/**
 * Sign in through whichever login surface the API is configured for.
 *
 * `DEMO_LOGIN_ENABLED=true` (this repo's own apps/server/.env) swaps the
 * credential form for a one-click demo-account picker, so a spec that only
 * knows `getByLabel('Work email')` cannot authenticate here. Branching on the
 * rendered surface keeps the suite working under both settings instead of
 * hardcoding one deployment's shape.
 */
export const loginAs = async (page: Page, account: { email: string; password: string; name: string }) => {
  await page.goto('/login');
  const emailField = page.getByLabel(msg('login.email_label'));
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(account.email);
    await page.getByLabel(msg('login.password_label')).fill(account.password);
    await page.getByRole('button', { name: msg('login.submit'), exact: true }).click();
  } else {
    await page
      .getByRole('button', { name: msgWith('demo.loginAs', { name: account.name }) })
      .click();
  }
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
};

/** Navigate inside the authenticated shell and wait for it to settle. */
export const gotoApp = async (page: Page, path: string) => {
  await page.goto(path);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeAttached();
};

/** The status chip for one approval state (`StatusChip` exposes data-status). */
export const statusChip = (page: Page, status: string): Locator =>
  page.locator(`[data-status="${status}"]`);

/** Primary sidebar nav. */
export const primaryNav = (page: Page): Locator => page.getByRole('navigation', { name: 'Primary' });

/**
 * Language picker in the topbar. Options are the locale *symbols* (`EN`/`ID`,
 * from `localeSymbols`) so the control stays language-neutral in both locales.
 */
export const setLocale = async (page: Page, code: 'EN' | 'ID') => {
  await page.getByRole('combobox', { name: msg('nav.language') }).click();
  await page.getByRole('option', { name: code, exact: true }).click();
};

/**
 * Cell texts of one column, identified by its header label.
 *
 * Reads `textContent`, not `innerText`: table headers carry `text-transform:
 * uppercase`, and `innerText` returns the *rendered* casing, which would make
 * the lookup depend on styling.
 */
export const columnValues = async (page: Page, header: string): Promise<string[]> => {
  const table = page.getByRole('table').first();
  const headers = table.locator('thead th');
  // `count()` does NOT auto-wait, and `DataTable` only renders its `<thead>`
  // once `!isLoading && data.length > 0` (the loading skeleton table has no
  // `th`). On a cold first paint the count is therefore 0 and the failure
  // reads as a wrong assertion — "no column header \"Name\" in the table" —
  // when the table is simply still loading. Wait for the real header row
  // first; every other read below it is then guaranteed to see a rendered
  // table. Do not "fix" this with `retries` or a sleep.
  await expect(headers.first()).toBeVisible();
  const count = await headers.count();
  let index = -1;
  for (let i = 0; i < count; i += 1) {
    if (((await headers.nth(i).textContent()) ?? '').trim() === header) {
      index = i;
      break;
    }
  }
  expect(index, `no column header "${header}" in the table`).toBeGreaterThanOrEqual(0);
  const rows = table.locator('tbody tr');
  const values: string[] = [];
  for (let i = 0; i < (await rows.count()); i += 1) {
    values.push(((await rows.nth(i).locator('td').nth(index).textContent()) ?? '').trim());
  }
  return values;
};

/** True when `values` reads in non-descending order. */
export const isSortedAscending = (values: string[]): boolean =>
  values.every((value, i) => i === 0 || value.localeCompare(values[i - 1]!) >= 0);

/** Money string for `amount`, formatted the way the app formats it. */
export const money = (amount: number, currency = 'IDR'): string =>
  new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

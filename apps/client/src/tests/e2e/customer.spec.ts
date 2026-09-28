import { test, expect, type Page } from '@playwright/test';
import { columnValues, gotoApp, isSortedAscending } from './helpers/app';
import { msg } from './helpers/i18n';

const uniqueName = (label: string) => `E2E ${label} ${Date.now()}`;

const newCustomerName = () => msg('customer.index.create_button');

/** Fill the create form and save, then land back on the list. */
const createCustomer = async (page: Page, name: string, code: string) => {
  await gotoApp(page, '/customer');
  await page.getByRole('button', { name: newCustomerName() }).click();
  await expect(page).toHaveURL(/\/customer\/create/);
  await page.locator('#customer-code').fill(code);
  await page.locator('#customer-name').fill(name);
  await page.getByRole('button', { name: msg('customer.form.save_button') }).click();
  await page.getByRole('button', { name: msg('common.action.confirm') }).click();
  await expect(page).toHaveURL(/\/customer$/, { timeout: 20_000 });
};

/** Open a customer's detail page from the list by row text. */
const openCustomer = async (page: Page, name: string) => {
  await page.getByRole('row', { name }).click();
  await expect(page).toHaveURL(/\/customer\/[0-9A-Z]+$/, { timeout: 15_000 });
};

const deleteOpenCustomer = async (page: Page) => {
  await page.getByRole('button', { name: msg('common.action.delete') }).click();
  await page.getByRole('button', { name: msg('common.action.delete') }).last().click();
  await expect(page).toHaveURL(/\/customer$/, { timeout: 20_000 });
};

test.describe('customer CRUD', () => {
  test('refuses to save a customer without a name', async ({ page }) => {
    await gotoApp(page, '/customer');
    await page.getByRole('button', { name: newCustomerName() }).click();
    await expect(page).toHaveURL(/\/customer\/create/);

    // An empty form must not reach the confirm step.
    await page.getByRole('button', { name: msg('customer.form.save_button') }).click();
    await expect(page).toHaveURL(/\/customer\/create/);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Provoking the field validator surfaces the required-field message.
    const name = page.locator('#customer-name');
    await name.fill('x');
    await name.fill('');
    await expect(page.locator('#customer-name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('creates a customer, finds it in the refreshed list, then deletes it', async ({ page }) => {
    const name = uniqueName('Acme');
    const code = `E2E-${Date.now()}`;
    await createCustomer(page, name, code);

    // The list must reflect the write without a manual reload.
    await expect(page.getByRole('row', { name })).toBeVisible({ timeout: 15_000 });

    // Search must narrow the list to the record that was just created.
    // `tbody tr` rather than role=row, so the header row is not counted.
    const bodyRows = page.locator('tbody tr');
    const search = page.getByRole('searchbox');
    await search.fill(name);
    await expect(page.getByRole('row', { name })).toBeVisible({ timeout: 15_000 });
    await expect(bodyRows).toHaveCount(1, { timeout: 15_000 });

    await openCustomer(page, name);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByText(code).first()).toBeVisible();

    await deleteOpenCustomer(page);
    // Gone from the list, and search cannot resurrect it.
    await search.fill(name);
    await expect(page.getByRole('row', { name })).toHaveCount(0, { timeout: 15_000 });
  });

  test('persists an edited customer name', async ({ page }) => {
    const original = uniqueName('Before');
    const renamed = uniqueName('After');
    await createCustomer(page, original, `E2E-${Date.now()}`);

    await openCustomer(page, original);
    await page.getByRole('button', { name: msg('common.action.edit') }).click();
    await expect(page).toHaveURL(/\/customer\/[0-9A-Z]+\/edit/);
    // Edit mode must load the stored values, not empty defaults.
    await expect(page.locator('#customer-name')).toHaveValue(original);

    await page.locator('#customer-name').fill(renamed);
    await page.getByRole('button', { name: msg('customer.form.save_button') }).click();
    await page.getByRole('button', { name: msg('common.action.confirm') }).click();
    await expect(page).toHaveURL(/\/customer\/[0-9A-Z]+$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { level: 1, name: renamed })).toBeVisible();

    await deleteOpenCustomer(page);
  });

  test('sorting the name column reverses the row order', async ({ page }) => {
    await gotoApp(page, '/customer');
    const header = msg('customer.index.header_name');
    const before = await columnValues(page, header);
    expect(before.length, 'need rows to sort').toBeGreaterThan(1);
    expect(isSortedAscending(before), 'default order must not already be ascending').toBe(false);

    // aria-sort is the accessible state; the rows must actually follow it.
    await page.getByRole('columnheader', { name: header }).click();
    await expect(page.getByRole('columnheader', { name: header })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    const ascending = await columnValues(page, header);
    expect(isSortedAscending(ascending), `not ascending: ${ascending.join(' | ')}`).toBe(true);
    expect(ascending, 'sorting must reorder, not drop rows').toHaveLength(before.length);

    // Clicking again flips the direction.
    await page.getByRole('columnheader', { name: header }).click();
    await expect(page.getByRole('columnheader', { name: header })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    const descending = await columnValues(page, header);
    expect(descending).toEqual([...ascending].reverse());
  });
});

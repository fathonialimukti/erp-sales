import { test, expect, type Page } from '@playwright/test';
import { msg } from './helpers/i18n';

/**
 * Phone-sized pass. The desktop suite is pinned to 1440×900, so nothing below
 * that is covered elsewhere: the sidebar, the topbar and the wide list grids
 * are the layouts most likely to break at 390px.
 *
 * Shell contract these tests hold: below `md` the sidebar is an off-canvas
 * drawer over the content, so the column keeps the full viewport width and the
 * page never has to scroll sideways. The topbar's five controls share the row
 * with the breadcrumb, which the PageHeader h1 directly below re-states — so
 * the breadcrumb gives up its width below 560px rather than squeezing the
 * title to nothing.
 */
const PHONE = { width: 390, height: 844 };

/**
 * True when the document scrolls sideways — the classic narrow-viewport bug.
 * Async so a call site cannot silently assert on the promise instead of the
 * answer (`expect(promise).toBe(false)` passes on any promise).
 */
const hasHorizontalOverflow = async (page: Page) =>
  page.evaluate(() => {
    const doc = document.documentElement;
    // 1px of slack for sub-pixel layout rounding.
    return doc.scrollWidth > doc.clientWidth + 1;
  });

test.use({ viewport: PHONE });

test.describe('mobile viewport', () => {
  /**
   * Regression guard for a real, measured bug: at 390px every authenticated
   * page scrolled sideways by 189px and the PageHeader h1 computed to 0px wide.
   * The topbar's right-hand control cluster has no wrapping or shrinking below
   * the `sm` breakpoint, and the sidebar's margin offset ate 284 of the 390px
   * viewport, squeezing the column until the cluster pushed the document wider
   * than the screen. Identical on /dashboard, /customer and a detail page — it
   * was the shared shell, not any one page — so all three are asserted here.
   */
  test('does not scroll horizontally at 390px', async ({ page }) => {
    for (const path of ['/dashboard', '/customer']) {
      await page.goto(path);
      await expect(page.getByRole('navigation', { name: 'Primary' })).toBeAttached({ timeout: 20_000 });
      expect(await hasHorizontalOverflow(page), `${path} scrolls horizontally at 390px`).toBe(false);
    }

    // A detail page as well, reached the way a user reaches it.
    await page.goto('/customer');
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('tbody tr').first().click();
    await expect(page).toHaveURL(/\/customer\/[0-9A-Z]+$/, { timeout: 20_000 });
    expect(await hasHorizontalOverflow(page), 'the customer detail page scrolls horizontally at 390px').toBe(false);

    // The page title was the visible symptom of the squeeze: a squeezed
    // column gives the h1 0px width, which Playwright reports as hidden.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('dashboard stays navigable on a phone', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeAttached({ timeout: 20_000 });
    // The collapsed sidebar is reached through the topbar toggle.
    const toggle = page.getByRole('button', { name: msg('nav.toggle_sidebar') });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();

    // And the locale control is still reachable at this width.
    await expect(page.getByRole('combobox', { name: msg('nav.language') })).toBeVisible();
  });

  test('a list page renders real rows on a phone', async ({ page }) => {
    await page.goto('/customer');
    await expect(page.getByRole('table')).toBeAttached({ timeout: 20_000 });
    expect(await page.locator('tbody tr').count(), 'list rendered no data rows').toBeGreaterThan(0);
  });

  test('a row opens its detail page on a phone', async ({ page }) => {
    await page.goto('/customer');
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });
    await page.locator('tbody tr').first().click();
    await expect(page).toHaveURL(/\/customer\/[0-9A-Z]+$/, { timeout: 20_000 });
    // Assert on a real control as well as the URL: it proves the detail page
    // actually rendered its actions, which a URL match alone does not.
    await expect(page.getByRole('button', { name: msg('common.action.edit') })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { gotoApp, primaryNav, setLocale } from './helpers/app';
import { isTranslated, msg } from './helpers/i18n';

/**
 * Nav entries rendered in the sidebar. Chosen because they are visible on every
 * authenticated page, so one switch is observed in several places at once.
 */
const NAV_KEYS = ['nav.dashboard', 'nav.customer', 'nav.reports', 'nav.users'] as const;

test.describe('locale', () => {
  test('renders English copy by default', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    for (const key of NAV_KEYS) {
      await expect(primaryNav(page).getByText(msg(key), { exact: true })).toBeVisible();
    }
  });

  test('switches to Bahasa and renders a translated string', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    // Guard the premise: a key that is not actually translated would make the
    // "differs from English" assertion below meaningless.
    for (const key of NAV_KEYS) {
      expect(isTranslated(key), `"${key}" has no Indonesian translation`).toBe(true);
    }

    await setLocale(page, 'ID');

    // WCAG 3.1.1: the document language must follow the active locale, or a
    // screen reader pronounces Indonesian copy with English phonetics.
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');

    // Assert the *rendered* text equals the Indonesian catalog, and that it
    // genuinely differs from English. Comparing against the catalog (rather
    // than a hardcoded word) means rewording a translation is not a failure,
    // while a missing or untranslated key is.
    for (const key of NAV_KEYS) {
      const label = msg(key, 'id');
      await expect(primaryNav(page).getByText(label, { exact: true })).toBeVisible();
      expect(label).not.toBe(msg(key, 'en'));
      await expect(primaryNav(page).getByText(msg(key, 'en'), { exact: true })).toHaveCount(0);
    }
  });

  test('remembers the language across a reload', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    await setLocale(page, 'ID');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(
      primaryNav(page).getByText(msg('nav.dashboard', 'id'), { exact: true }),
    ).toBeVisible();
  });

  test('keeps every nav label translated in both locales', async ({ page }) => {
    // The regression this guards: a label falling back to English because its
    // key is missing from id.json. Any untranslated nav key fails here.
    await gotoApp(page, '/dashboard');
    await setLocale(page, 'ID');
    const indonesian = NAV_KEYS.map((key) => msg(key, 'id'));
    const nav = primaryNav(page);
    for (const label of indonesian) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('translates the topbar breadcrumb kicker', async ({ page }) => {
    // The bug this guards: the kicker id is composed in code
    // (`nav.${meta.kicker}`), so no gate could see it, `nav.Workspace` shipped in
    // neither catalog, and three pages rendered the English "Workspace" in
    // Bahasa. `msg` throws on a missing key, so deleting the key fails here too.
    //
    // Not `gotoApp`: /reports pulls in every lazily-imported report section, and
    // on a cold Vite transform that first visit blows `gotoApp`'s 5s bound while
    // the page is perfectly healthy — it failed once exactly that way, and CI
    // always has the cold cache. Same assertion, budget that fits a cold start.
    await page.goto('/reports');
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeAttached({ timeout: 30_000 });
    await setLocale(page, 'ID');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');

    const kicker = page.locator('[data-breadcrumb-kicker]');
    const indonesian = msg('nav.Workspace', 'id');
    expect(indonesian, 'nav.Workspace is byte-identical to the English copy').not.toBe(msg('nav.Workspace'));
    await expect(kicker).toHaveText(indonesian);
    await expect(kicker).not.toHaveText(msg('nav.Workspace'));
  });
});

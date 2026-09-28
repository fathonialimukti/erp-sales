import { test, expect, type Page } from '@playwright/test';
import { gotoApp, primaryNav } from './helpers/app';
import { msg } from './helpers/i18n';

/** A semantic token resolved to a colour, so a theme change is measurable. */
const tokenColor = (page: Page, token: string) =>
  page.evaluate((name) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    // Tokens may be a raw colour or an `oklch(...)`/hex triple; normalise to an
    // opaque rgb so two themes are comparable.
    const probe = document.createElement('div');
    probe.style.color = value;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  }, token);

const themeButton = (page: Page) => page.getByRole('button', { name: msg('nav.theme') });

test.describe('theme', () => {
  test('starts light and toggles the dark class on <html>', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    const lightBackground = await tokenColor(page, '--background');

    await themeButton(page).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    // A semantic token must actually change, not just a class name: a theme
    // switch that only adds the class without repainting tokens is invisible
    // to the user and this assertion catches it.
    const darkBackground = await tokenColor(page, '--background');
    expect(darkBackground, 'the background token did not change between themes').not.toBe(
      lightBackground,
    );
  });

  test('remembers the dark theme across a reload', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    await themeButton(page).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await expect(primaryNav(page)).toBeVisible();
  });

  test('switching back to light repaints the tokens', async ({ page }) => {
    await gotoApp(page, '/dashboard');
    const light = await tokenColor(page, '--background');
    await themeButton(page).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await themeButton(page).click();

    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    expect(await tokenColor(page, '--background')).toBe(light);
  });
});

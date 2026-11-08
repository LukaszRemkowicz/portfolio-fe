import { test, expect } from './fixtures';

// The auto `hydrationGuard` fixture fails the test on any hydration error.
const ROUTES = [
  '/',
  '/astrophotography',
  '/astrophotography/orion-nebula',
  '/travel/poland/krakow/2024-05-10',
  '/privacy',
  '/shop',
  '/programming',
  '/no-such-page',
];

for (const path of ROUTES) {
  test(`hydrates without errors: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();
    await page.waitForTimeout(500);
  });
}

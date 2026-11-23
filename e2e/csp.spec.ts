import { test, expect } from './fixtures';

// The preview worker runs with CSP_MODE=enforce (playwright.config.ts), so any
// blocked inline script/style or host shows up as a securitypolicyviolation.
const ROUTES = [
  '/',
  '/astrophotography',
  '/astrophotography/orion-nebula',
  '/travel/poland/krakow/2024-05-10',
  '/privacy',
  '/shop',
  '/programming',
];

test.beforeEach(async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction('__reportCsp', (v: string) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', e =>
      (window as unknown as { __reportCsp: (v: string) => void }).__reportCsp(
        `${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`
      )
    );
  });
  page.on('console', msg => {
    if (/Content Security Policy/i.test(msg.text()))
      violations.push(msg.text());
  });
  (page as unknown as { csp: string[] }).csp = violations;
});

const violationsOf = (page: unknown) => (page as { csp: string[] }).csp;

for (const path of ROUTES) {
  test(`no CSP violations when enforced: ${path}`, async ({ page }) => {
    const res = await page.goto(path, { waitUntil: 'networkidle' });
    expect(res?.headers()['content-security-policy']).toBeTruthy();
    await page.evaluate(() =>
      document.querySelector('#contact')?.scrollIntoView()
    );
    await page.waitForTimeout(500);
    expect(violationsOf(page)).toEqual([]);
  });
}

test('no CSP violations: image modal and contact form', async ({ page }) => {
  await page.goto('/astrophotography', { waitUntil: 'networkidle' });
  await page.getByTestId('gallery-card-orion-nebula').first().click();
  await expect(page.getByTestId('image-modal')).toBeVisible();
  await page.waitForTimeout(500);
  expect(violationsOf(page)).toEqual([]);

  await page.goto('/', { waitUntil: 'networkidle' });
  const name = page.locator('#contact input[name="name"]');
  await name.scrollIntoViewIfNeeded();
  await name.fill('Test User');
  await page.waitForTimeout(300);
  expect(violationsOf(page)).toEqual([]);
});

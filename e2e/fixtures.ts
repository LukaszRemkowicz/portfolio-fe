import { test as base } from '@playwright/test';

// Pages are SSR'd by the real worker against the mock backend; there are no
// browser-level API mocks. This auto fixture fails tests on React hydration errors.
const HYDRATION =
  /Minified React error #(418|423|425)|Hydration failed|did not match|hydrat(e|ion) (error|mismatch)/i;

export const test = base.extend<{ hydrationGuard: void }>({
  hydrationGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      // SSR HTML is visible/clickable before hydration, so clicks right after
      // goto() can be lost. Make goto() resolve only once the client is live.
      const goto = page.goto.bind(page);
      page.goto = async (url, options) => {
        const res = await goto(url, options);
        await page
          .waitForFunction(
            () => typeof (window as any).openCookieSettings === 'function',
            undefined,
            { timeout: 15000 }
          )
          .catch(() => undefined);
        return res;
      };
      page.on('console', msg => {
        if (msg.type() === 'error' && HYDRATION.test(msg.text())) {
          errors.push(msg.text());
        }
      });
      page.on('pageerror', err => {
        if (HYDRATION.test(err.message)) errors.push(err.message);
      });
      await use();
      if (errors.length) {
        throw new Error(`Hydration errors:\n${errors.join('\n')}`);
      }
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';

import { test, expect } from './fixtures';

// Mutates global mock-backend state: runs in the serial `chromium-flags`
// project, after everything else (see playwright.config.ts).
test.describe.configure({ mode: 'serial' });

const setOff = (
  request: import('@playwright/test').APIRequestContext,
  off: string[]
) => request.post('http://127.0.0.1:8765/__mock/flags', { data: { off } });

test.afterEach(async ({ request }) => {
  await setOff(request, []);
});

test('shop and programming return 404 when their flags are off', async ({
  request,
}) => {
  await setOff(request, ['shop', 'programming']);
  for (const path of ['/shop', '/programming']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(404);
    expect(await res.text()).toMatch(/<meta name="robots" content="noindex/);
  }
});

test('shop renders again after flags are reset', async ({ request }) => {
  await setOff(request, []);
  expect((await request.get('/shop')).status()).toBe(200);
});

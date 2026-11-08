import { test, expect } from './fixtures';

// Service workers allowed (see `chromium-pwa` project). The first SW claim
// triggers one intended reload (src/utils/pwaRuntime.ts).
test('sw.js is served with SW headers', async ({ request }) => {
  const res = await request.get('/sw.js');
  expect(res.status()).toBe(200);
  expect(res.headers()['service-worker-allowed']).toBe('/');
  expect(res.headers()['cache-control']).toMatch(/no-cache|no-store|max-age=0/);
});

test('manifest is valid', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBeTruthy();
  expect(m.icons.length).toBeGreaterThan(0);
});

test('service worker activates and precaches hashed assets', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(
    () => !!navigator.serviceWorker.controller,
    undefined,
    {
      timeout: 20000,
    }
  );
  // The intended one-time reload can destroy the context mid-evaluate: poll.
  await expect
    .poll(
      async () =>
        page
          .evaluate(async () => {
            await navigator.serviceWorker.ready;
            const out: string[] = [];
            for (const name of await caches.keys()) {
              const c = await caches.open(name);
              out.push(...(await c.keys()).map(r => new URL(r.url).pathname));
            }
            return out.some(k => /^\/assets\/.+-[\w-]{6,}\./.test(k));
          })
          .catch(() => false),
      { timeout: 20000 }
    )
    .toBe(true);
});

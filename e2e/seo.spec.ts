import { test, expect } from '@playwright/test';

// No JS execution: raw SSR HTML via APIRequestContext.
const HEADERS = {
  'X-Forwarded-Host': 'portfolio.local',
  'X-Forwarded-Proto': 'https',
};
const HOST = 'https://portfolio.local';

const meta = (html: string, attr: 'name' | 'property', key: string) =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html)?.[1];
const title = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1];
const canonical = (html: string) =>
  /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
const htmlLang = (html: string) => /<html[^>]*\slang="([^"]*)"/.exec(html)?.[1];

type Lang = 'pl' | 'en';
// Expected <title> fragment per path, from mock backend data / i18n.
const OK_PAGES: Array<{ path: string; title: Record<Lang, string> }> = [
  {
    path: '/',
    title: { pl: 'Portfolio i Astrofotografia', en: 'Astrophotography' },
  },
  { path: '/astrophotography', title: { pl: 'Galeria', en: 'Gallery' } },
  {
    path: '/astrophotography/orion-nebula',
    title: { pl: 'Mgławica Oriona', en: 'Orion Nebula' },
  },
  {
    path: '/travel/poland/krakow/2024-05-10',
    title: { pl: 'Kraków, Polska', en: 'Krakow, Poland' },
  },
  { path: '/privacy', title: { pl: 'Prywatno', en: 'Privacy' } },
  { path: '/shop', title: { pl: 'Sklep', en: 'Shop' } },
  { path: '/programming', title: { pl: 'Archiwum Projektów', en: 'Project' } },
];

for (const lang of ['pl', 'en'] as Lang[]) {
  for (const { path, title: expected } of OK_PAGES) {
    test(`SEO ${path} [cookie ${lang}]`, async ({ request }) => {
      const res = await request.get(path, {
        headers: { ...HEADERS, Cookie: `i18next=${lang}` },
      });
      expect(res.status()).toBe(200);
      expect(res.headers()['cache-control']).toBe(
        'private, no-cache, must-revalidate'
      );
      const html = await res.text();
      expect(htmlLang(html)).toBe(lang);
      expect(title(html)).toContain(expected[lang]);
      expect(meta(html, 'name', 'description')?.length).toBeGreaterThan(0);
      expect(meta(html, 'property', 'og:title')).toBe(title(html));
      expect(meta(html, 'property', 'og:description')).toBe(
        meta(html, 'name', 'description')
      );
      expect(meta(html, 'property', 'og:url')).toBe(`${HOST}${path}`);
      expect(meta(html, 'property', 'og:type')).toBeTruthy();
      expect(meta(html, 'name', 'twitter:card')).toBeTruthy();
      expect(canonical(html)).toBe(`${HOST}${path}`);
      expect(canonical(html)).not.toContain('/app/');
      expect(meta(html, 'name', 'robots') ?? '').not.toMatch(/noindex/);
    });
  }
}

test('Accept-Language pl-PL without cookie renders Polish', async ({
  request,
}) => {
  const res = await request.get('/', {
    headers: { ...HEADERS, 'Accept-Language': 'pl-PL' },
  });
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(htmlLang(html)).toBe('pl');
  expect(title(html)).toContain('Portfolio i Astrofotografia');
});

const NOT_FOUND = [
  '/no-such-page',
  '/astrophotography/does-not-exist',
  '/travel/x/y/2020-01-01',
];
for (const path of NOT_FOUND) {
  test(`404 ${path}`, async ({ request }) => {
    const res = await request.get(path, {
      headers: { ...HEADERS, Cookie: 'i18next=en' },
    });
    expect(res.status()).toBe(404);
    const html = await res.text();
    expect(title(html)).toBeTruthy();
    // Current behaviour: the generic NotFound page emits noindex; the travel
    // route's own 404 does not (see report).
    if (path !== '/travel/x/y/2020-01-01') {
      expect(meta(html, 'name', 'robots')).toMatch(/noindex/);
    }
  });
}

test('BFF: /app/contact method and content-type handling', async ({
  request,
}) => {
  expect((await request.get('/app/contact')).status()).toBe(405);
  const text = await request.post('/app/contact', {
    headers: { 'Content-Type': 'text/plain' },
    data: 'hello',
  });
  expect(text.status()).toBe(415);
  const ok = await request.post('/app/contact', {
    data: {
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a test message longer than 10 chars.',
    },
  });
  expect(ok.status()).toBe(201);
});

test('/health returns 200 JSON', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  expect(await res.json()).toEqual({ status: 'ok' });
});

/** @jest-environment node */
import { loader } from '../routes/robots';

const call = (headers: Record<string, string> = {}) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (loader as any)({
    request: new Request('https://internal.example/robots.txt', { headers }),
  }) as Response;

describe('robots.txt route', () => {
  const original = process.env.SITE_DOMAIN;
  afterEach(() => {
    if (original === undefined) delete process.env.SITE_DOMAIN;
    else process.env.SITE_DOMAIN = original;
  });

  it('uses SITE_DOMAIN when set (read lazily)', async () => {
    process.env.SITE_DOMAIN = 'site.example';
    const res = call();
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(await res.text()).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://site.example/sitemap.xml\n'
    );
  });

  it('falls back to the request URL host, ignoring forwarded headers', async () => {
    delete process.env.SITE_DOMAIN;
    const res = call({ 'x-forwarded-host': 'evil.test' });
    expect(await res.text()).toContain(
      'Sitemap: https://internal.example/sitemap.xml'
    );
  });
});

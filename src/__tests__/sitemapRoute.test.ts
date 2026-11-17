/** @jest-environment node */
import { loader } from '../routes/sitemap';

const upstream = jest.fn();
const call = () =>
  loader({
    request: new Request('https://portfolio.local/sitemap.xml'),
    context: { requestId: 'req-1' },
  } as unknown as Parameters<typeof loader>[0]);

beforeEach(() => {
  upstream.mockReset();
  global.fetch = upstream as unknown as typeof fetch;
  process.env.SSR_API_URL = 'https://x.supabase.co/functions/v1/api';
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  delete process.env.SSR_API_URL;
  delete process.env.API_ORIGIN_SECRET;
  jest.restoreAllMocks();
});

describe('sitemap route', () => {
  it('passes the body through as XML, keeps base path, sends origin secret', async () => {
    process.env.API_ORIGIN_SECRET = 'shh';
    upstream.mockResolvedValue(
      // The Supabase gateway rewrites application/xml to text/plain.
      new Response('<urlset/>', {
        headers: { 'Content-Type': 'text/plain' },
      })
    );
    const res = await call();
    expect(String(upstream.mock.calls[0][0])).toBe(
      'https://x.supabase.co/functions/v1/api/sitemap.xml'
    );
    expect(upstream.mock.calls[0][1].headers).toMatchObject({
      'X-Origin-Secret': 'shh',
      Accept: 'application/xml',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/xml');
    expect(res.headers.get('cache-control')).toBe('public, max-age=43200');
    expect(await res.text()).toBe('<urlset/>');
  });

  it('passes an upstream error status through', async () => {
    upstream.mockResolvedValue(new Response('boom', { status: 500 }));
    expect((await call()).status).toBe(500);
  });

  it('answers 502 on a network error', async () => {
    upstream.mockRejectedValue(new Error('down'));
    expect((await call()).status).toBe(502);
  });
});

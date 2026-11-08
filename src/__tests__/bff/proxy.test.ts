/** @jest-environment node */
import { handleBffRequest } from '../../server/bff/proxy';

const BASE = 'https://portfolio.local';
const upstream = jest.fn();

const call = (path: string, init: RequestInit = {}) =>
  handleBffRequest(
    new Request(`${BASE}${path}`, {
      ...init,
      headers: init.headers,
    }),
    'req-1'
  );

const jsonUpstream = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  upstream.mockReset();
  global.fetch = upstream as unknown as typeof fetch;
  process.env.SSR_API_URL = 'http://backend.test';
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  delete process.env.SSR_API_URL;
  jest.restoreAllMocks();
});

describe('handleBffRequest', () => {
  it('returns 404 for unknown paths and invalid slugs', async () => {
    expect((await call('/app/nope')).status).toBe(404);
    expect((await call('/app/astroimages/bad%2Fslug')).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('returns 405 with Allow for wrong methods', async () => {
    const wrong = await call('/app/contact');
    expect(wrong.status).toBe(405);
    expect(wrong.headers.get('allow')).toBe('POST');
    expect(await wrong.json()).toEqual({ message: 'Method not allowed.' });

    const post = await call('/app/settings/', { method: 'POST', body: '{}' });
    expect(post.status).toBe(405);
    expect(post.headers.get('allow')).toBe('GET');
  });

  it('forwards GET with query, headers and no-store, normalizing media', async () => {
    upstream.mockResolvedValue(
      jsonUpstream({ results: [{ url: 'https://api.test/media/a.webp' }] })
    );

    const response = await call('/app/astroimages/?filter=x&page=2', {
      headers: {
        cookie: 'i18next=pl; other=1',
        'accept-language': 'en',
        'cf-connecting-ip': '1.2.3.4',
        'x-real-ip': '9.9.9.9',
      },
    });

    const [url, init] = upstream.mock.calls[0];
    expect(String(url)).toBe(
      'http://backend.test/v1/astroimages/?filter=x&page=2'
    );
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'Accept-Language': 'pl',
      Host: 'portfolio.local',
      'X-Forwarded-Host': 'portfolio.local',
      'X-Forwarded-Proto': 'https',
      'X-Request-ID': 'req-1',
      'X-Real-IP': '1.2.3.4',
      'X-Forwarded-For': '1.2.3.4',
    });
    expect(init.headers).not.toHaveProperty('Cookie');
    expect(response.headers.get('cache-control')).toBe(
      'no-cache, no-store, must-revalidate'
    );
    expect(response.headers.get('content-type')).toBe(
      'application/json; charset=utf-8'
    );
    expect(await response.json()).toEqual({
      results: [{ url: '/media/a.webp' }],
    });
  });

  it('ignores spoofed forwarded/Host headers for the backend Host', async () => {
    upstream.mockResolvedValue(jsonUpstream({}));
    process.env.SITE_DOMAIN = 'real.example';
    try {
      await call('/app/settings/', {
        headers: {
          'x-forwarded-host': 'evil.test',
          'x-forwarded-proto': 'http',
        },
      });
    } finally {
      delete process.env.SITE_DOMAIN;
    }
    expect(upstream.mock.calls[0][1].headers).toMatchObject({
      Host: 'real.example',
      'X-Forwarded-Host': 'real.example',
      'X-Forwarded-Proto': 'https',
    });
  });

  it('passes upstream status and falls back to text for non-JSON', async () => {
    upstream.mockResolvedValue(new Response('boom', { status: 502 }));
    const response = await call('/app/settings/');
    expect(response.status).toBe(502);
    expect(await response.json()).toBe('boom');
  });

  it('POST /app/contact: 415, 400, 413 and a forwarded JSON write', async () => {
    const post = (body: string, type = 'application/json') =>
      call('/app/contact', {
        method: 'POST',
        body,
        headers: { 'content-type': type },
      });

    expect((await post('{}', 'text/plain')).status).toBe(415);
    expect((await post('{nope')).status).toBe(400);
    expect((await post(`"${'x'.repeat(70000)}"`)).status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();

    upstream.mockResolvedValue(jsonUpstream({ ok: true }, 201));
    const ok = await post('{"name":"Jan"}');
    const [url, init] = upstream.mock.calls[0];
    expect(String(url)).toBe('http://backend.test/v1/contact/');
    expect(init).toMatchObject({ method: 'POST', body: '{"name":"Jan"}' });
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(ok.status).toBe(201);
  });

  it('image-file: only s/e query, manual redirect, passes cache/type/disposition/location', async () => {
    upstream.mockResolvedValue(
      new Response('bin', {
        status: 302,
        headers: {
          'Content-Type': 'image/webp',
          'Content-Disposition': 'inline',
          Location: 'https://cdn.test/x',
        },
      })
    );
    const response = await call('/app/image-files/m31/serve/?s=a&e=b&evil=1');
    const [url, init] = upstream.mock.calls[0];
    expect(String(url)).toBe(
      'http://backend.test/image-files/m31/serve/?s=a&e=b'
    );
    expect(init.redirect).toBe('manual');
    expect(response.status).toBe(302);
    expect(response.headers.get('cache-control')).toBe(
      'private, no-cache, no-store, must-revalidate'
    );
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(response.headers.get('content-disposition')).toBe('inline');
    expect(response.headers.get('location')).toBe('https://cdn.test/x');
  });

  it('returns 500 when the upstream is unreachable', async () => {
    upstream.mockRejectedValue(new Error('ECONNREFUSED'));
    const response = await call('/app/settings/');
    expect(response.status).toBe(500);
  });
});

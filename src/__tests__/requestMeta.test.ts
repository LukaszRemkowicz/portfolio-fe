import { getRequestLanguage, getRequestOrigin } from '../utils/requestMeta';

// jsdom has no Request; the helpers only need `url` and `headers.get`.
const req = (headers: Record<string, string>, url = 'http://localhost/') =>
  ({
    url,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  }) as unknown as Request;

describe('getRequestOrigin', () => {
  const original = process.env.SITE_DOMAIN;
  afterEach(() => {
    if (original === undefined) delete process.env.SITE_DOMAIN;
    else process.env.SITE_DOMAIN = original;
  });

  it('uses https://SITE_DOMAIN when set (read per call)', () => {
    process.env.SITE_DOMAIN = 'site.example';
    expect(getRequestOrigin(req({}, 'http://b.test/x'))).toBe(
      'https://site.example'
    );
  });

  it('falls back to the request URL origin without SITE_DOMAIN', () => {
    delete process.env.SITE_DOMAIN;
    expect(getRequestOrigin(req({}, 'https://b.test:8443/x'))).toBe(
      'https://b.test:8443'
    );
  });

  it('ignores spoofed X-Forwarded-* and Host headers', () => {
    const spoof = {
      'x-forwarded-host': 'evil.test',
      'x-forwarded-proto': 'http',
      host: 'evil.test',
    };
    process.env.SITE_DOMAIN = 'site.example';
    expect(getRequestOrigin(req(spoof))).toBe('https://site.example');
    delete process.env.SITE_DOMAIN;
    expect(getRequestOrigin(req(spoof, 'https://b.test/'))).toBe(
      'https://b.test'
    );
  });
});

describe('getRequestLanguage', () => {
  it('uses the i18next cookie before Accept-Language', () => {
    expect(
      getRequestLanguage(
        req({ cookie: 'a=b; i18next=pl', 'accept-language': 'en-US' })
      )
    ).toBe('pl');
  });

  it('uses Accept-Language without a cookie and defaults to en', () => {
    expect(
      getRequestLanguage(req({ 'accept-language': 'pl-PL,pl;q=0.9' }))
    ).toBe('pl');
    expect(getRequestLanguage(req({}))).toBe('en');
  });
});

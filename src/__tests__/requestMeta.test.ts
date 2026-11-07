import { getRequestLanguage, getRequestOrigin } from '../utils/requestMeta';

// jsdom has no Request; the helpers only need `url` and `headers.get`.
const req = (headers: Record<string, string>, url = 'http://localhost/') =>
  ({
    url,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  }) as unknown as Request;

describe('getRequestOrigin', () => {
  it('prefers the first forwarded proto/host values', () => {
    expect(
      getRequestOrigin(
        req({
          'x-forwarded-proto': 'https, http',
          'x-forwarded-host': 'portfolio.local, internal',
        })
      )
    ).toBe('https://portfolio.local');
  });

  it('falls back to the Host header, then the request URL', () => {
    expect(getRequestOrigin(req({ host: 'a.test' }, 'http://b.test/'))).toBe(
      'http://a.test'
    );
    expect(getRequestOrigin(req({}, 'https://b.test:8443/x'))).toBe(
      'https://b.test:8443'
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

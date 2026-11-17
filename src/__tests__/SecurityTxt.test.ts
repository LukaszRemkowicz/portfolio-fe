/**
 * @jest-environment node
 */
import { loader } from '../routes/security';

describe('security.txt route', () => {
  it('serves RFC 9116 fields with a future Expires', async () => {
    const response = loader({
      request: new Request(
        'https://lukaszremkowicz.com/.well-known/security.txt'
      ),
    } as Parameters<typeof loader>[0]);
    const body = await response.text();

    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8'
    );
    expect(body).toMatch(/^Contact: https:\/\/[^\n]+\/#contact$/m);
    expect(body).toMatch(
      /^Canonical: https:\/\/[^\n]+\/\.well-known\/security\.txt$/m
    );
    const expires = body.match(/^Expires: (.+)$/m)?.[1] ?? '';
    expect(new Date(expires).getTime()).toBeGreaterThan(Date.now());
  });
});

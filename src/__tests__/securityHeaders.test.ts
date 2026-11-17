/** @jest-environment node */
import {
  SECURITY_HEADERS,
  withSecurityHeaders,
} from '../server/securityHeaders';

describe('withSecurityHeaders', () => {
  it('sets all 5 headers', () => {
    const res = withSecurityHeaders(new Response('x'));
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
      expect(res.headers.get(k)).toBe(v);
    }
    expect(Object.keys(SECURITY_HEADERS)).toHaveLength(5);
  });

  it('does not overwrite an existing header', () => {
    const res = withSecurityHeaders(
      new Response('x', { headers: { 'X-Frame-Options': 'SAMEORIGIN' } })
    );
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('clones when headers are immutable', async () => {
    const immutable = new Response('body');
    const real = immutable.headers.set.bind(immutable.headers);
    let locked = true;
    Object.defineProperty(immutable.headers, 'set', {
      value: (k: string, v: string) => {
        if (locked) throw new TypeError('immutable');
        real(k, v);
      },
    });
    const out = withSecurityHeaders(immutable);
    locked = false;
    expect(out).not.toBe(immutable);
    expect(out.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await out.text()).toBe('body');
  });
});

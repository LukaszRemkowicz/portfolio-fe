/** @jest-environment node */
import { withRequestId } from '../server/withRequestId';

describe('withRequestId', () => {
  it('sets the header on a mutable response', () => {
    const res = new Response('x');
    expect(withRequestId(res, 'r1')).toBe(res);
    expect(res.headers.get('X-Request-ID')).toBe('r1');
  });

  it('clones without buffering when headers are immutable', async () => {
    const res = Response.redirect('https://a.test/', 302);
    const out = withRequestId(res, 'r2');
    expect(out.headers.get('X-Request-ID')).toBe('r2');
    expect(out.status).toBe(302);
    const immutable = new Response('body');
    Object.defineProperty(immutable.headers, 'set', {
      value: () => {
        throw new TypeError('immutable');
      },
    });
    const cloned = withRequestId(immutable, 'r3');
    expect(cloned).not.toBe(immutable);
    expect(cloned.headers.get('X-Request-ID')).toBe('r3');
    expect(await cloned.text()).toBe('body');
  });
});

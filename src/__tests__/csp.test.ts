/** @jest-environment node */
import { applyCsp, buildCsp, generateNonce } from '../server/csp';

const DSN = 'https://abc123@o1.ingest.us.sentry.io/4242';
const REPORT =
  'https://o1.ingest.us.sentry.io/api/4242/security/?sentry_key=abc123';

describe('buildCsp', () => {
  it('has nonce, no unsafe-eval, no unsafe-inline in script-src', () => {
    const { policy } = buildCsp({ nonce: 'N1', gaEnabled: false });
    const script = policy.split('; ').find(d => d.startsWith('script-src'))!;
    const style = policy.split('; ').find(d => d.startsWith('style-src '))!;
    expect(script).toContain(`'nonce-N1'`);
    expect(style).toContain(`'nonce-N1'`);
    expect(script).not.toContain('unsafe-inline');
    expect(policy).not.toContain('unsafe-eval');
  });

  it('allows Facebook emoji images in img-src', () => {
    const policy = buildCsp({ nonce: 'N', gaEnabled: false }).policy;
    const img = policy.split('; ').find(d => d.startsWith('img-src'))!;
    expect(img).toContain('https://static.xx.fbcdn.net');
  });

  it('adds GA hosts only when GA is on', () => {
    expect(buildCsp({ nonce: 'N', gaEnabled: false }).policy).not.toContain(
      'google'
    );
    const on = buildCsp({ nonce: 'N', gaEnabled: true }).policy;
    expect(on).toContain('https://www.googletagmanager.com');
    expect(on).toContain('https://*.analytics.google.com');
  });

  it('adds Sentry connect/report only with a valid DSN', () => {
    const ok = buildCsp({ nonce: 'N', gaEnabled: false, sentryDsn: DSN });
    expect(ok.policy).toContain(
      "connect-src 'self' https://o1.ingest.us.sentry.io"
    );
    expect(ok.policy).toContain(`report-uri ${REPORT}`);
    expect(ok.policy).toContain('report-to csp-endpoint');
    expect(ok.reportingEndpoints).toBe(`csp-endpoint="${REPORT}"`);
  });

  it.each(['', 'not a url', 'http://k@h/1', 'https://h/1'])(
    'bad DSN %p: no reporting, no throw',
    dsn => {
      const r = buildCsp({ nonce: 'N', gaEnabled: false, sentryDsn: dsn });
      expect(r.reportingEndpoints).toBeNull();
      expect(r.policy).not.toMatch(/report-|sentry/);
    }
  );
});

describe('applyCsp / generateNonce', () => {
  it('is Report-Only by default and enforced with CSP_MODE=enforce', () => {
    const h = new Headers();
    applyCsp(h, 'N', {});
    expect(h.has('Content-Security-Policy-Report-Only')).toBe(true);
    expect(h.has('Content-Security-Policy')).toBe(false);
    const e = new Headers();
    applyCsp(e, 'N', { CSP_MODE: 'enforce', SENTRY_DSN_FE: DSN });
    expect(e.has('Content-Security-Policy')).toBe(true);
    expect(e.has('Content-Security-Policy-Report-Only')).toBe(false);
    expect(e.get('Reporting-Endpoints')).toContain('csp-endpoint=');
  });

  it('GA needs ENABLE_GA=true and a tracking id', () => {
    const h = new Headers();
    applyCsp(h, 'N', { ENABLE_GA: 'true' });
    expect(h.get('Content-Security-Policy-Report-Only')).not.toContain(
      'google'
    );
  });

  it('nonce differs per call', () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});

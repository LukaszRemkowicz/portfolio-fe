import { exposeEnvToProcess } from '../server/exposeEnvToProcess';

describe('exposeEnvToProcess', () => {
  it('copies string bindings (vars and secrets) that process.env lacks', () => {
    const target: Record<string, string | undefined> = {};
    exposeEnvToProcess(
      { SSR_API_URL: 'https://backend.test', CF_ACCESS_CLIENT_SECRET: 's' },
      target
    );
    expect(target).toEqual({
      SSR_API_URL: 'https://backend.test',
      CF_ACCESS_CLIENT_SECRET: 's',
    });
  });

  it('keeps existing values and skips non-string bindings', () => {
    const target: Record<string, string | undefined> = { SITE_DOMAIN: 'local' };
    exposeEnvToProcess(
      { SITE_DOMAIN: 'prod.example', ASSETS: { fetch() {} } },
      target
    );
    expect(target).toEqual({ SITE_DOMAIN: 'local' });
  });
});

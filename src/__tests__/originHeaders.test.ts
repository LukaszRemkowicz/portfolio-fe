/** @jest-environment node */
import { getOriginHeaders } from '../server/originHeaders';
import { createApiClient } from '../api/api';

const req = (headers: Record<string, string> = {}) =>
  new Request('https://portfolio.local/', { headers });

afterEach(() => {
  delete process.env.CF_ACCESS_CLIENT_ID;
  delete process.env.CF_ACCESS_CLIENT_SECRET;
});

describe('getOriginHeaders', () => {
  it('forwards the visitor IP, preferring cf-connecting-ip', () => {
    expect(
      getOriginHeaders(
        req({ 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' })
      )
    ).toEqual({ 'X-Real-IP': '1.2.3.4', 'X-Forwarded-For': '1.2.3.4' });
    expect(getOriginHeaders(req())).toEqual({});
  });

  it('adds the Access service token only when both parts are set', () => {
    process.env.CF_ACCESS_CLIENT_ID = 'id.access';
    expect(getOriginHeaders(req())).toEqual({});

    process.env.CF_ACCESS_CLIENT_SECRET = 's3cret';
    expect(getOriginHeaders(req())).toEqual({
      'CF-Access-Client-Id': 'id.access',
      'CF-Access-Client-Secret': 's3cret',
    });
  });
});

describe('createApiClient on the server (SSR loaders)', () => {
  it('sends origin headers with every backend request', () => {
    process.env.CF_ACCESS_CLIENT_ID = 'id.access';
    process.env.CF_ACCESS_CLIENT_SECRET = 's3cret';
    const client = createApiClient(
      () => 'en',
      'https://portfolio.local',
      'req-1',
      getOriginHeaders(req({ 'cf-connecting-ip': '1.2.3.4' }))
    );
    expect(client.defaults.headers).toMatchObject({
      'X-Request-ID': 'req-1',
      'X-Real-IP': '1.2.3.4',
      'CF-Access-Client-Id': 'id.access',
      'CF-Access-Client-Secret': 's3cret',
    });
  });
});

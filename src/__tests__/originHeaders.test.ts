/** @jest-environment node */
import { getOriginHeaders } from '../server/originHeaders';
import { createApiClient } from '../api/api';

const req = (headers: Record<string, string> = {}) =>
  new Request('https://portfolio.local/', { headers });

afterEach(() => {
  delete process.env.API_ORIGIN_SECRET;
});

describe('getOriginHeaders', () => {
  it('forwards the visitor IP, preferring cf-connecting-ip', () => {
    expect(
      getOriginHeaders(
        req({ 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': '9.9.9.9' })
      )
    ).toEqual({
      'X-Real-IP': '1.2.3.4',
      'X-Forwarded-For': '1.2.3.4',
      'X-Visitor-IP': '1.2.3.4',
    });
    expect(getOriginHeaders(req())).toEqual({});
  });

  it('adds the origin secret for the hidden API only when set', () => {
    expect(getOriginHeaders(req())).toEqual({});
    process.env.API_ORIGIN_SECRET = 'origin-s3cret';
    expect(getOriginHeaders(req())).toEqual({
      'X-Origin-Secret': 'origin-s3cret',
    });
  });
});

describe('createApiClient on the server (SSR loaders)', () => {
  it('sends origin headers with every backend request', async () => {
    process.env.API_ORIGIN_SECRET = 'origin-s3cret';
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      type: 'basic',
      json: async () => ({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const client = createApiClient(
      () => 'en',
      'https://portfolio.local',
      'req-1',
      getOriginHeaders(req({ 'cf-connecting-ip': '1.2.3.4' }))
    );
    await client.get('/v1/settings');
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      'X-Request-ID': 'req-1',
      'X-Real-IP': '1.2.3.4',
      'X-Origin-Secret': 'origin-s3cret',
    });
  });
});

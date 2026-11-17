/** @jest-environment node */
import { createApiClient } from '../api/api';
import {
  AppError,
  NetworkError,
  NotFoundError,
  ServerError,
  UnauthorizedError,
  ValidationError,
} from '../api/errors';

const respond = (status: number, body: unknown, extra: object = {}) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    type: 'basic',
    json: async () => body,
    ...extra,
  }) as unknown as Response;

describe('API client (fetch) error mapping and transport', () => {
  let fetchMock: jest.Mock;
  const client = () =>
    createApiClient(() => 'pl-PL', 'https://site.test', 'rid');

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('returns data and sends lang, params, headers and manual redirects', async () => {
    fetchMock.mockResolvedValue(respond(200, { ok: true }));
    const result = await client().get('/v1/images', {
      params: { page: 2, tag: undefined },
    });
    expect(result.data).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/v1/images?');
    expect(new URL(url).searchParams.get('lang')).toBe('pl');
    expect(new URL(url).searchParams.get('page')).toBe('2');
    expect(new URL(url).searchParams.has('tag')).toBe(false);
    expect(init.redirect).toBe('manual');
    expect(init.headers).toMatchObject({
      Accept: 'application/json',
      'X-Request-ID': 'rid',
      'X-Forwarded-Host': 'site.test',
      'X-Forwarded-Proto': 'https',
    });
  });

  it('treats a 3xx response as an error instead of following it', async () => {
    fetchMock.mockResolvedValue(respond(302, null));
    await expect(client().get('/v1/x')).rejects.toMatchObject({
      statusCode: 302,
    });
  });

  it.each([
    [
      400,
      { detail: 'Invalid input provided.' },
      ValidationError,
      'Invalid input provided.',
    ],
    [
      400,
      { message: 'Explicit', detail: 'Hidden' },
      ValidationError,
      'Explicit',
    ],
    [401, {}, UnauthorizedError, undefined],
    [404, {}, NotFoundError, undefined],
    [503, {}, ServerError, undefined],
    [
      429,
      { detail: 'Too many messages. Wait 1 hour.' },
      AppError,
      'Too many messages. Wait 1 hour.',
    ],
    [418, {}, AppError, 'An unexpected error occurred.'],
  ])('maps %s to the matching error class', async (status, body, cls, msg) => {
    fetchMock.mockResolvedValue(respond(status, body));
    const error = await client()
      .get('/v1/x')
      .catch(e => e);
    expect(error).toBeInstanceOf(cls);
    expect(error.statusCode).toBe(status);
    if (msg) expect(error.message).toBe(msg);
  });

  it('maps network failures and timeouts to NetworkError', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(client().get('/v1/x')).rejects.toBeInstanceOf(NetworkError);

    jest.useFakeTimers();
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) =>
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError'))
          )
        )
    );
    const pending = client()
      .get('/v1/x')
      .catch(e => e);
    await jest.advanceTimersByTimeAsync(8000);
    expect(await pending).toBeInstanceOf(NetworkError);
    jest.useRealTimers();
  });
});

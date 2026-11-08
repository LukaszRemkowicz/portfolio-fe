import { TextDecoder as NodeTextDecoder } from 'node:util';
import { isMalformedRequestTarget } from '../../server/requestTarget';
import {
  MAX_JSON_BODY_BYTES,
  RequestValidationError,
  assertJsonContentType,
  readJsonBody,
} from '../../server/bff/validation';

// jsdom has no streams/TextDecoder globals for this module; build minimal fakes.
const requestWith = (contentType: string | null, body?: string) => {
  const bytes = body === undefined ? null : new TextEncoder().encode(body);
  return {
    headers: {
      get: (name: string) => (name === 'content-type' ? contentType : null),
    },
    body: bytes
      ? {
          getReader: () => {
            let sent = false;
            return {
              read: async () =>
                sent
                  ? { done: true }
                  : ((sent = true), { done: false, value: bytes }),
              cancel: async () => undefined,
            };
          },
        }
      : null,
  } as unknown as Request;
};

describe('request-target validation', () => {
  it.each([
    'https://x.test/php-cgi/php-cgi.exe?%ADd',
    'https://x.test/xampp/php-cgi.exe?arg=%',
    'https://x.test/assets/%E0%A4%A',
    'https://x.test/path?value=%GG',
  ])('rejects malformed percent encoding in %s', url => {
    expect(isMalformedRequestTarget(url)).toBe(true);
  });

  it.each([
    'https://x.test/',
    'https://x.test/astrophotography/milky-way',
    'https://x.test/assets/app.js?v=1',
    'https://x.test/search?value=Milky%20Way',
    'https://x.test/safe?redirect=%2Fastrophotography',
  ])('accepts a valid request target in %s', url => {
    expect(isMalformedRequestTarget(url)).toBe(false);
  });
});

describe('BFF body validation', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'TextDecoder', { value: NodeTextDecoder });
  });

  it('requires application/json (with optional charset)', () => {
    expect(() => assertJsonContentType(requestWith('text/plain'))).toThrow(
      expect.objectContaining({ statusCode: 415 })
    );
    expect(() => assertJsonContentType(requestWith(null))).toThrow(
      RequestValidationError
    );
    expect(() =>
      assertJsonContentType(requestWith('Application/JSON; charset=utf-8'))
    ).not.toThrow();
  });

  it('parses JSON, treats an empty body as null', async () => {
    await expect(
      readJsonBody(requestWith('application/json', '{"a":1}'))
    ).resolves.toEqual({ a: 1 });
    await expect(
      readJsonBody(requestWith('application/json'))
    ).resolves.toBeNull();
  });

  it('rejects malformed JSON with 400 and oversized bodies with 413', async () => {
    await expect(
      readJsonBody(requestWith('application/json', '{nope'))
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      readJsonBody(
        requestWith('application/json', 'x'.repeat(MAX_JSON_BODY_BYTES + 1))
      )
    ).rejects.toMatchObject({ statusCode: 413 });
  });
});

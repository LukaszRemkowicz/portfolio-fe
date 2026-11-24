/**
 * @jest-environment node
 */
import { renderToReadableStream } from 'react-dom/server';
import type { EntryContext } from 'react-router';
import handleRequest from '../entry.server';

jest.mock('react-dom/server', () => ({
  renderToReadableStream: jest.fn(async () =>
    Object.assign(new ReadableStream(), { allReady: Promise.resolve() })
  ),
}));
jest.mock('../i18n.server', () => ({
  createServerI18n: jest.fn(async () => ({})),
}));

it('passes the CSP nonce to React streaming scripts', async () => {
  process.env.CSP_MODE = 'enforce';
  const res = await handleRequest(
    new Request('https://example.com/'),
    200,
    new Headers(),
    { isSpaMode: false } as unknown as EntryContext
  );

  const nonce = /'nonce-([^']+)'/.exec(
    res.headers.get('Content-Security-Policy') ?? ''
  )?.[1];
  expect(nonce).toBeTruthy();
  expect(jest.mocked(renderToReadableStream).mock.calls[0][1]).toEqual(
    expect.objectContaining({ nonce })
  );
});

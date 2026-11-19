import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { ServerRouter, isRouteErrorResponse } from 'react-router';
import type { EntryContext, HandleErrorFunction } from 'react-router';
import { createServerI18n } from './i18n.server';
import { NonceContext } from './server/nonce';
import { applyCsp, generateNonce } from './server/csp';
import { getRequestLanguage } from './utils/requestMeta';

// Max time to wait for Suspense boundaries (bots/SPA wait for allReady).
export const streamTimeout = 5_000;

// Same as React Router's default handler, but bot 4xx (e.g. a POST to a page without an
// action -> 405) are already answered with 4xx and are not app errors.
export const handleError: HandleErrorFunction = (error, { request }) => {
  if (request.signal.aborted) return;
  if (isRouteErrorResponse(error)) {
    if (error.status < 500) return;
    console.error((error as { error?: unknown }).error ?? error);
    return;
  }
  console.error(error);
};

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  const nonce = generateNonce();
  const i18n = await createServerI18n(getRequestLanguage(request));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), streamTimeout + 1000);
  request.signal.addEventListener('abort', () => controller.abort());

  let shellRendered = false;
  const body = await renderToReadableStream(
    <I18nextProvider i18n={i18n}>
      <NonceContext.Provider value={nonce}>
        <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
      </NonceContext.Provider>
    </I18nextProvider>,
    {
      signal: controller.signal,
      onError(error) {
        responseStatusCode = 500;
        // Errors before the shell is ready surface via the thrown promise.
        if (shellRendered) console.error(error);
      },
    }
  );
  shellRendered = true;
  body.allReady.then(
    () => clearTimeout(timeout),
    () => clearTimeout(timeout)
  );

  const userAgent = request.headers.get('user-agent');
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  applyCsp(responseHeaders, nonce, process.env);
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

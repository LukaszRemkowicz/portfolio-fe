import { isbot } from 'isbot';
import { renderToReadableStream } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { ServerRouter } from 'react-router';
import type { EntryContext } from 'react-router';
import { createServerI18n } from './i18n.server';
import { getRequestLanguage } from './utils/requestMeta';

const RENDER_TIMEOUT_MS = 10000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  const i18n = await createServerI18n(getRequestLanguage(request));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);
  request.signal.addEventListener('abort', () => controller.abort());

  let shellRendered = false;
  const body = await renderToReadableStream(
    <I18nextProvider i18n={i18n}>
      <ServerRouter context={routerContext} url={request.url} />
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
  clearTimeout(timeout);

  const userAgent = request.headers.get('user-agent');
  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

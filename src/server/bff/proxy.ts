import { publicEnv, resolvePublicEnv } from '../../../server/publicEnv.js';
import { logRequest } from '../../../server/logging.js';
import { getRequestOrigin } from '../../utils/requestMeta';
import { normalizeBffPayload } from './media';
import { getFrontendTransportRoute } from './routes';
import {
  RequestValidationError,
  assertJsonContentType,
  readJsonBody,
} from './validation';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const NO_BODY_STATUSES = new Set([101, 204, 205, 304]);

const jsonResponse = (status: number, body: unknown, headers = {}) =>
  new Response(NO_BODY_STATUSES.has(status) ? null : JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });

/** Backend base URL for server-side requests (read lazily: Workers env). */
function getBackendBaseUrl(requestOrigin: string): string {
  return (
    process.env.SSR_API_URL ||
    resolvePublicEnv({
      ...publicEnv,
      SITE_DOMAIN: new URL(requestOrigin).host,
    }).API_URL
  );
}

/**
 * Headers for the internal Django request: public host, language, request id
 * and the resolved visitor IP (so backend throttling sees the visitor, not us).
 */
function getBackendHeaders(
  request: Request,
  requestOrigin: string,
  requestId: string
): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  const cookieLang = request.headers
    .get('cookie')
    ?.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('i18next='))
    ?.substring('i18next='.length);
  const forwardedLang = cookieLang || request.headers.get('accept-language');
  if (forwardedLang && forwardedLang.trim()) {
    headers['Accept-Language'] = forwardedLang;
  }

  const publicSiteUrl = new URL(requestOrigin);
  headers.Host = publicSiteUrl.host;
  headers['X-Forwarded-Host'] = publicSiteUrl.host;
  headers['X-Forwarded-Proto'] = publicSiteUrl.protocol.replace(':', '');

  if (requestId) {
    headers['X-Request-ID'] = requestId;
  }

  const clientIp =
    request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip');
  if (clientIp) {
    headers['X-Real-IP'] = clientIp;
    headers['X-Forwarded-For'] = clientIp;
  }

  return headers;
}

async function readUpstreamPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

/**
 * Frontend-owned transport (BFF): maps `/app/*` browser calls to the Django API.
 * Fetch API port of server/backendProxy.js.
 */
export async function handleBffRequest(
  request: Request,
  requestId: string
): Promise<Response> {
  const start = Date.now();
  const requestUrl = new URL(request.url);
  const route = getFrontendTransportRoute(requestUrl.pathname, request.method);

  if (!route) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  if (route.methodNotAllowed) {
    return jsonResponse(
      405,
      { message: 'Method not allowed.' },
      { Allow: route.allow }
    );
  }

  const requestOrigin = getRequestOrigin(request);
  const upstreamBaseUrl = getBackendBaseUrl(requestOrigin);
  const upstreamUrl = new URL(route.backendPath, upstreamBaseUrl);
  const logFields = {
    kind: route.kind === 'image-file' ? 'bff-image' : 'bff',
    method: request.method,
    path: requestUrl.pathname,
    query: requestUrl.search || '',
  };
  const headers = getBackendHeaders(request, requestOrigin, requestId);

  try {
    if (route.kind === 'image-file') {
      const allowedParams = new URLSearchParams();
      for (const key of ['s', 'e']) {
        const value = requestUrl.searchParams.get(key);
        if (value) allowedParams.set(key, value);
      }
      upstreamUrl.search = allowedParams.toString();

      const startedAt = Date.now();
      const response = await fetch(upstreamUrl, {
        headers,
        redirect: 'manual',
      });
      const upstreamDuration = Date.now() - startedAt;
      const body = await response.arrayBuffer();
      const responseHeaders: Record<string, string> = {
        'Cache-Control':
          response.headers.get('cache-control') ||
          'private, no-cache, no-store, must-revalidate',
        'Content-Type':
          response.headers.get('content-type') || 'application/octet-stream',
      };
      for (const name of ['content-disposition', 'location']) {
        const value = response.headers.get(name);
        if (value) responseHeaders[name] = value;
      }
      logRequest(
        {
          ...logFields,
          status: response.status,
          duration_ms: Date.now() - start,
          upstream_duration_ms: upstreamDuration,
          upstream_path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
          upstream_base_url: upstreamBaseUrl,
        },
        requestId
      );
      return new Response(NO_BODY_STATUSES.has(response.status) ? null : body, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    let init: RequestInit = { headers };
    if (request.method === 'POST') {
      assertJsonContentType(request);
      const body = await readJsonBody(request);
      init = {
        method: request.method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null,
      };
    } else if (requestUrl.search) {
      upstreamUrl.search = requestUrl.search;
    }

    const startedAt = Date.now();
    const response = await fetch(upstreamUrl, init);
    const upstreamDuration = Date.now() - startedAt;
    const payload = normalizeBffPayload(
      await readUpstreamPayload(response),
      route.kind
    );

    logRequest(
      {
        ...logFields,
        status: response.status,
        duration_ms: Date.now() - start,
        upstream_duration_ms: upstreamDuration,
        upstream_path: `${upstreamUrl.pathname}${upstreamUrl.search}`,
        upstream_base_url: upstreamBaseUrl,
      },
      requestId
    );
    return jsonResponse(response.status, payload, {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      logRequest(
        {
          ...logFields,
          status: error.statusCode,
          duration_ms: Date.now() - start,
          error: error.message,
        },
        requestId
      );
      return jsonResponse(error.statusCode, { message: error.message });
    }
    logRequest(
      {
        ...logFields,
        status: 500,
        duration_ms: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      },
      requestId
    );
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

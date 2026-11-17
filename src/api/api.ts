/**
 * Fetch-based API client for SSR (loaders) and the default shared client.
 *
 * This module owns the low-level HTTP transport concerns for backend calls:
 * - API base URL selection and the 8 s timeout
 * - language query propagation
 * - SSR request logging
 * - backend error normalization (shared `errorFromStatus`)
 * - SSR forwarding headers such as X-Forwarded-Host and X-Request-ID
 * - redirects are never followed on the server (3xx is an error)
 *
 * Browser data calls go through the BFF (`bff.ts`); higher-level route
 * ownership lives in `services.ts`.
 */
import { API_BASE_URL } from './routes';
import { publicEnv } from '../utils/publicEnv';
import { AppError, NetworkError, errorFromStatus } from './errors';

const REQUEST_TIMEOUT_MS = 8000;

type ApiParams = Record<string, boolean | number | string | undefined>;

/** Minimal axios-shaped client: `{ data }` responses keep callers/mocks simple. */
export type ApiClient = {
  get<T>(url: string, config?: { params?: ApiParams }): Promise<{ data: T }>;
  post<T>(url: string, body?: unknown): Promise<{ data: T }>;
};

/** Emit structured SSR -> backend transport logs for request tracing. */
function logSsrBackendRequest(info: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: 'frontend-ssr',
      kind: 'ssr-backend',
      ...info,
    })
  );
}

// Language getter — safe to call in both the browser and the Node SSR runtime.
// On the client: lazily reads the language from the i18n singleton after it has
// been initialised. On the server: i18n is not initialised here, so it falls
// back to 'en' (server-side language is handled per-request in Phase 3+).
let _getLanguage: (() => string) | null = null;

/** Register the language getter used to set the `lang` query parameter. */
export function setLanguageGetter(getter: () => string): void {
  _getLanguage = getter;
}

/** Read the current language without depending directly on i18n at import time. */
function getCurrentLanguage(): string {
  return _getLanguage?.() ?? 'en';
}

/**
 * Create a configured API client for either browser or SSR usage.
 *
 * On the server this also forwards the public site host and request ID to the
 * backend so generated URLs and request tracing stay aligned with the incoming
 * request, plus `originHeaders` (visitor IP, Cloudflare Access token).
 */
export function createApiClient(
  getLanguage: () => string,
  requestOrigin?: string,
  requestId?: string,
  originHeaders: Record<string, string> = {}
): ApiClient {
  const isServer = typeof window === 'undefined';
  const defaultHeaders: Record<string, string> = {};

  if (isServer) {
    try {
      const publicSiteUrl = requestOrigin
        ? new URL(requestOrigin)
        : new URL(`https://${publicEnv.SITE_DOMAIN}`);

      defaultHeaders['X-Forwarded-Host'] = publicSiteUrl.host;
      defaultHeaders['X-Forwarded-Proto'] = publicSiteUrl.protocol.replace(
        ':',
        ''
      );
      if (requestId) {
        defaultHeaders['X-Request-ID'] = requestId;
      }
      Object.assign(defaultHeaders, originHeaders);
    } catch {
      // Ignore malformed public API URLs and fall back to transport defaults.
    }
  }

  async function request<T>(
    method: 'GET' | 'POST',
    path: string,
    params?: ApiParams,
    body?: unknown
  ): Promise<{ data: T }> {
    const startedAt = Date.now();
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) search.set(key, String(value));
    }
    search.set('lang', getLanguage().split('-')[0]);
    const baseUrl = API_BASE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/${path.replace(/^\/+/, '')}?${search.toString()}`;

    const log = (status: number, error?: string) => {
      if (!isServer) return;
      logSsrBackendRequest({
        method,
        url: path,
        base_url: API_BASE_URL,
        status,
        duration_ms: Date.now() - startedAt,
        request_id: defaultHeaders['X-Request-ID'],
        ...(error ? { error } : {}),
      });
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...defaultHeaders,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        // SSR: a redirect from the backend is a misconfiguration, not a hop to follow.
        ...(isServer ? { redirect: 'manual' as const } : {}),
      });
    } catch (error) {
      clearTimeout(timeoutId);
      log(0, error instanceof Error ? error.name : 'unknown');
      throw new NetworkError(undefined, error);
    }

    try {
      const isRedirect =
        response.type === 'opaqueredirect' ||
        (response.status >= 300 && response.status < 400);
      if (isRedirect) {
        log(response.status, 'redirect');
        throw new AppError(
          'Unexpected redirect from the API.',
          response.status || 302
        );
      }

      // Body reads share the timeout: clearTimeout only after parsing.
      const payload = await response.json().catch(() => null);
      if (controller.signal.aborted) {
        log(response.status, 'timeout');
        throw new NetworkError();
      }
      log(response.status);

      if (!response.ok) {
        throw errorFromStatus(response.status, payload);
      }
      return { data: payload as T };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    get: (path, config) => request('GET', path, config?.params),
    post: (path, body) => request('POST', path, undefined, body),
  };
}

/** Default shared client used by browser code and most SSR service calls. */
export const api: ApiClient = createApiClient(getCurrentLanguage);

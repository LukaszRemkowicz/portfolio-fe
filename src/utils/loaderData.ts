import { QueryClient } from '@tanstack/react-query';
import { createApiClient } from '../api/api';
import { createServerI18n } from '../i18n.server';
import { logWarning, toErrorPayload } from '../server/logging';
import { getOriginHeaders } from '../server/originHeaders';
import { getRequestLanguage, getRequestOrigin } from './requestMeta';

/** Request-scoped QueryClient for route loaders (discarded after dehydration). */
export function createLoaderQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Discarded after this request; the browser hydrates into its own client.
        staleTime: Infinity,
      },
    },
  });
}

/** Language, public origin, backend API client and `t` for a loader request. */
export async function createLoaderRequestContext(
  request: Request,
  requestId: string
) {
  const language = getRequestLanguage(request);
  const requestOrigin = getRequestOrigin(request);
  const i18n = await createServerI18n(language);

  return {
    language,
    requestOrigin,
    t: i18n.t.bind(i18n),
    client: createApiClient(
      () => language,
      requestOrigin,
      requestId,
      getOriginHeaders(request)
    ),
  };
}

export async function prefetchQuerySafely(
  queryClient: QueryClient,
  options: Parameters<QueryClient['prefetchQuery']>[0]
) {
  try {
    await queryClient.prefetchQuery(options);
  } catch (error) {
    logWarning({
      event: 'prefetch_failed',
      query_key: options.queryKey,
      ...toErrorPayload(error),
    });
  }
}

export async function prefetchInfiniteQuerySafely(
  queryClient: QueryClient,
  options: Parameters<QueryClient['prefetchInfiniteQuery']>[0]
) {
  try {
    await queryClient.prefetchInfiniteQuery(options);
  } catch (error) {
    logWarning({
      event: 'prefetch_infinite_failed',
      query_key: options.queryKey,
      ...toErrorPayload(error),
    });
  }
}

/**
 * Fetch a query that may legitimately be missing. Returns the data, or
 * `notFound: true` on a backend 404 (other failures are logged and swallowed).
 */
export async function fetchQueryOrNotFound<T>(
  queryClient: QueryClient,
  options: Parameters<QueryClient['fetchQuery']>[0],
  isNotFound: (error: unknown) => boolean
): Promise<{ data: T | null; notFound: boolean }> {
  try {
    return {
      data: (await queryClient.fetchQuery(options)) as T,
      notFound: false,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return { data: null, notFound: true };
    }
    logWarning({
      event: 'prefetch_failed',
      query_key: options.queryKey,
      ...toErrorPayload(error),
    });
    return { data: null, notFound: false };
  }
}

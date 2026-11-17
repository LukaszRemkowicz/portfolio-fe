import { QueryClient } from '@tanstack/react-query';
import { AppError } from '../api/errors';

/** Retry transient failures only; 4xx (incl. NotFoundError) will not change on retry. */
export const shouldRetryQuery = (count: number, error: unknown): boolean => {
  const status = error instanceof AppError ? error.statusCode : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return count < 2;
};

/** Browser QueryClient used by the root route. */
export const createAppQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
        // Avoid an immediate refetch of data just hydrated from SSR.
        staleTime: 60_000,
      },
    },
  });

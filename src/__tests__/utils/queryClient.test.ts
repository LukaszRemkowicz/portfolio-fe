import { AppError, NotFoundError } from '../../api/errors';
import {
  createAppQueryClient,
  shouldRetryQuery,
} from '../../utils/queryClient';

describe('query client defaults', () => {
  it('has a 60s default staleTime', () => {
    expect(createAppQueryClient().getDefaultOptions().queries?.staleTime).toBe(
      60_000
    );
  });

  it('does not retry 4xx, retries transient errors up to twice', () => {
    expect(shouldRetryQuery(0, new NotFoundError())).toBe(false);
    expect(shouldRetryQuery(0, new AppError('x', 429))).toBe(false);
    expect(shouldRetryQuery(0, new AppError('x', 503))).toBe(true);
    expect(shouldRetryQuery(0, new TypeError('network'))).toBe(true);
    expect(shouldRetryQuery(2, new AppError('x', 503))).toBe(false);
  });
});

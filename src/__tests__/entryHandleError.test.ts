import { handleError } from '../entry.server';

const args = (aborted = false) => {
  const controller = new AbortController();
  if (aborted) controller.abort();
  return {
    request: { signal: controller.signal },
  } as Parameters<typeof handleError>[1];
};

const routeError = (status: number) => ({
  status,
  statusText: 'x',
  internal: true,
  data: 'x',
});

describe('entry.server handleError', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => spy.mockRestore());

  it('ignores 4xx route error responses (bot POST -> 405)', () => {
    handleError(routeError(405), args());
    expect(spy).not.toHaveBeenCalled();
  });

  it('logs 5xx route error responses', () => {
    handleError(routeError(502), args());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('logs real errors and skips aborted requests', () => {
    handleError(new Error('boom'), args());
    expect(spy).toHaveBeenCalledTimes(1);
    handleError(new Error('late'), args(true));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

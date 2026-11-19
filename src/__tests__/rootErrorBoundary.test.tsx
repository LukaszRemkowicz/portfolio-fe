import { render } from '@testing-library/react';
import type { Route } from '../+types/root';
import { ErrorBoundary } from '../root';

const renderBoundary = (error: unknown) =>
  render(<ErrorBoundary {...({ error } as Route.ErrorBoundaryProps)} />);

describe('root ErrorBoundary logging', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => spy.mockRestore());

  it('does not log a 4xx route error response (bot POST -> 405)', () => {
    renderBoundary({
      status: 405,
      statusText: 'Method Not Allowed',
      internal: true,
      data: 'x',
    });
    expect(spy).not.toHaveBeenCalledWith('Uncaught error:', expect.anything());
  });

  it('still logs a 5xx route error response', () => {
    renderBoundary({
      status: 503,
      statusText: 'Unavailable',
      internal: false,
      data: 'x',
    });
    expect(spy).toHaveBeenCalledWith('Uncaught error:', expect.anything());
  });

  it('still logs real errors', () => {
    renderBoundary(new Error('boom'));
    expect(spy).toHaveBeenCalledWith('Uncaught error:', expect.any(Error));
  });
});

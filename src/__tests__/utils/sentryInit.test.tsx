import { render } from '@testing-library/react';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { captureError, setSentry } from '../../utils/sentry';

const mockInit = jest.fn();
const mockCapture = jest.fn();
jest.mock('@sentry/react', () => ({
  init: (...a: unknown[]) => mockInit(...a),
  captureException: (...a: unknown[]) => mockCapture(...a),
  browserTracingIntegration: () => ({ name: 'tracing' }),
}));
jest.mock('../../utils/env', () => ({
  getEnv: (k: string, d = '') =>
    ({
      SENTRY_DSN_FE: 'https://k@o.ingest.sentry.io/1',
      ENVIRONMENT: 'production',
    })[k] ?? d,
}));

describe('sentry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSentry(null);
  });

  it('keeps default integrations (no defaultIntegrations: false) and inits on idle', async () => {
    const { initClientServices } =
      await import('../../utils/initClientServices');
    jest.useFakeTimers();
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      value: 'complete',
    });
    initClientServices();
    jest.advanceTimersByTime(3500);
    jest.useRealTimers();
    await new Promise(r => setTimeout(r, 0));
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockInit.mock.calls[0][0]).not.toHaveProperty('defaultIntegrations');
    expect(mockInit.mock.calls[0][0].tracesSampleRate).toBe(0.1);
    captureError(new Error('x'));
    expect(mockCapture).toHaveBeenCalled();
  });

  it('captureError is a no-op before init', () => {
    captureError(new Error('x'));
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('error boundary reports caught render errors', () => {
    setSentry(
      jest.requireMock('@sentry/react') as Parameters<typeof setSentry>[0]
    );
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const Boom = () => {
      throw new Error('boom');
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(mockCapture).toHaveBeenCalledWith(expect.any(Error));
  });
});

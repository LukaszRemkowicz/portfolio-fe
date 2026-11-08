import { initPwaRuntime } from '../utils/pwaRuntime';

type Listener = () => void;

function mockServiceWorker(controller: object | null) {
  const listeners: Record<string, Listener[]> = {};
  const registration = {
    waiting: null,
    addEventListener: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
  };
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller,
      addEventListener: (type: string, fn: Listener) => {
        (listeners[type] ||= []).push(fn);
      },
      getRegistration: jest.fn().mockResolvedValue(registration),
      register: jest.fn().mockResolvedValue(registration),
    },
  });
  return () => listeners.controllerchange?.forEach(fn => fn());
}

// triggerReloadOnce records the URL in sessionStorage right before reload().
const reloadRequested = () =>
  sessionStorage.getItem('portfolio:sw-update-reload') !== null;

describe('initPwaRuntime controllerchange reload', () => {
  beforeEach(() => {
    sessionStorage.clear();
    // jsdom does not implement navigation; silence its reload notice.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('does not reload when the first service worker claims the page', async () => {
    const fireControllerChange = mockServiceWorker(null);
    initPwaRuntime('production');
    await Promise.resolve();
    fireControllerChange();
    expect(reloadRequested()).toBe(false);
  });

  it('reloads when an updated service worker takes over', async () => {
    const fireControllerChange = mockServiceWorker({});
    initPwaRuntime('production');
    await Promise.resolve();
    fireControllerChange();
    expect(reloadRequested()).toBe(true);
  });
});

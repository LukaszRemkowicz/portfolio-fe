import { getEnv } from './env';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataLayer: any[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_TRACKING_ID = getEnv('GA_TRACKING_ID');
const ENABLE_GA_VAL = getEnv('ENABLE_GA', 'false');
const ENABLE_GA = ENABLE_GA_VAL.toLowerCase() === 'true';
const ENVIRONMENT = getEnv('ENVIRONMENT', getEnv('NODE_ENV', 'development'));
const IS_DEV = ['development', 'dev'].includes(ENVIRONMENT);

if (IS_DEV) {
  console.log('📊 Google Analytics Status:', {
    ENABLED: ENABLE_GA,
    RAW_VALUE: ENABLE_GA_VAL,
    TRACKING_ID: GA_TRACKING_ID,
  });
}

/**
 * Simplified Google Analytics loader.
 * Uses a standard stub to capture events before the library loads.
 */
export const loadGoogleAnalytics = () => {
  if (!ENABLE_GA || typeof window === 'undefined') {
    return;
  }

  if (document.querySelector(`script[src*="gtag/js?id=${GA_TRACKING_ID}"]`)) {
    return;
  }

  // 1. Stub (Standard Google pattern)
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  // Queue js/config before the script loads (standard snippet order) so the
  // explicit page_view events from trackPageView always follow the config.
  if (GA_TRACKING_ID) {
    window.gtag('js', new Date());
    // SPA: page views are sent explicitly via trackPageView, not on config.
    window.gtag('config', GA_TRACKING_ID, { send_page_view: false });
  }

  // 2. Load script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;

  document.head.appendChild(script);
};

/**
 * Manually tracks a page view (Simplified for verification).
 */
export const trackPageView = (path: string) => {
  if (typeof window === 'undefined' || !hasAnalyticsConsent()) return;
  // Pass-through if gtag exists, otherwise it hits the stub
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
    });
  }
};

export const hasAnalyticsConsent = (): boolean => {
  if (
    typeof localStorage === 'undefined' ||
    typeof localStorage.getItem !== 'function'
  ) {
    return false;
  }
  return localStorage.getItem('cookieConsent') === 'true';
};

/** Cookie domains to try: current host and its registrable parent (best-effort: last two labels). */
const cookieDomains = (hostname: string): string[] => {
  const parts = hostname.split('.');
  return parts.length > 2
    ? [hostname, `.${parts.slice(-2).join('.')}`]
    : [hostname, `.${hostname}`];
};

/** Withdraw analytics consent: deny gtag storage and expire GA cookies. */
export const revokeAnalyticsConsent = () => {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: 'denied' });
  }
  const names = document.cookie
    .split(';')
    .map(c => c.split('=')[0].trim())
    .filter(n => n === '_ga' || n === '_gid' || n.startsWith('_ga_'));
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  for (const name of names) {
    document.cookie = `${name}=; ${expired}`;
    for (const domain of cookieDomains(window.location.hostname)) {
      document.cookie = `${name}=; ${expired}; domain=${domain}`;
    }
  }
};

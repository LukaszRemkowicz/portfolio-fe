export interface CspOptions {
  nonce: string;
  gaEnabled: boolean;
  sentryDsn?: string;
}

export interface SentryReporting {
  origin: string;
  reportUrl: string;
}

/** Parse https://<key>@<host>/<projectId>; null when empty/invalid. Never throws. */
export function parseSentryDsn(dsn?: string): SentryReporting | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.split('/').filter(Boolean).pop();
    if (u.protocol !== 'https:' || !u.username || !projectId) return null;
    return {
      origin: u.origin,
      reportUrl: `${u.origin}/api/${projectId}/security/?sentry_key=${u.username}`,
    };
  } catch {
    return null;
  }
}

/** GA is on when ENABLE_GA=true and a tracking id exists (mirrors utils/analytics.ts). */
export function isGaEnabled(env: Record<string, string | undefined>): boolean {
  return (env.ENABLE_GA || '').toLowerCase() === 'true' && !!env.GA_TRACKING_ID;
}

export function buildCsp({ nonce, gaEnabled, sentryDsn }: CspOptions): {
  policy: string;
  reportingEndpoints: string | null;
} {
  const sentry = parseSentryDsn(sentryDsn);
  const media = 'https://media.lukaszremkowicz.com';
  const r2 =
    'https://8e28090942604cdb0c3620bd22f54145.r2.cloudflarestorage.com';
  // Emoji pasted from Facebook into descriptions are <img> tags on this host.
  const fbEmoji = 'https://static.xx.fbcdn.net';
  const directives = [
    `default-src 'none'`,
    `script-src 'self' 'nonce-${nonce}'${gaEnabled ? ' https://www.googletagmanager.com' : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: ${media} ${r2} ${fbEmoji}${gaEnabled ? ' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com' : ''}`,
    `font-src 'self'`,
    `connect-src 'self'${sentry ? ` ${sentry.origin}` : ''}${gaEnabled ? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com' : ''}`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    `frame-src 'none'`,
    `media-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  if (sentry) {
    directives.push(`report-uri ${sentry.reportUrl}`, `report-to csp-endpoint`);
  }
  return {
    policy: directives.join('; '),
    reportingEndpoints: sentry ? `csp-endpoint="${sentry.reportUrl}"` : null,
  };
}

export function generateNonce(): string {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))
  );
}

/** Set the CSP (Report-Only unless CSP_MODE=enforce) and Reporting-Endpoints on headers. */
export function applyCsp(
  headers: Headers,
  nonce: string,
  env: Record<string, string | undefined>
) {
  const { policy, reportingEndpoints } = buildCsp({
    nonce,
    gaEnabled: isGaEnabled(env),
    sentryDsn: env.SENTRY_DSN_FE,
  });
  headers.set(
    env.CSP_MODE === 'enforce'
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only',
    policy
  );
  if (reportingEndpoints)
    headers.set('Reporting-Endpoints', reportingEndpoints);
}

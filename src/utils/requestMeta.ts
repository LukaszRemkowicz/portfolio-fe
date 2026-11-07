import { detectLanguage } from '../shared/i18n/detectLanguage';
import type { SupportedLanguage } from '../shared/i18n/detectLanguage';

/** First value of a (possibly comma-separated) forwarded header. */
function firstValue(value: string | null): string {
  return value?.split(',')[0]?.trim() || '';
}

/**
 * Public request origin: X-Forwarded-Proto/Host first, then Host.
 * Port of server/requestMeta.js (protocol falls back to the request URL's, which on
 * Workers is the real public scheme, instead of a hardcoded http).
 */
export function getRequestOrigin(request: Request): string {
  const url = new URL(request.url);
  const proto =
    firstValue(request.headers.get('x-forwarded-proto')) ||
    url.protocol.replace(':', '');
  const host =
    firstValue(request.headers.get('x-forwarded-host')) ||
    firstValue(request.headers.get('host')) ||
    url.host ||
    'localhost';

  return `${proto}://${host}`;
}

/** Cookie `i18next` first, then Accept-Language, default en (server/index.mjs). */
export function getRequestLanguage(request: Request): SupportedLanguage {
  const cookieLang = request.headers
    .get('cookie')
    ?.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('i18next='))
    ?.substring('i18next='.length);

  return detectLanguage(
    cookieLang || request.headers.get('accept-language') || 'en'
  );
}

import { detectLanguage } from '../shared/i18n/detectLanguage';
import type { SupportedLanguage } from '../shared/i18n/detectLanguage';

/**
 * Public request origin: `https://${SITE_DOMAIN}` when set (read per call),
 * else the request URL's origin (local dev/tests). Never derived from
 * X-Forwarded-* or Host: on Workers those are client-controlled and feed
 * canonical URLs and the Host sent to Django (cache-poisoning risk).
 */
export function getRequestOrigin(request: Request): string {
  const domain = process.env.SITE_DOMAIN;
  return domain ? `https://${domain}` : new URL(request.url).origin;
}

/** Cookie `i18next` first, then Accept-Language, default en. */
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

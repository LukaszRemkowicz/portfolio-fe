/**
 * Test deployments only (e.g. *.workers.dev): serve media from MEDIA_ORIGIN.
 * `/media/*` are public files; `/app/image-files/*` are full-size images that
 * Django hands to nginx (X-Accel), so they only work when served by the
 * origin. In production Cloudflare routes send both straight to the VPS, so
 * MEDIA_ORIGIN stays unset there.
 */
const PASSTHROUGH_PREFIXES = ['/media/', '/app/image-files/'];

export function getMediaPassthroughUrl(
  requestUrl: string,
  mediaOrigin: string | undefined
): string | null {
  if (!mediaOrigin) return null;
  const { pathname, search } = new URL(requestUrl);
  if (!PASSTHROUGH_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return null;
  }
  return new URL(pathname + search, mediaOrigin).toString();
}

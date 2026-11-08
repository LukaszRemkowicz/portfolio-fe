/**
 * Test deployments only (e.g. *.workers.dev): serve `/media/*` from
 * MEDIA_ORIGIN. In production Cloudflare routes send `/media/*` straight to
 * the VPS, so MEDIA_ORIGIN stays unset there.
 */
export function getMediaPassthroughUrl(
  requestUrl: string,
  mediaOrigin: string | undefined
): string | null {
  if (!mediaOrigin) return null;
  const { pathname, search } = new URL(requestUrl);
  if (!pathname.startsWith('/media/')) return null;
  return new URL(pathname + search, mediaOrigin).toString();
}

/**
 * Test deployments only (e.g. *.workers.dev): serve `/media/*` from
 * MEDIA_ORIGIN. Unset in production, where `/media/*` is served from the
 * media host. Locally it points at Django's /media.
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

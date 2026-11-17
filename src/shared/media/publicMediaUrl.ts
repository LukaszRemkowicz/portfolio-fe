/**
 * Single source of truth for rewriting backend media URLs onto frontend-public
 * paths. Shared by the browser/SSR normalisers (`api/media.ts`) and the BFF
 * (`server/bff/media.ts`).
 */
const SECURE_SERVE_PATH = /^\/v1\/images\/[^/]+\/serve\/?(?:\?.*)?$/;

const toFrontendImageFilePath = (path: string): string => {
  if (path.startsWith('/image-files/')) return `/app${path}`;
  if (SECURE_SERVE_PATH.test(path)) {
    return path.replace(/^\/v1\/images\//, '/app/image-files/');
  }
  return path;
};

const isPublicPath = (path: string): boolean =>
  path.startsWith('/media/') ||
  path.startsWith('/static/') ||
  path.startsWith('/app/image-files/') ||
  path.startsWith('/image-files/') ||
  SECURE_SERVE_PATH.test(path);

/**
 * Returns the same-origin public path for a relative or absolute public media
 * URL, or `undefined` when `value` is not public media (caller decides).
 */
export const toPublicMediaPath = (value: string): string | undefined => {
  if (isPublicPath(value)) return toFrontendImageFilePath(value);

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      if (isPublicPath(url.pathname)) {
        return toFrontendImageFilePath(`${url.pathname}${url.search}`);
      }
    } catch {
      // malformed absolute URL: treated as not public media
    }
  }

  return undefined;
};
